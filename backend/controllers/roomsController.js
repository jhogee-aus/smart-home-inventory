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