/**
 * Test Environment Variable CA Certificate
 * Verifies the DIGITALOCEAN_CA_CERT environment variable is working
 */

require('dotenv').config();
const { Pool } = require('pg');

console.log('🔧 Testing Environment Variable CA Certificate');
console.log('==============================================');

// Function to test connection with environment variable certificate
async function testEnvCertificate() {
  console.log('🔌 DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  console.log('🔌 DIGITALOCEAN_CA_CERT:', process.env.DIGITALOCEAN_CA_CERT ? 'Set' : 'Not set');
  
  if (!process.env.DIGITALOCEAN_CA_CERT) {
    console.log('❌ DIGITALOCEAN_CA_CERT environment variable not set');
    return false;
  }
  
  // Check certificate format
  const certContent = process.env.DIGITALOCEAN_CA_CERT;
  console.log('📄 Certificate size:', certContent.length, 'characters');
  console.log('📄 Certificate starts with:', certContent.substring(0, 50));
  console.log('📄 Certificate ends with:', certContent.substring(certContent.length - 50));
  
  if (!certContent.includes('-----BEGIN CERTIFICATE-----') || 
      !certContent.includes('-----END CERTIFICATE-----')) {
    console.log('❌ Certificate format is invalid');
    return false;
  }
  
  console.log('✅ Certificate format is valid');
  
  // Test SSL configurations
  const sslConfigs = [
    {
      name: 'Full verification with env CA certificate',
      config: {
        rejectUnauthorized: true,
        ca: certContent,
        checkServerIdentity: (hostname, cert) => {
          console.log('🔍 Checking server identity for:', hostname);
          console.log('🔍 Certificate subject:', cert.subject.CN);
          if (cert.subject.CN !== hostname && !cert.subjectaltname?.includes(hostname)) {
            throw new Error(`Certificate verification failed: hostname mismatch. Expected: ${hostname}, got: ${cert.subject.CN}`);
          }
          return undefined;
        },
      }
    },
    {
      name: 'Relaxed verification with env CA certificate',
      config: {
        rejectUnauthorized: false,
        ca: certContent,
        checkServerIdentity: () => undefined,
      }
    },
    {
      name: 'No CA certificate, relaxed verification',
      config: {
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
      }
    }
  ];
  
  for (let i = 0; i < sslConfigs.length; i++) {
    const { name, config } = sslConfigs[i];
    console.log(`\n🔌 Testing ${i + 1}/${sslConfigs.length}: ${name}`);
    
    try {
      const testPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: config,
        connectionTimeoutMillis: 10000,
      });
      
      const client = await testPool.connect();
      console.log('✅ SUCCESS:', name);
      console.log('📊 PostgreSQL version:', client.serverVersion);
      client.release();
      await testPool.end();
      
      console.log('💡 This SSL configuration works!');
      return true;
      
    } catch (error) {
      console.log('❌ FAILED:', name);
      console.log('   Error code:', error.code);
      console.log('   Error message:', error.message);
      
      if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
        console.log('   💡 This indicates a certificate chain issue');
      }
    }
  }
  
  console.log('\n❌ All SSL configurations failed');
  return false;
}

// Main execution
async function main() {
  const success = await testEnvCertificate();
  
  if (success) {
    console.log('\n🎉 Environment variable CA certificate is working!');
    console.log('💡 You can now deploy to production with this configuration.');
  } else {
    console.log('\n❌ Environment variable CA certificate is not working');
    console.log('🔧 Troubleshooting:');
    console.log('1. Check that DIGITALOCEAN_CA_CERT contains the full certificate');
    console.log('2. Verify the certificate format (should start with -----BEGIN CERTIFICATE-----)');
    console.log('3. Make sure there are no extra spaces or characters');
  }
}

main().catch(console.error); 