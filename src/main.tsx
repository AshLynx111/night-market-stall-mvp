import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './landscape.css'
import './styles/kitchen.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
