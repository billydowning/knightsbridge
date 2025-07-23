/**
 * Test CA Certificate Connection
 * Tests the database connection using the DigitalOcean CA certificate
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Function to load CA certificate (same as in database.js)
function loadCACertificate() {
  try {
    // Try to load the CA certificate from the certs directory
    const caPath = path.join(__dirname, 'certs', 'ca-certificate.crt');
    if (fs.existsSync(caPath)) {
      console.log('✅ Loading CA certificate from:', caPath);
      return fs.readFileSync(caPath);
    }
    
    // Fallback: try environment variable
    if (process.env.DIGITALOCEAN_CA_CERT) {
      console.log('✅ Loading CA certificate from environment variable');
      return process.env.DIGITALOCEAN_CA_CERT;
    }
    
    console.log('⚠️ No CA certificate found, using default SSL configuration');
    return undefined;
  } catch (error) {
    console.log('⚠️ Error loading CA certificate:', error.message);
    return undefined;
  }
}

async function testCAConnection() {
  console.log('🔧 Testing CA Certificate Connection');
  console.log('====================================');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    return false;
  }
  
  const caCertificate = loadCACertificate();
  
  // Parse the DATABASE_URL
  const url = new URL(process.env.DATABASE_URL);
  console.log('🔌 Database host:', url.hostname);
  console.log('🔌 Database port:', url.port);
  console.log('🔌 Database name:', url.pathname.slice(1));
  console.log('🔌 CA Certificate:', caCertificate ? 'Loaded' : 'Not found');
  
  // Test different SSL configurations
  const sslConfigs = [
    {
      name: 'Full verification with CA certificate',
      config: {
        rejectUnauthorized: true,
        ca: caCertificate,
        checkServerIdentity: (hostname, cert) => {
          if (cert.subject.CN !== hostname && !cert.subjectaltname?.includes(hostname)) {
            throw new Error(`Certificate verification failed: hostname mismatch. Expected: ${hostname}, got: ${cert.subject.CN}`);
          }
          return undefined;
        },
      }
    },
    {
      name: 'Relaxed verification with CA certificate',
      config: {
        rejectUnauthorized: false,
        ca: caCertificate,
        checkServerIdentity: () => undefined,
      }
    },
    {
      name: 'No CA certificate, relaxed verification',
      config: {
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
      }
    },
    {
      name: 'No SSL verification',
      config: false
    }
  ];
  
  for (let i = 0; i < sslConfigs.length; i++) {
    const { name, config } = sslConfigs[i];
    console.log(`\n🔌 Testing ${i + 1}/${sslConfigs.length}: ${name}`);
    
    try {
      const pool = new Pool({
        host: url.hostname,
        port: url.port,
        database: url.pathname.slice(1),
        user: url.username,
        password: url.password,
        ssl: config,
        connectionTimeoutMillis: 10000,
      });
      
      const client = await pool.connect();
      console.log(`✅ SUCCESS: ${name}`);
      
      // Test a simple query
      const result = await client.query('SELECT version()');
      console.log('📊 PostgreSQL version:', result.rows[0].version);
      
      client.release();
      await pool.end();
      
      console.log('🎉 Connection test completed successfully!');
      console.log('💡 This SSL configuration works and can be used in your application.');
      return true;
      
    } catch (error) {
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error code: ${error.code}`);
      console.log(`   Error message: ${error.message}`);
      
      if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
        console.log('   💡 This indicates a certificate chain issue - CA certificate needed');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('   💡 Connection refused - check if database is accessible');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('   💡 Connection timeout - check network connectivity');
      }
    }
  }
  
  console.log('\n❌ All SSL configurations failed');
  console.log('🔧 Troubleshooting steps:');
  console.log('1. Download the CA certificate from DigitalOcean dashboard');
  console.log('2. Save it as backend/certs/ca-certificate.crt');
  console.log('3. Or set DIGITALOCEAN_CA_CERT environment variable');
  console.log('4. Check your DATABASE_URL format');
  console.log('5. Verify database is accessible from your deployment');
  
  return false;
}

// Run the test
if (require.main === module) {
  testCAConnection()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test failed with error:', error);
      process.exit(1);
    });
}

module.exports = { testCAConnection }; 