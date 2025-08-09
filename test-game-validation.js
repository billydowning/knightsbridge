/**
 * Test the validation system for a specific completed game
 */

const https = require('https');

async function testGameValidation(roomId) {
  console.log(`🧪 Testing validation system for game: ${roomId}`);
  
  // Create a test request to validate the game
  const testData = JSON.stringify({
    roomId: roomId,
    action: 'validate_game'
  });

  const options = {
    hostname: 'knightsbridge-app-35xls.ondigitalocean.app',
    port: 443,
    path: '/api/games/' + roomId + '/validate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': testData.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📡 Validation response (${res.statusCode}):`, data);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error);
      reject(error);
    });

    req.write(testData);
    req.end();
  });
}

async function checkGameData(roomId) {
  console.log(`🔍 Checking game data for: ${roomId}`);
  
  const options = {
    hostname: 'knightsbridge-app-35xls.ondigitalocean.app',
    port: 443,
    path: '/api/games/' + roomId,
    method: 'GET'
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📡 Game data response (${res.statusCode}):`, data);
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
  const roomId = process.argv[2] || 'ROOM-EMDKOQXBH';
  
  try {
    console.log('🎮 Testing validation system for completed game...');
    
    // First check if we can get game data
    await checkGameData(roomId);
    
    // Then try to validate the game
    await testGameValidation(roomId);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main();