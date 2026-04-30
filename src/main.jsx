import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { registerCommuteNotificationListeners } from './utils/registerCommuteNotificationListeners'
import App from './App.jsx'
import './index.css'

registerCommuteNotificationListeners()

ReactDOM.createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
)
