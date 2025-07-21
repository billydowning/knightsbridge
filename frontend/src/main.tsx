import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AnchorProvider } from './AnchorProvider.tsx';

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

try {
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  
  root.render(
    <React.StrictMode>
      <AnchorProvider>
        <App />
      </AnchorProvider>
    </React.StrictMode>,
  );
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