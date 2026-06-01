const db = require('../db/db');

// CREATE zone
exports.createZone = (req, res) => {
  const { roomId } = req.params;
  const { name, type, width, height, pos_x, pos_y } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Zone name is required' });
  }

  db.run(
    `INSERT INTO zones (room_id, name, type, width, height, pos_x, pos_y)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [roomId, name, type || 'box', width || 0, height || 0, pos_x || 0, pos_y || 0],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        room_id: roomId,
        name,
        type
      });
    }
  );
};

// GET zones by room
exports.getZonesByRoom = (req, res) => {
  const { roomId } = req.params;

  db.all(
    `SELECT * FROM zones WHERE room_id = ?`,
    [roomId],
    (err, rows) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json(rows);
    }
  );
};

//update position while dragged
exports.updateZonePosition = (req, res) => {
  const { zoneId } = req.params;

  const { pos_x, pos_y } = req.body;

  db.run(
    `
    UPDATE zones
    SET pos_x = ?, pos_y = ?
    WHERE id = ?
    `,
    [pos_x, pos_y, zoneId],
    function (err) {
      if (err) {
        return res.status(400).json({
          error: err.message,
        });
      }

      res.json({
        success: true,
      });
    }
  );
};