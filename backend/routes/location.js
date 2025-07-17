const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const { 
  calculateDistance, 
  calculateTotalDistance, 
  milesToKm, 
  generateSessionId, 
  getCurrentDate 
} = require('../utils/location');

const db = new sqlite3.Database(path.join(__dirname, '../crm.sqlite'));

// JWT auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Start a new tracking session
router.post('/tracking/start', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const sessionId = generateSessionId();
  const startTime = new Date().toISOString();
  
  db.run('INSERT INTO user_sessions (user_id, session_id, start_time) VALUES (?, ?, ?)', 
    [userId, sessionId, startTime], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ session_id: sessionId, start_time: startTime });
  });
});

// End a tracking session
router.post('/tracking/end', authenticateToken, (req, res) => {
  const { session_id } = req.body;
  const userId = req.user.id;
  const endTime = new Date().toISOString();
  
  db.run('UPDATE user_sessions SET end_time = ?, is_active = 0 WHERE session_id = ? AND user_id = ?', 
    [endTime, session_id, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Session ended successfully' });
  });
});

// Record a location point
router.post('/tracking/record', authenticateToken, (req, res) => {
  const { latitude, longitude, accuracy, session_id } = req.body;
  const userId = req.user.id;
  const timestamp = new Date().toISOString();
  
  if (!latitude || !longitude || !session_id) {
    return res.status(400).json({ error: 'latitude, longitude, and session_id are required' });
  }
  
  db.run('INSERT INTO location_tracking (user_id, latitude, longitude, accuracy, timestamp, session_id) VALUES (?, ?, ?, ?, ?, ?)', 
    [userId, latitude, longitude, accuracy || null, timestamp, session_id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, timestamp });
  });
});

// Get user's route for a specific session
router.get('/tracking/session/:sessionId', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  
  db.all('SELECT * FROM location_tracking WHERE session_id = ? AND user_id = ? ORDER BY timestamp', 
    [sessionId, userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get user's routes for a specific date
router.get('/tracking/date/:date', authenticateToken, (req, res) => {
  const { date } = req.params;
  const userId = req.user.id;
  
  db.all(`
    SELECT lt.*, us.start_time, us.end_time 
    FROM location_tracking lt 
    JOIN user_sessions us ON lt.session_id = us.session_id 
    WHERE lt.user_id = ? AND DATE(lt.timestamp) = ? 
    ORDER BY lt.timestamp
  `, [userId, date], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get user's daily mileage
router.get('/mileage/daily/:date', authenticateToken, (req, res) => {
  const { date } = req.params;
  const userId = req.user.id;
  
  db.get('SELECT * FROM daily_mileage WHERE user_id = ? AND date = ?', 
    [userId, date], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || { 
      user_id: userId, 
      date: date, 
      total_distance_miles: 0, 
      total_distance_km: 0, 
      points_count: 0, 
      session_count: 0 
    });
  });
});

// Get user's mileage for a date range
router.get('/mileage/range', authenticateToken, (req, res) => {
  const { start_date, end_date } = req.query;
  const userId = req.user.id;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }
  
  db.all('SELECT * FROM daily_mileage WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date', 
    [userId, start_date, end_date], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Calculate and update daily mileage for a user
router.post('/mileage/calculate/:date', authenticateToken, (req, res) => {
  const { date } = req.params;
  const userId = req.user.id;
  
  // Get all location points for the user on the specified date
  db.all(`
    SELECT lt.*, us.session_id 
    FROM location_tracking lt 
    JOIN user_sessions us ON lt.session_id = us.session_id 
    WHERE lt.user_id = ? AND DATE(lt.timestamp) = ? 
    ORDER BY lt.timestamp
  `, [userId, date], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (rows.length === 0) {
      return res.json({ 
        date: date, 
        total_distance_miles: 0, 
        total_distance_km: 0, 
        points_count: 0, 
        session_count: 0 
      });
    }
    
    // Group points by session
    const sessions = {};
    rows.forEach(row => {
      if (!sessions[row.session_id]) {
        sessions[row.session_id] = [];
      }
      sessions[row.session_id].push(row);
    });
    
    // Calculate total distance across all sessions
    let totalDistanceMiles = 0;
    const sessionCount = Object.keys(sessions).length;
    const pointsCount = rows.length;
    
    Object.values(sessions).forEach(sessionPoints => {
      if (sessionPoints.length > 1) {
        const sessionDistance = calculateTotalDistance(sessionPoints);
        totalDistanceMiles += sessionDistance;
      }
    });
    
    const totalDistanceKm = milesToKm(totalDistanceMiles);
    
    // Insert or update daily mileage record
    db.run(`
      INSERT OR REPLACE INTO daily_mileage 
      (user_id, date, total_distance_miles, total_distance_km, points_count, session_count, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, date, totalDistanceMiles, totalDistanceKm, pointsCount, sessionCount, new Date().toISOString()], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ 
        date: date, 
        total_distance_miles: totalDistanceMiles, 
        total_distance_km: totalDistanceKm, 
        points_count: pointsCount, 
        session_count: sessionCount 
      });
    });
  });
});

// Get active sessions for a user
router.get('/tracking/active-sessions', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.all('SELECT * FROM user_sessions WHERE user_id = ? AND is_active = 1 ORDER BY start_time DESC', 
    [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router; 