const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'crm.sqlite'));

console.log('Checking businesses in database...');

db.all('SELECT id, name, address, phone, lat, lng FROM businesses', [], (err, businesses) => {
  if (err) {
    console.error('Error getting businesses:', err);
    return;
  }
  
  console.log('\nAll businesses in database:');
  businesses.forEach((business, index) => {
    console.log(`${index + 1}. ${business.name}`);
    console.log(`   Address: ${business.address || 'N/A'}`);
    console.log(`   Phone: ${business.phone || 'N/A'}`);
    console.log(`   Coordinates: ${business.lat}, ${business.lng}`);
    console.log('');
  });
  
  const businessesWithCoords = businesses.filter(b => b.lat && b.lng);
  console.log(`\nBusinesses with coordinates: ${businessesWithCoords.length}/${businesses.length}`);
  
  const businessesWithoutCoords = businesses.filter(b => !b.lat || !b.lng);
  if (businessesWithoutCoords.length > 0) {
    console.log('\nBusinesses without coordinates:');
    businessesWithoutCoords.forEach(b => {
      console.log(`- ${b.name} (ID: ${b.id})`);
    });
  }
  
  db.close();
}); 