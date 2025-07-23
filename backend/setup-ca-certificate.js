/**
 * Setup DigitalOcean CA Certificate
 * This script helps download and configure the CA certificate for SSL connections
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 DigitalOcean CA Certificate Setup');
console.log('=====================================');

// Create certs directory if it doesn't exist
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
  console.log('✅ Created certs directory');
}

const caCertPath = path.join(certsDir, 'ca-certificate.crt');

console.log('\n📋 Instructions:');
console.log('1. Go to your DigitalOcean database dashboard');
console.log('2. Find the "CA Certificate" download link');
console.log('3. Download the certificate file');
console.log('4. Save it as: ' + caCertPath);
console.log('5. Or set the DIGITALOCEAN_CA_CERT environment variable with the certificate content');

console.log('\n🔍 Current status:');
if (fs.existsSync(caCertPath)) {
  const stats = fs.statSync(caCertPath);
  console.log('✅ CA certificate found at:', caCertPath);
  console.log('📅 Last modified:', stats.mtime);
  console.log('📏 Size:', stats.size, 'bytes');
  
  // Read and display certificate info
  try {
    const certContent = fs.readFileSync(caCertPath, 'utf8');
    console.log('📄 Certificate content preview:');
    console.log(certContent.substring(0, 200) + '...');
  } catch (error) {
    console.log('⚠️ Could not read certificate file:', error.message);
  }
} else {
  console.log('❌ CA certificate not found at:', caCertPath);
}

if (process.env.DIGITALOCEAN_CA_CERT) {
  console.log('✅ DIGITALOCEAN_CA_CERT environment variable is set');
  console.log('📏 Certificate content length:', process.env.DIGITALOCEAN_CA_CERT.length, 'characters');
} else {
  console.log('❌ DIGITALOCEAN_CA_CERT environment variable not set');
}

console.log('\n🚀 Next steps:');
console.log('1. Download the CA certificate from DigitalOcean');
console.log('2. Save it to the certs directory or set the environment variable');
console.log('3. Redeploy your application');
console.log('4. Test the database connection');

console.log('\n💡 Alternative: Set environment variable in DigitalOcean App Platform');
console.log('   Variable name: DIGITALOCEAN_CA_CERT');
console.log('   Value: The entire certificate content (including BEGIN and END lines)'); 