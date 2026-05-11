const db = require('../db/db');

// CREATE room
exports.createRoom = (req, res) => {
  const { homeId } = req.params;
  const { name, width, height, pos_x, pos_y } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Room name is required' });
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
exports.getRoomsByHome = (req, res) => {
  const { homeId } = req.params;

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
exports.getRoomsWithZones = (req, res) => {
  const { homeId } = req.params;

  db.all(
    `
    SELECT
      rooms.id AS room_id,
      rooms.name AS room_name,
      rooms.width AS room_width,
      rooms.height AS room_height,

      zones.id AS zone_id,
      zones.name AS zone_name,
      zones.type AS zone_type,
      zones.width AS zone_width,
      zones.height AS zone_height,
      zones.pos_x,
      zones.pos_y

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