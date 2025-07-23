/**
 * List All Environment Variables
 * Find the correct database resource name
 */

console.log('🔍 All Environment Variables');
console.log('============================');

// List all environment variables
Object.keys(process.env).forEach(key => {
  const value = process.env[key];
  
  // Mask sensitive values
  if (key.toLowerCase().includes('password') || 
      key.toLowerCase().includes('pass') || 
      key.toLowerCase().includes('secret') ||
      key.toLowerCase().includes('key') ||
      key.toLowerCase().includes('token')) {
    console.log(`${key}: ***`);
  } else if (key.toLowerCase().includes('cert') || key.toLowerCase().includes('ca')) {
    console.log(`${key}: ${value ? 'Set (' + value.length + ' chars)' : 'Not set'}`);
  } else {
    console.log(`${key}: ${value}`);
  }
});

console.log('\n🔍 Looking for database-related variables...');
const dbVars = Object.keys(process.env).filter(key => 
  key.toLowerCase().includes('database') || 
  key.toLowerCase().includes('db') || 
  key.toLowerCase().includes('postgres')
);

if (dbVars.length > 0) {
  console.log('Found database-related variables:');
  dbVars.forEach(key => {
    const value = process.env[key];
    if (key.toLowerCase().includes('url')) {
      console.log(`  ${key}: ${value}`);
    } else {
      console.log(`  ${key}: ${value ? 'Set' : 'Not set'}`);
    }
  });
} else {
  console.log('No database-related variables found');
} 