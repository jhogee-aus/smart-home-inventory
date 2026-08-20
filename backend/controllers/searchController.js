const db = require('../db/db');

// Escape LIKE wildcards so literal '%' or '_' in a search term aren't
// treated as pattern characters.
const escapeLike = (str) =>
  str.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

exports.searchItems = (req, res) => {
  const query = (req.query.q || '').trim();

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const words = query.split(/\s+/).filter(Boolean);
  const fullTerm = `%${escapeLike(query)}%`;

  // Every word must appear somewhere across the item's name, description,
  // or its zone/room location, so e.g. "kitchen batteries" finds an item
  // named "batteries" sitting in a zone/room called "Kitchen".
  const wordConditions = words
    .map(() => `(
      items.name LIKE ? ESCAPE '\\'
      OR items.description LIKE ? ESCAPE '\\'
      OR zones.name LIKE ? ESCAPE '\\'
      OR rooms.name LIKE ? ESCAPE '\\'
    )`)
    .join(' AND ');

  const wordParams = words.flatMap((word) => {
    const pattern = `%${escapeLike(word)}%`;
    return [pattern, pattern, pattern, pattern];
  });

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

    WHERE ${wordConditions}

    ORDER BY
      CASE
        WHEN items.name LIKE ? ESCAPE '\\' THEN 0
        WHEN items.description LIKE ? ESCAPE '\\' THEN 1
        ELSE 2
      END,
      items.name COLLATE NOCASE

    LIMIT 50
    `,
    [...wordParams, fullTerm, fullTerm],
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