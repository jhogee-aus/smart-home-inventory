const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error(err.message);
  console.log('Connected to SQLite database.');
});

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS homes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_id INTEGER,
      name TEXT,
      width REAL,
      height REAL,
      pos_x REAL,
      pos_y REAL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER,
      name TEXT,
      type TEXT,
      width REAL,
      height REAL,
      pos_x REAL,
      pos_y REAL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      zone_id INTEGER NOT NULL,
        
      name TEXT NOT NULL,
      description TEXT,
        
      quantity INTEGER DEFAULT 1,
        
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
      FOREIGN KEY(zone_id)
      REFERENCES zones(id)
    )
  `);
});

module.exports = db;