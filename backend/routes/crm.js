const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth');

const db = new sqlite3.Database(path.join(__dirname, '../crm.sqlite'));

// Create tables if not exist
// Businesses: id, name, address, phone, lat, lng
// Contacts: id, business_id, name, title, phone, email
// Notes: id, business_id, contact_id, note, created_at

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    address TEXT,
    phone TEXT,
    lat REAL,
    lng REAL
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER,
    name TEXT,
    phone TEXT,
    email TEXT,
    FOREIGN KEY(business_id) REFERENCES businesses(id)
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER,
    contact_id INTEGER,
    note TEXT,
    created_at TEXT,
    FOREIGN KEY(contact_id) REFERENCES contacts(id)
  )`);
});

// Remove the local authenticateToken function

// Get all businesses
router.get('/businesses', authenticateToken, (req, res) => {
  db.all('SELECT * FROM businesses', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get business by id
router.get('/businesses/:id', authenticateToken, (req, res) => {
  db.get('SELECT * FROM businesses WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// Create business
router.post('/businesses', authenticateToken, (req, res) => {
  console.log('POST /businesses - Request body:', req.body);
  const { name, address, phone, lat, lng } = req.body;
  
  if (!name || !name.trim()) {
    console.log('Error: Name is required');
    return res.status(400).json({ error: 'Name is required' });
  }
  
  db.run('INSERT INTO businesses (name, address, phone, lat, lng) VALUES (?, ?, ?, ?, ?)', 
    [name, address, phone, lat || null, lng || null], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('Business created with ID:', this.lastID);
    res.json({ id: this.lastID });
  });
});

// Update business
router.put('/businesses/:id', authenticateToken, (req, res) => {
  const { name, address, phone, lat, lng } = req.body;
  db.run('UPDATE businesses SET name = ?, address = ?, phone = ?, lat = ?, lng = ? WHERE id = ?', 
    [name, address, phone, lat || null, lng || null, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// Delete business
router.delete('/businesses/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM businesses WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// Get contacts for a business
router.get('/businesses/:id/contacts', authenticateToken, (req, res) => {
  db.all('SELECT * FROM contacts WHERE business_id = ? ORDER BY name', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add contact to a business
router.post('/businesses/:id/contacts', authenticateToken, (req, res) => {
  const { name, title, phone, email } = req.body;
  db.run('INSERT INTO contacts (business_id, name, title, phone, email) VALUES (?, ?, ?, ?, ?)', 
    [req.params.id, name, title, phone, email], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// Update a contact
router.put('/contacts/:contactId', authenticateToken, (req, res) => {
  const { name, title, phone, email } = req.body;
  db.run('UPDATE contacts SET name = ?, title = ?, phone = ?, email = ? WHERE id = ?', 
    [name, title, phone, email, req.params.contactId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// Delete a contact
router.delete('/contacts/:contactId', authenticateToken, (req, res) => {
  db.run('DELETE FROM contacts WHERE id = ?', [req.params.contactId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// Get notes for a business (with contact info)
router.get('/businesses/:id/notes', authenticateToken, (req, res) => {
  db.all(`
    SELECT n.*, c.name as contact_name, c.title as contact_title 
    FROM notes n 
    LEFT JOIN contacts c ON n.contact_id = c.id 
    WHERE n.business_id = ? 
    ORDER BY n.created_at DESC
  `, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add note to a business
router.post('/businesses/:id/notes', authenticateToken, (req, res) => {
  const { note, contact_id } = req.body;
  const created_at = new Date().toISOString();
  db.run('INSERT INTO notes (business_id, contact_id, note, created_at) VALUES (?, ?, ?, ?)', 
    [req.params.id, contact_id || null, note, created_at], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, created_at });
  });
});

// Update a note
router.put('/notes/:noteId', authenticateToken, (req, res) => {
  const { note, contact_id } = req.body;
  db.run('UPDATE notes SET note = ?, contact_id = ? WHERE id = ?', 
    [note, contact_id || null, req.params.noteId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// Delete a note
router.delete('/notes/:noteId', authenticateToken, (req, res) => {
  db.run('DELETE FROM notes WHERE id = ?', [req.params.noteId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// Get a business with its contacts and each contact's notes
router.get('/businesses/:id/full', authenticateToken, (req, res) => {
  console.log('GET /businesses/:id/full - ID:', req.params.id);
  
  db.get('SELECT * FROM businesses WHERE id = ?', [req.params.id], (err, business) => {
    if (err) {
      console.error('Error getting business:', err);
      return res.status(500).json({ error: err.message });
    }
    if (!business) {
      console.log('Business not found');
      return res.status(404).json({ error: 'Business not found' });
    }
    
    console.log('Found business:', business.name);
    
    db.all('SELECT * FROM contacts WHERE business_id = ? ORDER BY name', [business.id], (err, contacts) => {
      if (err) {
        console.error('Error getting contacts:', err);
        return res.status(500).json({ error: err.message });
      }
      
      console.log('Found contacts:', contacts ? contacts.length : 0);
      
      // Get all notes for this business (with contact info)
      db.all(`
        SELECT n.*, c.name as contact_name, c.title as contact_title 
        FROM notes n 
        LEFT JOIN contacts c ON n.contact_id = c.id 
        WHERE n.business_id = ? 
        ORDER BY n.created_at DESC
      `, [business.id], (err, notes) => {
        if (err) {
          console.error('Error getting notes:', err);
          return res.status(500).json({ error: err.message });
        }
        
        console.log('Found notes:', notes ? notes.length : 0);
        
        // If no contacts, return business with empty contacts array and notes
        if (!contacts || contacts.length === 0) {
          console.log('No contacts, returning business with empty contacts array and notes');
          return res.json({ ...business, contacts: [], notes: notes || [] });
        }
        
        // Get notes for each contact
        const contactIds = contacts.map(c => c.id);
        const placeholders = contactIds.map(() => '?').join(',');
        
        console.log('Getting notes for contact IDs:', contactIds);
        
        db.all(`SELECT * FROM notes WHERE contact_id IN (${placeholders}) ORDER BY created_at DESC`, contactIds, (err, contactNotes) => {
          if (err) {
            console.error('Error getting contact notes:', err);
            return res.status(500).json({ error: err.message });
          }
          
          console.log('Found contact notes:', contactNotes ? contactNotes.length : 0);
          
          // Attach notes to contacts
          const contactsWithNotes = contacts.map(contact => ({
            ...contact,
            notes: contactNotes.filter(n => n.contact_id === contact.id)
          }));
          
          console.log('Returning business with contacts, contact notes, and business notes');
          res.json({ ...business, contacts: contactsWithNotes, notes: notes || [] });
        });
      });
    });
  });
});

module.exports = router; 