const axios = require('axios');

console.log('Testing mobile connection...');
console.log('Your computer IP: 10.1.10.170');
console.log('');

// Test backend connection
async function testBackend() {
  try {
    console.log('Testing backend connection...');
    const response = await axios.get('http://10.1.10.170:3000/api/businesses');
    console.log('✅ Backend is accessible');
    console.log('Response status:', response.status);
  } catch (error) {
    console.log('❌ Backend connection failed');
    console.log('Error:', error.message);
  }
}

// Test frontend connection
async function testFrontend() {
  try {
    console.log('\nTesting frontend connection...');
    const response = await axios.get('http://10.1.10.170:3002');
    console.log('✅ Frontend is accessible');
    console.log('Response status:', response.status);
  } catch (error) {
    console.log('❌ Frontend connection failed');
    console.log('Error:', error.message);
  }
}

async function runTests() {
  await testBackend();
  await testFrontend();
  
  console.log('\n📱 Mobile Access Instructions:');
  console.log('1. Make sure your phone is on the same WiFi network');
  console.log('2. Open browser on your phone');
  console.log('3. Go to: http://10.1.10.170:3002');
  console.log('4. Try logging in with your credentials');
  console.log('');
  console.log('🔧 Troubleshooting:');
  console.log('- Check Windows Firewall settings');
  console.log('- Ensure both devices are on same network');
  console.log('- Try different browsers on phone');
}

runTests(); 