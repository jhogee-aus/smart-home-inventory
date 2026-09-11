const db = require('../db/db');

const zoneExists = (zoneId) =>
  new Promise((resolve, reject) => {
    db.get(`SELECT id FROM zones WHERE id = ?`, [zoneId], (err, row) => {
      if (err) return reject(err);
      resolve(!!row);
    });
  });

const itemExists = (itemId) =>
  new Promise((resolve, reject) => {
    db.get(`SELECT id FROM items WHERE id = ?`, [itemId], (err, row) => {
      if (err) return reject(err);
      resolve(!!row);
    });
  });

// CREATE item
exports.createItem = async (zoneId, { name, description, quantity } = {}) => {
  if (!name) {
    throw new Error('Item name is required');
  }

  if (!(await zoneExists(zoneId))) {
    throw new Error('Zone not found');
  }

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO items (zone_id, name, description, quantity)
       VALUES (?, ?, ?, ?)`,
      [zoneId, name, description || '', quantity || 1],
      function (err) {
        if (err) return reject(err);

        resolve({
          id: this.lastID,
          zone_id: zoneId,
          name,
        });
      }
    );
  });
};

// GET items by zone
exports.getItemsByZone = async (zoneId) => {
  if (!(await zoneExists(zoneId))) {
    throw new Error('Zone not found');
  }

  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM items WHERE zone_id = ?`, [zoneId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

exports.deleteItem = async (itemId) => {
  if (!(await itemExists(itemId))) {
    throw new Error('Item not found');
  }

  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM items WHERE id = ?`, [itemId], function (err) {
      if (err) return reject(err);
      resolve({ success: true });
    });
  });
};

// pack an item from its zone into a moving box
exports.packItem = async (itemId, { box_id } = {}) => {
  if (!box_id) {
    throw new Error('box_id is required');
  }

  if (!(await itemExists(itemId))) {
    throw new Error('Item not found');
  }

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE items SET box_id = ?, zone_id = NULL WHERE id = ?`,
      [box_id, itemId],
      function (err) {
        if (err) return reject(err);
        resolve({ success: true });
      }
    );
  });
};

// unpack an item from a moving box into a destination zone
exports.unpackItem = async (itemId, { zone_id } = {}) => {
  if (!zone_id) {
    throw new Error('zone_id is required');
  }

  if (!(await itemExists(itemId))) {
    throw new Error('Item not found');
  }

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE items SET zone_id = ?, box_id = NULL WHERE id = ?`,
      [zone_id, itemId],
      function (err) {
        if (err) return reject(err);
        resolve({ success: true });
      }
    );
  });
};

exports.updateItem = async (itemId, { name, quantity } = {}) => {
  if (!(await itemExists(itemId))) {
    throw new Error('Item not found');
  }

  return new Promise((resolve, reject) => {
    db.run(
      `
      UPDATE items
      SET
        name = ?,
        quantity = ?
      WHERE id = ?
      `,
      [name, quantity, itemId],
      function (err) {
        if (err) return reject(err);
        resolve({ success: true });
      }
    );
  });
};
