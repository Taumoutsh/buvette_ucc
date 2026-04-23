const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, 'data', 'buvette.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('food', 'beverage')),
      active INTEGER NOT NULL DEFAULT 1,
      color TEXT NOT NULL DEFAULT '#ffffff'
    );

    CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('food', 'beverage')),
      active INTEGER NOT NULL DEFAULT 1,
      color TEXT NOT NULL DEFAULT '#ffffff'
    );

    CREATE TABLE IF NOT EXISTS menu_plates (
      menu_id INTEGER NOT NULL,
      plate_id INTEGER NOT NULL,
      PRIMARY KEY (menu_id, plate_id),
      FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
      FOREIGN KEY (plate_id) REFERENCES plates(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('cash', 'card')),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      plate_id INTEGER,
      menu_id INTEGER,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (plate_id) REFERENCES plates(id) ON DELETE SET NULL,
      FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE SET NULL
    );
  `);

  // Migrate: add color column if missing
  const platesCols = db.prepare("PRAGMA table_info(plates)").all().map(c => c.name);
  if (!platesCols.includes('color')) {
    db.exec("ALTER TABLE plates ADD COLUMN color TEXT NOT NULL DEFAULT '#ffffff'");
  }
  const menusCols = db.prepare("PRAGMA table_info(menus)").all().map(c => c.name);
  if (!menusCols.includes('color')) {
    db.exec("ALTER TABLE menus ADD COLUMN color TEXT NOT NULL DEFAULT '#ffffff'");
  }
  const ordersCols = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
  if (!ordersCols.includes('payment_method')) {
    db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT CHECK(payment_method IN ('cash', 'card'))");
  }

  // Seed default user if not exists
  const username = process.env.DEFAULT_USERNAME || 'buvette';
  const password = process.env.DEFAULT_PASSWORD || 'ucc2024';
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
    console.log(`Compte par défaut créé: ${username}`);
  }
}

module.exports = { getDb };
