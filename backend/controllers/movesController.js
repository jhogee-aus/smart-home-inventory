const db = require('../db/db');

const boxExists = (boxId) =>
  new Promise((resolve, reject) => {
    db.get(`SELECT id FROM move_boxes WHERE id = ?`, [boxId], (err, row) => {
      if (err) return reject(err);
      resolve(!!row);
    });
  });

// CREATE box
exports.createBox = (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Box name is required' });
  }

  db.run(
    `INSERT INTO move_boxes (name, status) VALUES (?, 'packing')`,
    [name],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.status(201).json({ id: this.lastID, name, status: 'packing' });
    }
  );
};

// GET all boxes with their packed items
exports.getBoxes = (req, res) => {
  db.all(
    `
    SELECT
      move_boxes.id AS box_id,
      move_boxes.name AS box_name,
      move_boxes.status AS box_status,
      move_boxes.created_at AS box_created_at,
      move_boxes.completed_at AS box_completed_at,

      items.id AS item_id,
      items.name AS item_name,
      items.quantity AS item_quantity,
      items.description AS item_description

    FROM move_boxes
    LEFT JOIN items ON items.box_id = move_boxes.id

    ORDER BY move_boxes.created_at DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const boxMap = {};

      rows.forEach((row) => {
        if (!boxMap[row.box_id]) {
          boxMap[row.box_id] = {
            id: row.box_id,
            name: row.box_name,
            status: row.box_status,
            created_at: row.box_created_at,
            completed_at: row.box_completed_at,
            items: [],
          };
        }

        if (row.item_id) {
          boxMap[row.box_id].items.push({
            id: row.item_id,
            name: row.item_name,
            quantity: row.item_quantity,
            description: row.item_description,
          });
        }
      });

      res.json(Object.values(boxMap));
    }
  );
};

// mark a box as completed (packing is done, keeps it as a record)
exports.completeBox = async (req, res) => {
  const { boxId } = req.params;

  try {
    if (!(await boxExists(boxId))) {
      return res.status(404).json({ error: 'Box not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.run(
    `UPDATE move_boxes SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [boxId],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json({ success: true });
    }
  );
};

// DELETE a box - only once it's empty, so items are never silently orphaned
exports.deleteBox = async (req, res) => {
  const { boxId } = req.params;

  try {
    if (!(await boxExists(boxId))) {
      return res.status(404).json({ error: 'Box not found' });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.get(
    `SELECT COUNT(*) AS count FROM items WHERE box_id = ?`,
    [boxId],
    (err, row) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (row.count > 0) {
        return res.status(400).json({
          error: 'Unpack or remove all items from this box before deleting it',
        });
      }

      db.run(`DELETE FROM move_boxes WHERE id = ?`, [boxId], function (err) {
        if (err) {
          return res.status(400).json({ error: err.message });
        }

        res.json({ success: true });
      });
    }
  );
};
