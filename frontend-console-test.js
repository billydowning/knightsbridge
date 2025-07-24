// Frontend Console Test Commands
// Copy and paste these commands into the browser console at http://localhost:5173

console.log('🧪 Frontend Environment Test');
console.log('============================');

// Test 1: Check Environment Variables
console.log('📋 Environment Variables:');
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('VITE_WS_URL:', import.meta.env.VITE_WS_URL);
console.log('VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
console.log('MODE:', import.meta.env.MODE);
console.log('DEV:', import.meta.env.DEV);
console.log('PROD:', import.meta.env.PROD);

// Test 2: Check if environment variables are properly set
const envVars = {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_WS_URL: import.meta.env.VITE_WS_URL,
    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL
};

const undefinedVars = Object.entries(envVars).filter(([key, value]) => !value);
const definedVars = Object.entries(envVars).filter(([key, value]) => value);

console.log('✅ Defined variables:', definedVars);
console.log('❌ Undefined variables:', undefinedVars);

// Test 3: Test Backend Connection
console.log('🔗 Testing backend connection...');
fetch('https://knightsbridge-app-35xls.ondigitalocean.app/health')
    .then(response => response.json())
    .then(data => {
        console.log('✅ Backend connection successful:', data);
    })
    .catch(error => {
        console.error('❌ Backend connection failed:', error);
    });

// Test 4: Test WebSocket Connection
console.log('🔌 Testing WebSocket connection...');
const wsUrl = import.meta.env.VITE_WS_URL || 'wss://knightsbridge-app-35xls.ondigitalocean.app';
console.log('WebSocket URL:', wsUrl);

// Note: WebSocket test would need to be done in the actual application
// since it requires Socket.IO client library

console.log('🎯 Test completed! Check the results above.'); 