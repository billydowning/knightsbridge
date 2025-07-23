/**
 * Debug Environment Variables
 * Check what's actually in the DATABASE_URL
 */

console.log('🔍 Debug Environment Variables');
console.log('==============================');

console.log('🔌 DATABASE_URL:', process.env.DATABASE_URL);
console.log('🔌 DATABASE_CA_CERT:', process.env.DATABASE_CA_CERT ? 'Set (' + process.env.DATABASE_CA_CERT.length + ' chars)' : 'Not set');
console.log('🔌 NODE_ENV:', process.env.NODE_ENV);
console.log('🔌 PORT:', process.env.PORT);
console.log('🔌 DEBUG:', process.env.DEBUG);

// Check if DATABASE_URL is properly formatted
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log('✅ DATABASE_URL parsed successfully:');
    console.log('   Protocol:', url.protocol);
    console.log('   Hostname:', url.hostname);
    console.log('   Port:', url.port);
    console.log('   Database:', url.pathname);
    console.log('   Username:', url.username);
    console.log('   Password:', url.password ? '***' : 'Not set');
    console.log('   Search params:', url.search);
  } catch (error) {
    console.log('❌ DATABASE_URL parsing failed:', error.message);
    console.log('   Raw value:', process.env.DATABASE_URL);
  }
} else {
  console.log('❌ DATABASE_URL is not set');
}

// List all environment variables that might be database-related
console.log('\n🔍 All environment variables (filtered):');
Object.keys(process.env).forEach(key => {
  if (key.toLowerCase().includes('database') || 
      key.toLowerCase().includes('db') || 
      key.toLowerCase().includes('postgres') ||
      key.toLowerCase().includes('ca')) {
    const value = process.env[key];
    if (key.toLowerCase().includes('password') || key.toLowerCase().includes('pass')) {
      console.log(`${key}: ***`);
    } else {
      console.log(`${key}: ${value}`);
    }
  }
}); 