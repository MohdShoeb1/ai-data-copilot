import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { startKeepAlive } from './keepAlive.js'

// Start pinging backend
startKeepAlive();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
