/**
 * 🚛 TOYOTA RELIABILITY: Safe Database Migration Deployment
 * Applies database migrations without destroying existing data
 */

const https = require('https');

const BACKEND_URL = 'https://knightsbridge-app-35xls.ondigitalocean.app';

async function testBackendHealth() {
  console.log('🔍 Testing backend health...');
  
  return new Promise((resolve, reject) => {
    const req = https.get(`${BACKEND_URL}/health`, (res) => {
      console.log('📡 Health check response status:', res.statusCode);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📄 Health check response:', data);
        
        if (res.statusCode === 200) {
          console.log('✅ Backend is healthy and running!');
          resolve(data);
        } else {
          console.error('❌ Backend health check failed');
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Health check request failed:', error.message);
      reject(error);
    });
    
    req.setTimeout(30000, () => {
      console.error('❌ Health check request timeout');
      req.destroy();
      reject(new Error('Health check timeout'));
    });
  });
}

async function runMigrations() {
  console.log('🚛 Running safe database migrations...');
  console.log('🔗 Backend URL:', BACKEND_URL);
  
  return new Promise((resolve, reject) => {
    const req = https.get(`${BACKEND_URL}/migrate-database`, (res) => {
      console.log('📡 Migration response status:', res.statusCode);
      console.log('📡 Response headers:', res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📄 Migration response:', data);
        
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            if (response.success) {
              console.log('✅ Migrations completed successfully!');
              console.log(`📊 Applied: ${response.migrationsApplied}/${response.totalMigrations} migrations`);
              resolve(response);
            } else {
              console.error('❌ Migration failed:', response.error);
              reject(new Error(`Migration failed: ${response.error}`));
            }
          } catch (parseError) {
            console.error('❌ Failed to parse migration response:', parseError);
            reject(parseError);
          }
        } else {
          console.error('❌ Migration request failed');
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Migration request failed:', error.message);
      reject(error);
    });
    
    req.setTimeout(120000, () => {
      console.error('❌ Migration request timeout after 120 seconds');
      req.destroy();
      reject(new Error('Migration timeout'));
    });
  });
}

async function main() {
  try {
    // First check backend health
    await testBackendHealth();
    
    // Run safe migrations
    await runMigrations();
    
    console.log('🎉 Database migration complete! No data was lost.');
    console.log('');
    console.log('🔗 Test URLs:');
    console.log('- Backend Health:', `${BACKEND_URL}/health`);
    console.log('- Frontend: https://knightsbridge-chess.vercel.app');
    
  } catch (error) {
    console.error('❌ Migration process failed:', error.message);
    process.exit(1);
  }
}

main();