require('dotenv').config();
const express = require('express');
const path = require('path');
const { getDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
getDb();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/plates', require('./routes/plates'));
app.use('/api/menus', require('./routes/menus'));
app.use('/api/orders', require('./routes/orders'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Buvette UCC démarré sur http://localhost:${PORT}`);
});
