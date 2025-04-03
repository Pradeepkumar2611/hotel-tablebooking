const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const { db, initializeDatabase } = require('./database');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Initialize database and start server
async function startServer() {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    
    console.log('Database initialized. Setting up routes...');
    const routes = require('./routes');
    app.use('/', routes);
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
startServer();

// Windows-specific error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  if (err.code === 'EADDRINUSE') {
    console.error('Port 3000 is already in use. Please close other servers using this port.');
  }
  process.exit(1);
});