const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Get all appointments for a business
router.get('/business/:businessId', auth, (req, res) => {
  const { businessId } = req.params;
  const { date } = req.query;
  
  let query = `
    SELECT a.*, c.name as contact_name, b.name as business_name
    FROM appointments a
    LEFT JOIN contacts c ON a.contact_id = c.id
    LEFT JOIN businesses b ON a.business_id = b.id
    WHERE a.business_id = ?
  `;
  
  let params = [businessId];
  
  if (date) {
    query += ' AND a.appointment_date = ?';
    params.push(date);
  }
  
  query += ' ORDER BY a.appointment_date, a.appointment_time';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching appointments:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get appointments for a specific date range
router.get('/date-range', auth, (req, res) => {
  const { start_date, end_date, business_id } = req.query;
  
  let query = `
    SELECT a.*, c.name as contact_name, b.name as business_name
    FROM appointments a
    LEFT JOIN contacts c ON a.contact_id = c.id
    LEFT JOIN businesses b ON a.business_id = b.id
    WHERE a.appointment_date BETWEEN ? AND ?
  `;
  
  let params = [start_date, end_date];
  
  if (business_id) {
    query += ' AND a.business_id = ?';
    params.push(business_id);
  }
  
  query += ' ORDER BY a.appointment_date, a.appointment_time';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching appointments by date range:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create a new appointment
router.post('/', auth, (req, res) => {
  const { business_id, contact_id, title, description, appointment_date, appointment_time, duration_minutes } = req.body;
  
  if (!business_id || !title || !appointment_date || !appointment_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const query = `
    INSERT INTO appointments (business_id, contact_id, title, description, appointment_date, appointment_time, duration_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [business_id, contact_id || null, title, description || null, appointment_date, appointment_time, duration_minutes || 60];
  
  db.run(query, params, function(err) {
    if (err) {
      console.error('Error creating appointment:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get the created appointment with contact and business info
    const selectQuery = `
      SELECT a.*, c.name as contact_name, b.name as business_name
      FROM appointments a
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN businesses b ON a.business_id = b.id
      WHERE a.id = ?
    `;
    
    db.get(selectQuery, [this.lastID], (err, row) => {
      if (err) {
        console.error('Error fetching created appointment:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json(row);
    });
  });
});

// Update an appointment
router.put('/:id', auth, (req, res) => {
  const { id } = req.params;
  const { title, description, appointment_date, appointment_time, duration_minutes, status, contact_id } = req.body;
  
  const query = `
    UPDATE appointments 
    SET title = ?, description = ?, appointment_date = ?, appointment_time = ?, 
        duration_minutes = ?, status = ?, contact_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  const params = [title, description, appointment_date, appointment_time, duration_minutes || 60, status || 'scheduled', contact_id || null, id];
  
  db.run(query, params, function(err) {
    if (err) {
      console.error('Error updating appointment:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    // Get the updated appointment
    const selectQuery = `
      SELECT a.*, c.name as contact_name, b.name as business_name
      FROM appointments a
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN businesses b ON a.business_id = b.id
      WHERE a.id = ?
    `;
    
    db.get(selectQuery, [id], (err, row) => {
      if (err) {
        console.error('Error fetching updated appointment:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(row);
    });
  });
});

// Delete an appointment
router.delete('/:id', auth, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM appointments WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting appointment:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({ message: 'Appointment deleted successfully' });
  });
});

module.exports = router; 