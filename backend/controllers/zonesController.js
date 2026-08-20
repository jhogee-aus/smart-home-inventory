const db = require('../db/db');

const roomExists = (roomId) =>
  new Promise((resolve, reject) => {
    db.get(`SELECT id FROM rooms WHERE id = ?`, [roomId], (err, row) => {
      if (err) return reject(err);
      resolve(!!row);
    });
  });

const zoneExists = (zoneId) =>
  new Promise((resolve, reject) => {
    db.get(`SELECT id FROM zones WHERE id = ?`, [zoneId], (err, row) => {
      if (err) return reject(err);
      resolve(!!row);
    });
  });

// CREATE zone
exports.createZone = async (req, res) => {
  const { roomId } = req.params;
  const { name, type, width, height, pos_x, pos_y } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Zone name is required' });
  }

  try {
    if (!(await roomExists(roomId))) {
      return res.status(404).json({ error: 'Room not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
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
exports.getZonesByRoom = async (req, res) => {
  const { roomId } = req.params;

  try {
    if (!(await roomExists(roomId))) {
      return res.status(404).json({ error: 'Room not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

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
exports.updateZonePosition = async (req, res) => {
  const { zoneId } = req.params;

  const { pos_x, pos_y } = req.body;

  try {
    if (!(await zoneExists(zoneId))) {
      return res.status(404).json({ error: 'Zone not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

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

//item will be deleted before zone deleted
exports.deleteZone = async (req, res) => {

  const { zoneId } = req.params;

  try {
    if (!(await zoneExists(zoneId))) {
      return res.status(404).json({ error: 'Zone not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.run(
    `DELETE FROM items WHERE zone_id = ?`,
    [zoneId],
    (err) => {

      if (err) {

        return res.status(400).json({
          error: err.message
        });
      }

      db.run(
        `
        DELETE FROM zones
        WHERE id = ?
        `,
        [zoneId],
        function(err) {

          if (err) {

            return res.status(400).json({
              error: err.message
            });
          }

          res.json({
            success: true
          });
        }
      );
    }
  );
};

exports.updateZone = async (req, res) => {

  const { zoneId } = req.params;

  const {
    name,
    type
  } = req.body;

  try {
    if (!(await zoneExists(zoneId))) {
      return res.status(404).json({ error: 'Zone not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.run(
    `
    UPDATE zones
    SET
      name = ?,
      type = ?
    WHERE id = ?
    `,
    [
      name,
      type,
      zoneId
    ],
    function(err) {

      if (err) {

        return res.status(400).json({
          error: err.message
        });

      }

      res.json({
        success: true
      });
    }
  );
};
