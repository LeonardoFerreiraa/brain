import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useAppStore } from './store/useAppStore'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__appStore = useAppStore
}

// Use contextBridge
if (typeof window.ipcRenderer !== 'undefined') {
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
}
