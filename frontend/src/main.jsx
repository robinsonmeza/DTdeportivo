import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#161929',
            color: '#e8eaf6',
            border: '1px solid rgba(108,99,255,0.3)',
            borderRadius: '10px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#00d4aa', secondary: '#0a0d1a' } },
          error:   { iconTheme: { primary: '#ff4757', secondary: '#0a0d1a' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
