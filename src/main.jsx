import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthGate from './components/AuthGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGate>{({ session, signOut }) => <App session={session} onSignOut={signOut} />}</AuthGate>
  </StrictMode>,
)
