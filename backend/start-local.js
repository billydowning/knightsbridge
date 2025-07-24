#!/usr/bin/env node

/**
 * Start local backend with production database
 * This script sets up the environment variables for local testing
 */

// Set environment variables for local testing
process.env.DATABASE_URL = 'postgresql://doadmin:show-password@chess-db-do-user-24118504-0.f.db.ondigitalocean.com:25060/defaultdb';
process.env.NODE_ENV = 'development';
process.env.PORT = '3001';
process.env.DEBUG = 'true';

console.log('🚀 Starting local backend with production database...');
console.log('📋 Environment variables set:');
console.log('  - DATABASE_URL: Configured');
console.log('  - NODE_ENV: development');
console.log('  - PORT: 3001');
console.log('  - DEBUG: true');
console.log('');

// Check if we need CA certificate
console.log('⚠️  IMPORTANT: You may need the DigitalOcean CA certificate');
console.log('   If you get SSL connection errors, you need to:');
console.log('   1. Download CA certificate from DigitalOcean database dashboard');
console.log('   2. Save it as: backend/certs/ca-certificate.crt');
console.log('   3. Or set DIGITALOCEAN_CA_CERT environment variable');
console.log('');

// Start the server
require('./server.js'); 