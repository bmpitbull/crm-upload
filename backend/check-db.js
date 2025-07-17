const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'crm.sqlite'));

console.log('=== CHECKING DATABASE ===\n');

// Check businesses
db.all('SELECT * FROM businesses', [], (err, rows) => {
  if (err) {
    console.error('Error getting businesses:', err);
  } else {
    console.log('BUSINESSES:', rows);
  }
  
  // Check contacts
  db.all('SELECT * FROM contacts', [], (err, rows) => {
    if (err) {
      console.error('Error getting contacts:', err);
    } else {
      console.log('\nCONTACTS:', rows);
    }
    
    // Check notes
    db.all('SELECT * FROM notes', [], (err, rows) => {
      if (err) {
        console.error('Error getting notes:', err);
      } else {
        console.log('\nNOTES:', rows);
      }
      
      db.close();
    });
  });
}); 