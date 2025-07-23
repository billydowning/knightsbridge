/**
 * Test SSL Connection Configuration
 * Verifies the DATABASE_URL format and SSL settings
 */

require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing SSL Connection Configuration...');
console.log('==========================================');

// Check DATABASE_URL format
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

console.log('✅ DATABASE_URL is set');

// Parse and validate DATABASE_URL
try {
  const url = new URL(databaseUrl);
  console.log('✅ DATABASE_URL format is valid');
  console.log('🔌 Host:', url.hostname);
  console.log('🔌 Port:', url.port);
  console.log('🔌 Database:', url.pathname.slice(1));
  console.log('🔌 SSL Mode:', url.searchParams.get('sslmode') || 'not specified');
  
  // Check if SSL mode is correct
  const sslMode = url.searchParams.get('sslmode');
  if (sslMode !== 'require') {
    console.warn('⚠️ SSL mode should be "require" for DigitalOcean managed databases');
    console.warn('🔧 Recommended: Add ?sslmode=require to your DATABASE_URL');
  } else {
    console.log('✅ SSL mode is correctly set to "require"');
  }
  
} catch (error) {
  console.error('❌ DATABASE_URL format is invalid:', error.message);
  process.exit(1);
}

// Test connection with SSL configuration
async function testSSLConnection() {
  console.log('\n🔌 Testing SSL connection...');
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
      ca: undefined,
      checkServerIdentity: () => undefined,
    },
    connectionTimeoutMillis: 30000,
  });
  
  try {
    const client = await pool.connect();
    console.log('✅ SSL connection successful!');
    console.log('✅ Database is accessible');
    
    // Test a simple query
    const result = await client.query('SELECT version()');
    console.log('✅ Database query successful');
    console.log('🔌 PostgreSQL version:', result.rows[0].version.split(' ')[0]);
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 All tests passed! Your database connection is working correctly.');
    
  } catch (error) {
    console.error('❌ SSL connection failed:', error.message);
    console.error('❌ Error code:', error.code);
    
    if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      console.error('\n🔧 SSL Certificate Issue Detected');
      console.error('Current SSL config:');
      console.error('- rejectUnauthorized: false');
      console.error('- checkServerIdentity: disabled');
      console.error('- ca: undefined');
    }
    
    await pool.end();
    process.exit(1);
  }
}

testSSLConnection(); 