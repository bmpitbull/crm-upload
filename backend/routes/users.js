const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../crm.sqlite'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);
});

// Register
router.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const hash = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], function(err) {
    if (err) return res.status(400).json({ error: 'User already exists' });
    res.json({ success: true });
  });
});

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    console.log('Login attempt:', { username });
    if (err || !user) {
      console.log('User not found or DB error:', err);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log('User found:', user);
    if (!bcrypt.compareSync(password, user.password)) {
      console.log('Password mismatch');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    if (!process.env.JWT_SECRET) {
      console.log('JWT_SECRET is missing!');
      return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET missing' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1d' });
    console.log('Token generated:', token);
    res.json({ token });
  });
});

module.exports = router;
