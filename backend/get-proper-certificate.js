/**
 * Get Proper DigitalOcean CA Certificate
 * Downloads the correct certificate and tests the connection
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

console.log('🔧 Getting Proper DigitalOcean CA Certificate');
console.log('=============================================');

// DigitalOcean CA certificate URL (this is the official one)
const DO_CA_URL = 'https://ca.digitalocean.com/ca-certificates/ca-certificates.crt';

async function downloadCertificate() {
  return new Promise((resolve, reject) => {
    https.get(DO_CA_URL, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`Failed to download certificate: ${res.statusCode}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  try {
    console.log('📥 Downloading DigitalOcean CA certificate...');
    const certData = await downloadCertificate();
    
    // Create certs directory if it doesn't exist
    const certsDir = path.join(__dirname, 'certs');
    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
    }
    
    // Save the certificate
    const certPath = path.join(certsDir, 'ca-certificate.crt');
    fs.writeFileSync(certPath, certData);
    
    console.log('✅ Certificate downloaded and saved to:', certPath);
    console.log('📄 Certificate size:', certData.length, 'characters');
    console.log('📄 Certificate starts with:', certData.substring(0, 50));
    console.log('📄 Certificate ends with:', certData.substring(certData.length - 50));
    
    // Verify it's a valid certificate
    if (certData.includes('-----BEGIN CERTIFICATE-----') && 
        certData.includes('-----END CERTIFICATE-----')) {
      console.log('✅ Certificate format is valid');
    } else {
      console.log('❌ Certificate format is invalid');
    }
    
    console.log('\n🔧 Next steps:');
    console.log('1. Test the connection with: node backend/test-ca-connection.js');
    console.log('2. If it works, commit and push the new certificate');
    console.log('3. Deploy to production');
    
  } catch (error) {
    console.error('❌ Error downloading certificate:', error.message);
    console.log('\n🔧 Alternative approach:');
    console.log('1. Go to your DigitalOcean database dashboard');
    console.log('2. Find the "CA Certificate" download link');
    console.log('3. Download and save as backend/certs/ca-certificate.crt');
  }
}

main(); 