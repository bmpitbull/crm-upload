const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'crm.sqlite'));

console.log('=== FIXING DATABASE SCHEMA ===\n');

// Check if contact_id column exists in notes table
db.get("PRAGMA table_info(notes)", [], (err, rows) => {
  if (err) {
    console.error('Error checking table schema:', err);
  } else {
    console.log('Current notes table columns:', rows);
    
    // Add contact_id column if it doesn't exist
    db.run('ALTER TABLE notes ADD COLUMN contact_id INTEGER', function(err) {
      if (err) {
        console.log('contact_id column already exists or error:', err.message);
      } else {
        console.log('Added contact_id column to notes table');
      }
      
      // Recreate the tables with proper schema
      console.log('\nRecreating tables with proper schema...');
      
      db.run('DROP TABLE IF EXISTS notes', function(err) {
        if (err) console.error('Error dropping notes table:', err);
        
        db.run(`CREATE TABLE notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          business_id INTEGER,
          contact_id INTEGER,
          note TEXT,
          created_at TEXT,
          FOREIGN KEY(business_id) REFERENCES businesses(id),
          FOREIGN KEY(contact_id) REFERENCES contacts(id)
        )`, function(err) {
          if (err) {
            console.error('Error creating notes table:', err);
          } else {
            console.log('Recreated notes table with proper schema');
          }
          
          db.close();
        });
      });
    });
  }
}); 