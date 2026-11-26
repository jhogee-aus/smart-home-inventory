const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DB_PATH || './database.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error(err.message);
  console.log('Connected to SQLite database at', dbPath);
});

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS homes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    )
  `);

  // drop the leftover "user_id" column from the old multi-user schema - it's
  // always NULL and nothing reads or writes it, so a plain DROP COLUMN is safe
  // (no data to preserve or migrate).
  db.all(`PRAGMA table_info(homes)`, (err, columns) => {
    if (err) return console.error(err.message);

    const hasUserId = columns.some((c) => c.name === 'user_id');

    if (hasUserId) {
      db.run(`ALTER TABLE homes DROP COLUMN user_id`);
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_id INTEGER,
      name TEXT,
      width REAL,
      height REAL,
      pos_x REAL,
      pos_y REAL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER,
      name TEXT,
      type TEXT,
      width REAL,
      height REAL,
      pos_x REAL,
      pos_y REAL,
      attributes TEXT DEFAULT '{}'
    )
  `);

  // migrate zones created before the "attributes" column existed
  db.all(`PRAGMA table_info(zones)`, (err, columns) => {
    if (err) return console.error(err.message);

    const hasAttributes = columns.some((c) => c.name === 'attributes');

    if (!hasAttributes) {
      db.run(`ALTER TABLE zones ADD COLUMN attributes TEXT DEFAULT '{}'`);
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS move_boxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'packing',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      zone_id INTEGER,
      box_id INTEGER,

      name TEXT NOT NULL,
      description TEXT,

      quantity INTEGER DEFAULT 1,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY(zone_id) REFERENCES zones(id),
      FOREIGN KEY(box_id) REFERENCES move_boxes(id)
    )
  `);

  // migrate items created before "box_id" existed (back when zone_id was NOT NULL) -
  // rebuild the table since SQLite can't relax a NOT NULL constraint in place.
  db.all(`PRAGMA table_info(items)`, (err, columns) => {
    if (err) return console.error(err.message);

    const hasBoxId = columns.some((c) => c.name === 'box_id');

    if (!hasBoxId) {
      db.serialize(() => {
        db.run(`ALTER TABLE items RENAME TO items_old`);

        db.run(`
          CREATE TABLE items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            zone_id INTEGER,
            box_id INTEGER,
            name TEXT NOT NULL,
            description TEXT,
            quantity INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(zone_id) REFERENCES zones(id),
            FOREIGN KEY(box_id) REFERENCES move_boxes(id)
          )
        `);

        db.run(`
          INSERT INTO items (id, zone_id, box_id, name, description, quantity, created_at)
          SELECT id, zone_id, NULL, name, description, quantity, created_at FROM items_old
        `);

        db.run(`DROP TABLE items_old`);
      });
    }
  });

  // One-time migration: zone creation has always placed a new zone at a
  // fixed default position with no collision check (see zonesController -
  // createZone), and room creation had no such check at all before the
  // canvas-navigation feature added one. Either gap can leave two zones in
  // the same room, or two rooms in the same home, stacked exactly on top
  // of each other from an older version of the app. This detects that and
  // nudges the later-created one clear - it only ever repositions existing
  // rows, never deletes anything. Gated on PRAGMA user_version so it runs
  // only once per database, the first time it's opened by a version of the
  // app that has this migration, not on every launch.
  const OVERLAP_REPAIR_SCHEMA_VERSION = 1;

  db.get(`PRAGMA user_version`, (err, row) => {
    if (err) return console.error(err.message);

    const currentVersion = row ? row.user_version : 0;

    if (currentVersion >= OVERLAP_REPAIR_SCHEMA_VERSION) {
      console.log(
        `[migration] zone/room overlap repair already applied (schema version ${currentVersion}) - skipping.`
      );
      return;
    }

    console.log(
      `[migration] running one-time zone/room overlap repair (schema version ${currentVersion} -> ${OVERLAP_REPAIR_SCHEMA_VERSION})...`
    );

    repairOverlaps((zonesFixed, roomsFixed) => {
      console.log(
        `[migration] overlap repair complete - repositioned ${zonesFixed} zone(s) and ${roomsFixed} room(s).`
      );
      db.run(`PRAGMA user_version = ${OVERLAP_REPAIR_SCHEMA_VERSION}`);
    });
  });
});

// Given a list of {id, pos_x, pos_y, w, h} ordered by creation (ascending
// id), nudge any item that overlaps an earlier one until clear. Returns
// just the ones that actually moved, as {id, pos_x, pos_y}.
function resolveOverlaps(items) {
  const placed = [];
  const changed = [];

  items.forEach((item) => {
    let pos_x = item.pos_x ?? 0;
    let pos_y = item.pos_y ?? 0;
    const w = item.w ?? 0;
    const h = item.h ?? 0;

    if (w > 0 && h > 0) {
      const originalX = pos_x;
      const originalY = pos_y;
      let attempts = 0;
      const overlapsAny = () =>
        placed.some(
          (p) =>
            pos_x < p.pos_x + p.w &&
            pos_x + w > p.pos_x &&
            pos_y < p.pos_y + p.h &&
            pos_y + h > p.pos_y
        );

      while (overlapsAny() && attempts < 50) {
        pos_x += 20;
        pos_y += 20;
        attempts++;
      }

      if (pos_x !== originalX || pos_y !== originalY) {
        changed.push({ id: item.id, pos_x, pos_y });
      }
    }

    placed.push({ pos_x, pos_y, w, h });
  });

  return changed;
}

// `done(fixedCount)` fires once every room's zones have been checked.
function repairOverlappingZones(done) {
  db.all(`SELECT id FROM rooms`, (err, rooms) => {
    if (err) { console.error(err.message); return done(0); }
    if (rooms.length === 0) return done(0);

    let fixedCount = 0;
    let remainingRooms = rooms.length;
    const finishRoom = () => { if (--remainingRooms === 0) done(fixedCount); };

    rooms.forEach((room) => {
      db.all(
        `SELECT id, width, height, pos_x, pos_y FROM zones WHERE room_id = ? ORDER BY id ASC`,
        [room.id],
        (err, zones) => {
          if (err) { console.error(err.message); return finishRoom(); }

          const changed = resolveOverlaps(
            zones.map((z) => ({ id: z.id, pos_x: z.pos_x, pos_y: z.pos_y, w: z.width, h: z.height }))
          );

          if (changed.length === 0) return finishRoom();

          fixedCount += changed.length;
          let remainingUpdates = changed.length;
          changed.forEach((c) => {
            console.log(
              `[migration] zone ${c.id} in room ${room.id} overlapped an earlier zone - moved to (${c.pos_x}, ${c.pos_y})`
            );
            db.run(`UPDATE zones SET pos_x = ?, pos_y = ? WHERE id = ?`, [c.pos_x, c.pos_y, c.id], () => {
              if (--remainingUpdates === 0) finishRoom();
            });
          });
        }
      );
    });
  });
}

// `done(fixedCount)` fires once every home's rooms have been checked.
function repairOverlappingRooms(done) {
  db.all(`SELECT id FROM homes`, (err, homes) => {
    if (err) { console.error(err.message); return done(0); }
    if (homes.length === 0) return done(0);

    let fixedCount = 0;
    let remainingHomes = homes.length;
    const finishHome = () => { if (--remainingHomes === 0) done(fixedCount); };

    homes.forEach((home) => {
      db.all(
        `SELECT id, width, height, pos_x, pos_y FROM rooms WHERE home_id = ? ORDER BY id ASC`,
        [home.id],
        (err, rooms) => {
          if (err) { console.error(err.message); return finishHome(); }

          // Rooms render at half their stored width/height (pixelW =
          // width/2 in HouseCanvas) - divide here so this matches what's
          // actually drawn and clickable.
          const changed = resolveOverlaps(
            rooms.map((r) => ({
              id: r.id,
              pos_x: r.pos_x,
              pos_y: r.pos_y,
              w: (r.width ?? 0) / 2,
              h: (r.height ?? 0) / 2,
            }))
          );

          if (changed.length === 0) return finishHome();

          fixedCount += changed.length;
          let remainingUpdates = changed.length;
          changed.forEach((c) => {
            console.log(
              `[migration] room ${c.id} in home ${home.id} overlapped an earlier room - moved to (${c.pos_x}, ${c.pos_y})`
            );
            db.run(`UPDATE rooms SET pos_x = ?, pos_y = ? WHERE id = ?`, [c.pos_x, c.pos_y, c.id], () => {
              if (--remainingUpdates === 0) finishHome();
            });
          });
        }
      );
    });
  });
}

// `done(zonesFixedCount, roomsFixedCount)` fires once both passes finish.
function repairOverlaps(done) {
  let zonesFixed = 0;
  let roomsFixed = 0;
  let remaining = 2;
  const finish = () => { if (--remaining === 0) done(zonesFixed, roomsFixed); };

  repairOverlappingZones((count) => { zonesFixed = count; finish(); });
  repairOverlappingRooms((count) => { roomsFixed = count; finish(); });
}

module.exports = db;
