const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'crm.sqlite'));

console.log('Adding lat and lng columns to businesses table...');

db.serialize(() => {
  // Check if columns exist
  db.get("PRAGMA table_info(businesses)", [], (err, rows) => {
    if (err) {
      console.error('Error checking table structure:', err);
      return;
    }
    
    // Add lat column if it doesn't exist
    db.run("ALTER TABLE businesses ADD COLUMN lat REAL", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding lat column:', err);
      } else {
        console.log('✓ lat column added (or already exists)');
      }
      
      // Add lng column if it doesn't exist
      db.run("ALTER TABLE businesses ADD COLUMN lng REAL", (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding lng column:', err);
        } else {
          console.log('✓ lng column added (or already exists)');
        }
        
        console.log('Database schema updated successfully!');
        db.close();
      });
    });
  });
}); 