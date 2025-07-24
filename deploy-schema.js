/**
 * Database Schema Deployment Script
 * Deploys the complete database schema to the DigitalOcean managed PostgreSQL database
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

async function deploySchema() {
  console.log('🏗️ Deploying database schema to DigitalOcean...');
  console.log('🔗 Backend URL:', BACKEND_URL);
  
  return new Promise((resolve, reject) => {
    const req = https.get(`${BACKEND_URL}/deploy-schema`, (res) => {
      console.log('📡 Schema deployment response status:', res.statusCode);
      console.log('📡 Response headers:', res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📄 Schema deployment response:', data);
        
        if (res.statusCode === 200) {
          console.log('✅ Schema deployment successful!');
          resolve(data);
        } else {
          console.error('❌ Schema deployment failed with status:', res.statusCode);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Schema deployment request failed:', error.message);
      reject(error);
    });
    
    req.setTimeout(120000, () => {
      console.error('❌ Schema deployment request timeout after 120 seconds');
      req.destroy();
      reject(new Error('Schema deployment timeout'));
    });
  });
}

async function main() {
  try {
    // First test the backend health
    await testBackendHealth();
    
    // Then deploy the schema
    await deploySchema();
    
    console.log('🎉 Database setup complete! You can now test the game.');
    console.log('\n🔗 Test URLs:');
    console.log('- Backend Health: https://knightsbridge-app-35xls.ondigitalocean.app/health');
    console.log('- Frontend: https://knightsbridge-chess.vercel.app');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if the backend is deployed and running');
    console.log('2. Verify the DATABASE_URL environment variable is set');
    console.log('3. Check DigitalOcean App Platform logs');
    console.log('4. Ensure the database is accessible from the app');
    console.log('5. Try accessing the health endpoint manually: https://knightsbridge-app-35xls.ondigitalocean.app/health');
    
    process.exit(1);
  }
}

main(); 