const db = require('../db/db');

exports.searchItems = (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const searchTerm = `%${query}%`;

  db.all(
    `
    SELECT 
      items.id AS item_id,
      items.name AS item_name,
      items.description,
      items.quantity,

      zones.id AS zone_id,
      zones.name AS zone_name,
      zones.pos_x,
      zones.pos_y,

      rooms.id AS room_id,
      rooms.name AS room_name

    FROM items
    JOIN zones ON items.zone_id = zones.id
    JOIN rooms ON zones.room_id = rooms.id

    WHERE items.name LIKE ?
       OR items.description LIKE ?
    `,
    [searchTerm, searchTerm],
    (err, rows) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json({
        results: rows
      });
    }
  );
};