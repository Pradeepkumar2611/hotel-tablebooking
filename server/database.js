const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path - Windows compatible
const dbPath = path.join(__dirname, 'table-booking.db');
console.log('Database path:', dbPath);

// Initialize database connection
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database at', dbPath);
});

// Create tables and insert sample data
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create tables
      db.run(`CREATE TABLE IF NOT EXISTS restaurants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cuisine TEXT,
        tables INTEGER,
        opening_time TEXT,
        closing_time TEXT
      )`, (err) => {
        if (err) return reject(err);
        
        db.run(`CREATE TABLE IF NOT EXISTS menu_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          restaurant_id INTEGER,
          name TEXT NOT NULL,
          description TEXT,
          price REAL,
          category TEXT,
          FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
        )`, (err) => {
          if (err) return reject(err);
          
          db.run(`CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            restaurant_id INTEGER,
            user_name TEXT,
            user_email TEXT,
            booking_date TEXT,
            booking_time TEXT,
            guests INTEGER,
            special_requests TEXT,
            status TEXT DEFAULT 'confirmed',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
          )`, (err) => {
            if (err) return reject(err);
            
            db.run(`CREATE TABLE IF NOT EXISTS order_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              booking_id INTEGER,
              menu_item_id INTEGER,
              quantity INTEGER,
              special_requests TEXT,
              FOREIGN KEY(booking_id) REFERENCES bookings(id),
              FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
            )`, (err) => {
              if (err) return reject(err);
              
              // Check if sample data already exists
              db.get("SELECT COUNT(*) as count FROM restaurants", (err, row) => {
                if (err) return reject(err);
                
                if (row.count === 0) {
                  insertSampleData().then(resolve).catch(reject);
                } else {
                  console.log('Database already contains data');
                  resolve();
                }
              });
            });
          });
        });
      });
    });
  });
}

function insertSampleData() {
  return new Promise((resolve, reject) => {
    console.log('Inserting sample data...');
    
    // Sample restaurants
    const restaurants = [
      ["Tasty Bites", "Indian", 10, "11:00", "23:00"],
      ["Pasta Palace", "Italian", 8, "12:00", "22:00"],
      ["Burger Barn", "American", 12, "10:00", "22:00"]
    ];
    
    const stmt = db.prepare("INSERT INTO restaurants (name, cuisine, tables, opening_time, closing_time) VALUES (?, ?, ?, ?, ?)");
    
    restaurants.forEach(restaurant => {
      stmt.run(restaurant, (err) => {
        if (err) return reject(err);
      });
    });
    
    stmt.finalize(err => {
      if (err) return reject(err);
      
      // Sample menu items
      const menuItems = [
        [1, "Butter Chicken", "Creamy tomato-based curry with tender chicken", 14.99, "Main Course"],
        [1, "Garlic Naan", "Soft bread with garlic butter", 3.99, "Bread"],
        [2, "Spaghetti Carbonara", "Classic pasta with creamy egg sauce", 12.99, "Main Course"],
        [2, "Tiramisu", "Coffee-flavored Italian dessert", 7.99, "Dessert"],
        [3, "Classic Burger", "Beef patty with lettuce and special sauce", 9.99, "Main Course"],
        [3, "Chocolate Shake", "Creamy chocolate milkshake", 5.99, "Drink"]
      ];
      
      const menuStmt = db.prepare("INSERT INTO menu_items (restaurant_id, name, description, price, category) VALUES (?, ?, ?, ?, ?)");
      
      menuItems.forEach(item => {
        menuStmt.run(item, (err) => {
          if (err) return reject(err);
        });
      });
      
      menuStmt.finalize(err => {
        if (err) return reject(err);
        console.log('Sample data inserted successfully');
        resolve();
      });
    });
  });
}

module.exports = {
  db,
  initializeDatabase
};