const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'crm.sqlite'));

console.log('=== ADDING SAMPLE DATA ===\n');

// Add a sample business
db.run('INSERT INTO businesses (name, address, phone, lat, lng) VALUES (?, ?, ?, ?, ?)', 
  ['Sample Business', '123 Main St, City, State', '555-123-4567', 37.7749, -122.4194], function(err) {
  if (err) {
    console.error('Error adding business:', err);
  } else {
    const businessId = this.lastID;
    console.log('Added business with ID:', businessId);
    
    // Add sample contacts
    db.run('INSERT INTO contacts (business_id, name, title, phone, email) VALUES (?, ?, ?, ?, ?)', 
      [businessId, 'John Smith', 'Manager', '555-111-2222', 'john@sample.com'], function(err) {
      if (err) {
        console.error('Error adding contact:', err);
      } else {
        const contactId = this.lastID;
        console.log('Added contact with ID:', contactId);
        
        // Add sample notes
        db.run('INSERT INTO notes (business_id, contact_id, note, created_at) VALUES (?, ?, ?, ?)', 
          [businessId, contactId, 'First meeting with John went well. He seems interested in our services.', new Date().toISOString()], function(err) {
          if (err) {
            console.error('Error adding note:', err);
          } else {
            console.log('Added note with ID:', this.lastID);
          }
          
          // Add another contact
          db.run('INSERT INTO contacts (business_id, name, title, phone, email) VALUES (?, ?, ?, ?, ?)', 
            [businessId, 'Jane Doe', 'Assistant', '555-333-4444', 'jane@sample.com'], function(err) {
            if (err) {
              console.error('Error adding second contact:', err);
            } else {
              const contactId2 = this.lastID;
              console.log('Added second contact with ID:', contactId2);
              
              // Add another note
              db.run('INSERT INTO notes (business_id, contact_id, note, created_at) VALUES (?, ?, ?, ?)', 
                [businessId, contactId2, 'Follow up with Jane about the proposal next week.', new Date().toISOString()], function(err) {
                if (err) {
                  console.error('Error adding second note:', err);
                } else {
                  console.log('Added second note with ID:', this.lastID);
                }
                
                console.log('\n=== SAMPLE DATA ADDED ===');
                console.log('Business ID:', businessId);
                console.log('Contact IDs:', contactId, contactId2);
                db.close();
              });
            }
          });
        });
      }
    });
  }
}); 