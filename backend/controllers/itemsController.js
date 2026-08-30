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
exports.createItem = async (req, res) => {
  const { zoneId } = req.params;
  const { name, description, quantity } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Item name is required' });
  }

  try {
    if (!(await zoneExists(zoneId))) {
      return res.status(404).json({ error: 'Zone not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.run(
    `INSERT INTO items (zone_id, name, description, quantity)
     VALUES (?, ?, ?, ?)`,
    [zoneId, name, description || '', quantity || 1],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        zone_id: zoneId,
        name
      });
    }
  );
};

// GET items by zone
exports.getItemsByZone = async (req, res) => {
  const { zoneId } = req.params;

  try {
    if (!(await zoneExists(zoneId))) {
      return res.status(404).json({ error: 'Zone not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.all(
    `SELECT * FROM items WHERE zone_id = ?`,
    [zoneId],
    (err, rows) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json(rows);
    }
  );
};

exports.deleteItem = async (req, res) => {

  const { itemId } = req.params;

  try {
    if (!(await itemExists(itemId))) {
      return res.status(404).json({ error: 'Item not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.run(
    `
    DELETE FROM items
    WHERE id = ?
    `,
    [itemId],
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

// pack an item from its zone into a moving box
exports.packItem = async (req, res) => {
  const { itemId } = req.params;
  const { box_id } = req.body;

  if (!box_id) {
    return res.status(400).json({ error: 'box_id is required' });
  }

  try {
    if (!(await itemExists(itemId))) {
      return res.status(404).json({ error: 'Item not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.run(
    `UPDATE items SET box_id = ?, zone_id = NULL WHERE id = ?`,
    [box_id, itemId],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json({ success: true });
    }
  );
};

// unpack an item from a moving box into a destination zone
exports.unpackItem = async (req, res) => {
  const { itemId } = req.params;
  const { zone_id } = req.body;

  if (!zone_id) {
    return res.status(400).json({ error: 'zone_id is required' });
  }

  try {
    if (!(await itemExists(itemId))) {
      return res.status(404).json({ error: 'Item not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.run(
    `UPDATE items SET zone_id = ?, box_id = NULL WHERE id = ?`,
    [zone_id, itemId],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json({ success: true });
    }
  );
};

exports.updateItem = async (req, res) => {

  const { itemId } = req.params;

  const {
    name,
    quantity
  } = req.body;

  try {
    if (!(await itemExists(itemId))) {
      return res.status(404).json({ error: 'Item not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.run(
    `
    UPDATE items
    SET
      name = ?,
      quantity = ?
    WHERE id = ?
    `,
    [
      name,
      quantity,
      itemId
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
