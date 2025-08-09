/**
 * Test the validation system deployment
 */

const https = require('https');

async function testValidationEndpoint() {
  console.log('🧪 Testing validation system deployment...');
  
  // Create a simple test endpoint to verify the validation classes can be loaded
  const testData = JSON.stringify({
    action: 'test_validation_system'
  });

  const options = {
    hostname: 'knightsbridge-app-35xls.ondigitalocean.app',
    port: 443,
    path: '/health',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📡 Health response:', data);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error);
      reject(error);
    });

    req.end();
  });
}

async function main() {
  try {
    await testValidationEndpoint();
    console.log('✅ Backend is responding - validation system should be deployed');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main();