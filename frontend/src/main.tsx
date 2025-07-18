import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AnchorProvider } from './AnchorProvider.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AnchorProvider>
      <App />
    </AnchorProvider>
  </React.StrictMode>,
)