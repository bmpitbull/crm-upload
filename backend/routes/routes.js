const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const { calculateDistance, milesToKm } = require('../utils/location');

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

// Get all routes for a user
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.all('SELECT * FROM routes WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get a single route with its stops
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  db.get('SELECT * FROM routes WHERE id = ? AND user_id = ?', [id, userId], (err, route) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!route) return res.status(404).json({ error: 'Route not found' });
    
    // Get route stops with business details
    db.all(`
      SELECT rs.*, b.name as business_name, b.address, b.phone, b.lat, b.lng
      FROM route_stops rs
      JOIN businesses b ON rs.business_id = b.id
      WHERE rs.route_id = ?
      ORDER BY rs.stop_order
    `, [id], (err, stops) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({ ...route, stops });
    });
  });
});

// Create a new route
router.post('/', authenticateToken, (req, res) => {
  const { name, description, business_ids } = req.body;
  const userId = req.user.id;
  
  if (!name || !business_ids || !Array.isArray(business_ids) || business_ids.length === 0) {
    return res.status(400).json({ error: 'Name and business_ids array are required' });
  }
  
  db.run('INSERT INTO routes (user_id, name, description) VALUES (?, ?, ?)', 
    [userId, name, description || ''], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    const routeId = this.lastID;
    
    // Add route stops
    const stopPromises = business_ids.map((businessId, index) => {
      return new Promise((resolve, reject) => {
        db.run('INSERT INTO route_stops (route_id, business_id, stop_order) VALUES (?, ?, ?)', 
          [routeId, businessId, index + 1], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    });
    
    Promise.all(stopPromises)
      .then(() => {
        // Calculate route distance
        calculateRouteDistance(routeId).then(() => {
          res.json({ id: routeId, message: 'Route created successfully' });
        });
      })
      .catch(err => {
        res.status(500).json({ error: err.message });
      });
  });
});

// Update a route
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, description, business_ids } = req.body;
  const userId = req.user.id;
  
  db.run('UPDATE routes SET name = ?, description = ?, updated_at = ? WHERE id = ? AND user_id = ?', 
    [name, description || '', new Date().toISOString(), id, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    if (business_ids && Array.isArray(business_ids)) {
      // Delete existing stops
      db.run('DELETE FROM route_stops WHERE route_id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Add new stops
        const stopPromises = business_ids.map((businessId, index) => {
          return new Promise((resolve, reject) => {
            db.run('INSERT INTO route_stops (route_id, business_id, stop_order) VALUES (?, ?, ?)', 
              [id, businessId, index + 1], function(err) {
              if (err) reject(err);
              else resolve();
            });
          });
        });
        
        Promise.all(stopPromises)
          .then(() => {
            calculateRouteDistance(id).then(() => {
              res.json({ message: 'Route updated successfully' });
            });
          })
          .catch(err => {
            res.status(500).json({ error: err.message });
          });
      });
    } else {
      res.json({ message: 'Route updated successfully' });
    }
  });
});

// Duplicate a route
router.post('/:id/duplicate', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const userId = req.user.id;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required for duplicated route' });
  }
  
  // Get original route
  db.get('SELECT * FROM routes WHERE id = ? AND user_id = ?', [id, userId], (err, route) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!route) return res.status(404).json({ error: 'Route not found' });
    
    // Create new route
    db.run('INSERT INTO routes (user_id, name, description, total_distance_miles, total_distance_km, estimated_duration_minutes) VALUES (?, ?, ?, ?, ?, ?)', 
      [userId, name, route.description, route.total_distance_miles, route.total_distance_km, route.estimated_duration_minutes], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const newRouteId = this.lastID;
      
      // Copy route stops
      db.all('SELECT * FROM route_stops WHERE route_id = ? ORDER BY stop_order', [id], (err, stops) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const stopPromises = stops.map(stop => {
          return new Promise((resolve, reject) => {
            db.run('INSERT INTO route_stops (route_id, business_id, stop_order, estimated_duration_minutes, notes) VALUES (?, ?, ?, ?, ?)', 
              [newRouteId, stop.business_id, stop.stop_order, stop.estimated_duration_minutes, stop.notes], function(err) {
              if (err) reject(err);
              else resolve();
            });
          });
        });
        
        Promise.all(stopPromises)
          .then(() => {
            res.json({ id: newRouteId, message: 'Route duplicated successfully' });
          })
          .catch(err => {
            res.status(500).json({ error: err.message });
          });
      });
    });
  });
});

// Delete a route
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  db.run('DELETE FROM routes WHERE id = ? AND user_id = ?', [id, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Route deleted successfully' });
  });
});

// Start route execution
router.post('/:id/execute', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { execution_date, notes } = req.body;
  const userId = req.user.id;
  
  const date = execution_date || new Date().toISOString().split('T')[0];
  const startTime = new Date().toISOString();
  
  db.run('INSERT INTO route_executions (route_id, user_id, execution_date, start_time, notes, status) VALUES (?, ?, ?, ?, ?, ?)', 
    [id, userId, date, startTime, notes || '', 'in_progress'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ execution_id: this.lastID, start_time: startTime });
  });
});

// Complete route execution
router.put('/executions/:executionId/complete', authenticateToken, (req, res) => {
  const { executionId } = req.params;
  const { actual_distance_miles, actual_duration_minutes, notes } = req.body;
  const userId = req.user.id;
  
  const endTime = new Date().toISOString();
  const actualDistanceKm = milesToKm(actual_distance_miles || 0);
  
  db.run('UPDATE route_executions SET end_time = ?, actual_distance_miles = ?, actual_distance_km = ?, actual_duration_minutes = ?, notes = ?, status = ? WHERE id = ? AND user_id = ?', 
    [endTime, actual_distance_miles || 0, actualDistanceKm, actual_duration_minutes || 0, notes || '', 'completed', executionId, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Route execution completed' });
  });
});

// Get route executions
router.get('/:id/executions', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  db.all('SELECT * FROM route_executions WHERE route_id = ? AND user_id = ? ORDER BY execution_date DESC', 
    [id, userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Calculate route distance
function calculateRouteDistance(routeId) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT rs.*, b.lat, b.lng
      FROM route_stops rs
      JOIN businesses b ON rs.business_id = b.id
      WHERE rs.route_id = ?
      ORDER BY rs.stop_order
    `, [routeId], (err, stops) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (stops.length < 2) {
        // Update route with zero distance
        db.run('UPDATE routes SET total_distance_miles = 0, total_distance_km = 0 WHERE id = ?', [routeId], (err) => {
          if (err) reject(err);
          else resolve();
        });
        return;
      }
      
      let totalDistance = 0;
      for (let i = 1; i < stops.length; i++) {
        const prev = stops[i - 1];
        const curr = stops[i];
        
        if (prev.lat && prev.lng && curr.lat && curr.lng) {
          const distance = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
          totalDistance += distance;
        }
      }
      
      const totalDistanceKm = milesToKm(totalDistance);
      
      db.run('UPDATE routes SET total_distance_miles = ?, total_distance_km = ? WHERE id = ?', 
        [totalDistance, totalDistanceKm, routeId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

module.exports = router; 