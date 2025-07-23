/**
 * Check Environment Variables
 * Logs all environment variables to see what DigitalOcean provides
 */

console.log('🔍 Checking Environment Variables');
console.log('=================================');

// Log all environment variables (filtered for database-related ones)
const envVars = process.env;
const dbRelatedVars = {};

Object.keys(envVars).forEach(key => {
  if (key.toLowerCase().includes('database') || 
      key.toLowerCase().includes('db') || 
      key.toLowerCase().includes('ca') || 
      key.toLowerCase().includes('ssl') ||
      key.toLowerCase().includes('postgres')) {
    dbRelatedVars[key] = envVars[key];
  }
});

console.log('📋 Database-related environment variables:');
Object.keys(dbRelatedVars).forEach(key => {
  const value = dbRelatedVars[key];
  if (key.toLowerCase().includes('cert') || key.toLowerCase().includes('ca')) {
    console.log(`${key}: ${value ? 'Set (' + value.length + ' chars)' : 'Not set'}`);
    if (value && value.includes('-----BEGIN CERTIFICATE-----')) {
      console.log(`  ✅ Contains valid certificate format`);
    }
  } else {
    console.log(`${key}: ${value ? 'Set' : 'Not set'}`);
  }
});

console.log('\n🔍 All environment variables (first 50):');
Object.keys(envVars).slice(0, 50).forEach(key => {
  console.log(`${key}: ${envVars[key] ? 'Set' : 'Not set'}`);
});

if (Object.keys(envVars).length > 50) {
  console.log(`... and ${Object.keys(envVars).length - 50} more`);
} 