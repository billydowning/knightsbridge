/**
 * Database Schema Deployment Script
 * Deploys the complete database schema to the DigitalOcean managed PostgreSQL database
 */

const https = require('https');

const BACKEND_URL = 'https://knightsbridge-vtfhf.ondigitalocean.app';

async function deploySchema() {
  console.log('🏗️ Deploying database schema to DigitalOcean...');
  console.log('🔗 Backend URL:', BACKEND_URL);
  
  return new Promise((resolve, reject) => {
    const req = https.get(`${BACKEND_URL}/deploy-schema`, (res) => {
      console.log('📡 Response status:', res.statusCode);
      console.log('📡 Response headers:', res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📄 Response body:', data);
        
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
      console.error('❌ Request failed:', error.message);
      reject(error);
    });
    
    req.setTimeout(60000, () => {
      console.error('❌ Request timeout after 60 seconds');
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  return new Promise((resolve, reject) => {
    const req = https.get(`${BACKEND_URL}/test-db`, (res) => {
      console.log('📡 Test response status:', res.statusCode);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📄 Test response:', data);
        
        if (res.statusCode === 200) {
          console.log('✅ Database connection test successful!');
          resolve(data);
        } else {
          console.error('❌ Database connection test failed');
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Test request failed:', error.message);
      reject(error);
    });
    
    req.setTimeout(30000, () => {
      console.error('❌ Test request timeout');
      req.destroy();
      reject(new Error('Test timeout'));
    });
  });
}

async function main() {
  try {
    // First test the connection
    await testDatabaseConnection();
    
    // Then deploy the schema
    await deploySchema();
    
    console.log('🎉 Database setup complete! You can now test the game.');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if the backend is deployed and running');
    console.log('2. Verify the DATABASE_URL environment variable is set');
    console.log('3. Check DigitalOcean App Platform logs');
    console.log('4. Ensure the database is accessible from the app');
    
    process.exit(1);
  }
}

main(); 