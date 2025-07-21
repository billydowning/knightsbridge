import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AnchorProvider } from './AnchorProvider.tsx';

console.log('🚀 Main.tsx loading...');

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

try {
  console.log('🚀 Creating React root...');
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  
  console.log('🚀 Rendering App component...');
  root.render(
    <React.StrictMode>
      <AnchorProvider>
        <App />
      </AnchorProvider>
    </React.StrictMode>,
  );
  console.log('🚀 App rendered successfully!');
} catch (error) {
  console.error('❌ Error in main.tsx:', error);
  // Show error on page
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1>Something went wrong</h1>
      <p>Error: ${error}</p>
      <button onclick="window.location.reload()">Refresh Page</button>
    </div>
  `;
}