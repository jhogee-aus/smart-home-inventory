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
});

module.exports = db;
