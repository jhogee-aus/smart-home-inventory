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
exports.createZone = async (roomId, { name, type, width, height, pos_x, pos_y, attributes } = {}) => {
  if (!name) {
    throw new Error('Zone name is required');
  }

  if (!(await roomExists(roomId))) {
    throw new Error('Room not found');
  }

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO zones (room_id, name, type, width, height, pos_x, pos_y, attributes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        roomId,
        name,
        type || 'box',
        width || 0,
        height || 0,
        pos_x || 0,
        pos_y || 0,
        JSON.stringify(attributes || {}),
      ],
      function (err) {
        if (err) return reject(err);

        resolve({
          id: this.lastID,
          room_id: roomId,
          name,
          type,
        });
      }
    );
  });
};

// GET zones by room
exports.getZonesByRoom = async (roomId) => {
  if (!(await roomExists(roomId))) {
    throw new Error('Room not found');
  }

  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM zones WHERE room_id = ?`, [roomId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

// update position while dragged
exports.updateZonePosition = async (zoneId, { pos_x, pos_y } = {}) => {
  if (!(await zoneExists(zoneId))) {
    throw new Error('Zone not found');
  }

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE zones SET pos_x = ?, pos_y = ? WHERE id = ?`,
      [pos_x, pos_y, zoneId],
      function (err) {
        if (err) return reject(err);
        resolve({ success: true });
      }
    );
  });
};

// item will be deleted before zone deleted
exports.deleteZone = async (zoneId) => {
  if (!(await zoneExists(zoneId))) {
    throw new Error('Zone not found');
  }

  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM items WHERE zone_id = ?`, [zoneId], (err) => {
      if (err) return reject(err);

      db.run(`DELETE FROM zones WHERE id = ?`, [zoneId], function (err) {
        if (err) return reject(err);
        resolve({ success: true });
      });
    });
  });
};

exports.updateZone = async (zoneId, { name, type, attributes } = {}) => {
  if (!(await zoneExists(zoneId))) {
    throw new Error('Zone not found');
  }

  return new Promise((resolve, reject) => {
    db.run(
      `
      UPDATE zones
      SET
        name = ?,
        type = ?,
        attributes = ?
      WHERE id = ?
      `,
      [name, type, JSON.stringify(attributes || {}), zoneId],
      function (err) {
        if (err) return reject(err);
        resolve({ success: true });
      }
    );
  });
};
