import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { I18nProvider } from './i18n/I18nProvider'
import { initializeAnalytics } from './analytics/tracker'
import './landscape.css'
import './styles/kitchen.css'
import './styles/playtest.css'

initializeAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
