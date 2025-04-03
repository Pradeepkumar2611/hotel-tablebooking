const express = require('express');
const router = express.Router();
const { db } = require('./database');

// Middleware to check database connection
router.use((req, res, next) => {
  if (!db) {
    console.error('Database connection not established');
    return res.status(500).json({ error: 'Database connection not established' });
  }
  next();
});

// Get all restaurants
router.get('/api/restaurants', (req, res) => {
  db.all("SELECT * FROM restaurants", [], (err, rows) => {
    if (err) {
      console.error('Database error in /api/restaurants:', err);
      return res.status(500).json({ error: 'Failed to fetch restaurants' });
    }
    res.json(rows);
  });
});

// Get restaurant details with menu
router.get('/api/restaurants/:id', (req, res) => {
  const id = req.params.id;
  
  db.get("SELECT * FROM restaurants WHERE id = ?", [id], (err, restaurant) => {
    if (err) {
      console.error('Database error in /api/restaurants/:id:', err);
      return res.status(500).json({ error: 'Failed to fetch restaurant' });
    }
    
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    
    db.all("SELECT * FROM menu_items WHERE restaurant_id = ?", [id], (err, menu) => {
      if (err) {
        console.error('Database error fetching menu:', err);
        return res.status(500).json({ error: 'Failed to fetch menu' });
      }
      
      res.json({
        ...restaurant,
        menu: menu || []
      });
    });
  });
});

// Check table availability
router.post('/api/check-availability', (req, res) => {
  const { restaurantId, date, time, guests } = req.body;
  
  if (!restaurantId || !date || !time || !guests) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.get("SELECT tables FROM restaurants WHERE id = ?", [restaurantId], (err, row) => {
    if (err) {
      console.error('Database error in /api/check-availability:', err);
      return res.status(500).json({ error: 'Failed to check availability' });
    }
    
    if (!row) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    
    const totalTables = row.tables;
    
    db.get(
      `SELECT COUNT(*) as bookedTables 
       FROM bookings 
       WHERE restaurant_id = ? AND booking_date = ? AND booking_time = ? AND status != 'cancelled'`,
      [restaurantId, date, time],
      (err, countRow) => {
        if (err) {
          console.error('Database error counting bookings:', err);
          return res.status(500).json({ error: 'Failed to check availability' });
        }
        
        const available = (countRow.bookedTables < totalTables);
        res.json({ 
          available,
          availableTables: totalTables - countRow.bookedTables
        });
      }
    );
  });
});

// Create booking
router.post('/api/bookings', (req, res) => {
  const { restaurantId, userName, userEmail, bookingDate, bookingTime, guests, specialRequests, orderItems } = req.body;
  
  if (!restaurantId || !userName || !userEmail || !bookingDate || !bookingTime || !guests) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.serialize(() => {
    db.run(
      `INSERT INTO bookings 
       (restaurant_id, user_name, user_email, booking_date, booking_time, guests, special_requests)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [restaurantId, userName, userEmail, bookingDate, bookingTime, guests, specialRequests || null],
      function(err) {
        if (err) {
          console.error('Database error creating booking:', err);
          return res.status(500).json({ error: 'Failed to create booking' });
        }
        
        const bookingId = this.lastID;
        
        if (orderItems && orderItems.length > 0) {
          const stmt = db.prepare(
            `INSERT INTO order_items 
             (booking_id, menu_item_id, quantity, special_requests)
             VALUES (?, ?, ?, ?)`
          );
          
          let hasError = false;
          orderItems.forEach(item => {
            if (hasError) return;
            
            stmt.run([bookingId, item.menuItemId, item.quantity, item.specialRequests || null], (err) => {
              if (err) {
                console.error('Database error adding order item:', err);
                hasError = true;
              }
            });
          });
          
          stmt.finalize(err => {
            if (err || hasError) {
              console.error('Database error finalizing order:', err);
              return res.status(500).json({ error: 'Booking created but failed to save order items' });
            }
            
            res.json({ 
              success: true,
              bookingId,
              message: "Booking and order confirmed"
            });
          });
        } else {
          res.json({ 
            success: true,
            bookingId,
            message: "Booking confirmed"
          });
        }
      }
    );
  });
});

// Get booking details
router.get('/api/bookings/:id', (req, res) => {
  const id = req.params.id;
  
  db.get(
    `SELECT b.*, r.name as restaurant_name 
     FROM bookings b
     JOIN restaurants r ON b.restaurant_id = r.id
     WHERE b.id = ?`,
    [id],
    (err, booking) => {
      if (err) {
        console.error('Database error fetching booking:', err);
        return res.status(500).json({ error: 'Failed to fetch booking' });
      }
      
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      db.all(
        `SELECT oi.*, mi.name as item_name, mi.price as item_price
         FROM order_items oi
         JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE oi.booking_id = ?`,
        [id],
        (err, orderItems) => {
          if (err) {
            console.error('Database error fetching order items:', err);
            return res.status(500).json({ error: 'Failed to fetch order items' });
          }
          
          res.json({
            ...booking,
            orderItems: orderItems || []
          });
        }
      );
    }
  );
});

module.exports = router;