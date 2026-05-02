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