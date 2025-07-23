/**
 * Debug SSL Connection Issues
 * Tests certificate loading and SSL connection in production environment
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

console.log('🔍 Debug SSL Connection Issues');
console.log('================================');

// Function to load and verify CA certificate
function loadCACertificate() {
  try {
    const caPath = path.join(__dirname, 'certs', 'ca-certificate.crt');
    console.log('📁 Certificate path:', caPath);
    console.log('📁 Path exists:', fs.existsSync(caPath));
    
    if (fs.existsSync(caPath)) {
      const certContent = fs.readFileSync(caPath, 'utf8');
      console.log('📄 Certificate size:', certContent.length, 'characters');
      console.log('📄 Certificate starts with:', certContent.substring(0, 50));
      console.log('📄 Certificate ends with:', certContent.substring(certContent.length - 50));
      
      // Verify certificate format
      if (certContent.includes('-----BEGIN CERTIFICATE-----') && 
          certContent.includes('-----END CERTIFICATE-----')) {
        console.log('✅ Certificate format is valid');
        return certContent;
      } else {
        console.log('❌ Certificate format is invalid');
        return undefined;
      }
    }
    
    console.log('❌ Certificate file not found');
    return undefined;
  } catch (error) {
    console.log('❌ Error loading certificate:', error.message);
    return undefined;
  }
}

// Test different SSL configurations
async function testSSLConfigurations() {
  const caCertificate = loadCACertificate();
  
  if (!caCertificate) {
    console.log('❌ Cannot test SSL without CA certificate');
    return;
  }
  
  const sslConfigs = [
    {
      name: 'Full verification with CA certificate',
      config: {
        rejectUnauthorized: true,
        ca: caCertificate,
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
      return config;
      
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
  return null;
}

// Main execution
async function main() {
  console.log('🔌 DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  console.log('🔌 NODE_ENV:', process.env.NODE_ENV);
  
  const workingConfig = await testSSLConfigurations();
  
  if (workingConfig) {
    console.log('\n🎉 Found working SSL configuration:');
    console.log(JSON.stringify(workingConfig, null, 2));
  } else {
    console.log('\n❌ No working SSL configuration found');
  }
}

main().catch(console.error); 