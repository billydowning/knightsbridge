/**
 * Simple Backend Connectivity Test
 */

const https = require('https');

const BACKEND_URL = 'https://knightsbridge-app-35xls.ondigitalocean.app';

console.log('🔍 Testing backend connectivity...');
console.log('🔗 URL:', BACKEND_URL);

// Test basic connectivity
const req = https.get(BACKEND_URL, (res) => {
  console.log('📡 Status Code:', res.statusCode);
  console.log('📡 Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response:', data.substring(0, 500) + '...');
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.error('❌ Code:', error.code);
});

req.setTimeout(10000, () => {
  console.error('❌ Timeout after 10 seconds');
  req.destroy();
}); 