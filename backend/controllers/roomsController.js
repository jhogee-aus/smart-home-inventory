const db = require('../db/db');

const homeExists = (homeId) =>
  new Promise((resolve, reject) => {
    db.get(`SELECT id FROM homes WHERE id = ?`, [homeId], (err, row) => {
      if (err) return reject(err);
      resolve(!!row);
    });
  });

const roomExists = (roomId) =>
  new Promise((resolve, reject) => {
    db.get(`SELECT id FROM rooms WHERE id = ?`, [roomId], (err, row) => {
      if (err) return reject(err);
      resolve(!!row);
    });
  });

// CREATE room
exports.createRoom = async (req, res) => {
  const { homeId } = req.params;
  const { name, width, height, pos_x, pos_y } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Room name is required' });
  }

  try {
    if (!(await homeExists(homeId))) {
      return res.status(404).json({ error: 'Home not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.run(
    `INSERT INTO rooms (home_id, name, width, height, pos_x, pos_y)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [homeId, name, width || 0, height || 0, pos_x || 0, pos_y || 0],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        home_id: homeId,
        name
      });
    }
  );
};

// GET rooms by home
exports.getRoomsByHome = async (req, res) => {
  const { homeId } = req.params;

  try {
    if (!(await homeExists(homeId))) {
      return res.status(404).json({ error: 'Home not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.all(
    `SELECT * FROM rooms WHERE home_id = ?`,
    [homeId],
    (err, rows) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json(rows);
    }
  );
};

// GET ROOMS WITH ZONES
exports.getRoomsWithZones = async (req, res) => {
  const { homeId } = req.params;

  try {
    if (!(await homeExists(homeId))) {
      return res.status(404).json({ error: 'Home not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.all(
    `
    SELECT
      rooms.id AS room_id,
      rooms.name AS room_name,
      rooms.width AS room_width,
      rooms.height AS room_height,
      rooms.pos_x AS room_pos_x,
      rooms.pos_y AS room_pos_y,

      zones.id AS zone_id,
      zones.name AS zone_name,
      zones.type AS zone_type,
      zones.width AS zone_width,
      zones.height AS zone_height,
      zones.pos_x,
      zones.pos_y,
      zones.attributes AS zone_attributes

    FROM rooms
    LEFT JOIN zones
      ON zones.room_id = rooms.id

    WHERE rooms.home_id = ?
    `,
    [homeId],
    (err, rows) => {
      if (err) {
        return res.status(400).json({
          error: err.message,
        });
      }

      res.json(rows);
    }
  );
};

// update room position while dragged on the house canvas
exports.updateRoomPosition = async (req, res) => {
  const { roomId } = req.params;
  const { pos_x, pos_y } = req.body;

  try {
    if (!(await roomExists(roomId))) {
      return res.status(404).json({ error: 'Room not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.run(
    `UPDATE rooms SET pos_x = ?, pos_y = ? WHERE id = ?`,
    [pos_x, pos_y, roomId],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json({ success: true });
    }
  );
};

// update room size while resized on the house canvas
exports.updateRoomSize = async (req, res) => {
  const { roomId } = req.params;
  const { width, height } = req.body;

  try {
    if (!(await roomExists(roomId))) {
      return res.status(404).json({ error: 'Room not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.run(
    `UPDATE rooms SET width = ?, height = ? WHERE id = ?`,
    [width, height, roomId],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json({ success: true });
    }
  );
};

// DELETE room (and all zones/items belonging to it)
exports.deleteRoom = async (req, res) => {
  const { roomId } = req.params;

  try {
    if (!(await roomExists(roomId))) {
      return res.status(404).json({ error: 'Room not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.run(
    `DELETE FROM items WHERE zone_id IN (
      SELECT id FROM zones WHERE room_id = ?
    )`,
    [roomId],
    (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      db.run(
        `DELETE FROM zones WHERE room_id = ?`,
        [roomId],
        (err) => {
          if (err) {
            return res.status(400).json({ error: err.message });
          }

          db.run(
            `DELETE FROM rooms WHERE id = ?`,
            [roomId],
            function (err) {
              if (err) {
                return res.status(400).json({ error: err.message });
              }

              res.json({ success: true });
            }
          );
        }
      );
    }
  );
};
