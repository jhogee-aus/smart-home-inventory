const db = require('../db/db');

// CREATE home
exports.createHome = (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  db.run(
    `INSERT INTO homes (name) VALUES (?)`,
    [name],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        name
      });
    }
  );
};

// GET all homes
exports.getHomes = (req, res) => {
  db.all(`SELECT * FROM homes`, [], (err, rows) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    res.json(rows);
  });
};

// DELETE home (and all rooms/zones/items belonging to it)
exports.deleteHome = (req, res) => {
  const { homeId } = req.params;

  db.get(
    `SELECT id FROM homes WHERE id = ?`,
    [homeId],
    (err, home) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      if (!home) {
        return res.status(404).json({ error: 'Home not found' });
      }

      db.run(
        `DELETE FROM items WHERE zone_id IN (
          SELECT zones.id FROM zones
          JOIN rooms ON zones.room_id = rooms.id
          WHERE rooms.home_id = ?
        )`,
        [homeId],
        (err) => {
          if (err) {
            return res.status(400).json({ error: err.message });
          }

          db.run(
            `DELETE FROM zones WHERE room_id IN (
              SELECT id FROM rooms WHERE home_id = ?
            )`,
            [homeId],
            (err) => {
              if (err) {
                return res.status(400).json({ error: err.message });
              }

              db.run(
                `DELETE FROM rooms WHERE home_id = ?`,
                [homeId],
                (err) => {
                  if (err) {
                    return res.status(400).json({ error: err.message });
                  }

                  db.run(
                    `DELETE FROM homes WHERE id = ?`,
                    [homeId],
                    function (err) {
                      if (err) {
                        return res.status(400).json({ error: err.message });
                      }

                      res.json({ success: true });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
};
