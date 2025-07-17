const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'crm.sqlite'));

console.log('Adding sample coordinates to existing businesses...');

// Sample coordinates for popular locations
const sampleCoordinates = [
  { name: 'Tech Corp', lat: 37.7749, lng: -122.4194 }, // San Francisco
  { name: 'Global Industries', lat: 40.7128, lng: -74.0060 }, // New York
  { name: 'Innovation Labs', lat: 34.0522, lng: -118.2437 }, // Los Angeles
  { name: 'Startup Inc', lat: 41.8781, lng: -87.6298 }, // Chicago
  { name: 'Digital Solutions', lat: 29.7604, lng: -95.3698 }, // Houston
];

db.serialize(() => {
  // First, let's see what businesses exist
  db.all('SELECT id, name, lat, lng FROM businesses', [], (err, businesses) => {
    if (err) {
      console.error('Error getting businesses:', err);
      return;
    }
    
    console.log('Current businesses:', businesses);
    
    // Update each business with sample coordinates if they don't have any
    businesses.forEach((business, index) => {
      if (!business.lat || !business.lng) {
        const sampleCoord = sampleCoordinates[index % sampleCoordinates.length];
        db.run(
          'UPDATE businesses SET lat = ?, lng = ? WHERE id = ?',
          [sampleCoord.lat, sampleCoord.lng, business.id],
          function(err) {
            if (err) {
              console.error(`Error updating business ${business.id}:`, err);
            } else {
              console.log(`✓ Updated business "${business.name}" with coordinates: ${sampleCoord.lat}, ${sampleCoord.lng}`);
            }
          }
        );
      } else {
        console.log(`Business "${business.name}" already has coordinates: ${business.lat}, ${business.lng}`);
      }
    });
    
    // Show final result
    setTimeout(() => {
      db.all('SELECT id, name, lat, lng FROM businesses', [], (err, finalBusinesses) => {
        if (err) {
          console.error('Error getting final businesses:', err);
        } else {
          console.log('\nFinal businesses with coordinates:');
          finalBusinesses.forEach(b => {
            console.log(`- ${b.name}: ${b.lat}, ${b.lng}`);
          });
        }
        db.close();
      });
    }, 1000);
  });
}); 