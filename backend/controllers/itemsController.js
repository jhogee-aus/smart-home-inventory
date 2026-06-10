const db = require('../db/db');

// CREATE item
exports.createItem = (req, res) => {
  const { zoneId } = req.params;
  const { name, description, quantity } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Item name is required' });
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
exports.getItemsByZone = (req, res) => {
  const { zoneId } = req.params;

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

exports.deleteItem = (req, res) => {

  const { itemId } = req.params;

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

exports.updateItem = (req, res) => {

  const { itemId } = req.params;

  const {
    name,
    quantity
  } = req.body;

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