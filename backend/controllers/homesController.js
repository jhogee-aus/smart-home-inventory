const db = require('../db/db');

const homeExists = (homeId) =>
  new Promise((resolve, reject) => {
    db.get(`SELECT id FROM homes WHERE id = ?`, [homeId], (err, row) => {
      if (err) return reject(err);
      resolve(!!row);
    });
  });

// CREATE home
exports.createHome = (name) => {
  if (!name) {
    return Promise.reject(new Error('Name is required'));
  }

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO homes (name) VALUES (?)`,
      [name],
      function (err) {
        if (err) return reject(err);

        resolve({
          id: this.lastID,
          name,
        });
      }
    );
  });
};

// GET all homes
exports.getHomes = () =>
  new Promise((resolve, reject) => {
    db.all(`SELECT * FROM homes`, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

// DELETE home (and all rooms/zones/items belonging to it)
exports.deleteHome = async (homeId) => {
  if (!(await homeExists(homeId))) {
    throw new Error('Home not found');
  }

  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM items WHERE zone_id IN (
        SELECT zones.id FROM zones
        JOIN rooms ON zones.room_id = rooms.id
        WHERE rooms.home_id = ?
      )`,
      [homeId],
      (err) => {
        if (err) return reject(err);

        db.run(
          `DELETE FROM zones WHERE room_id IN (
            SELECT id FROM rooms WHERE home_id = ?
          )`,
          [homeId],
          (err) => {
            if (err) return reject(err);

            db.run(
              `DELETE FROM rooms WHERE home_id = ?`,
              [homeId],
              (err) => {
                if (err) return reject(err);

                db.run(
                  `DELETE FROM homes WHERE id = ?`,
                  [homeId],
                  function (err) {
                    if (err) return reject(err);
                    resolve({ success: true });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
};
