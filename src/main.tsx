import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import i18n from './i18n/index'
import './index.css'
import App from './App.tsx'
import { InspectionProvider } from './context/InspectionContext'
import { installStaleBuildReload } from './utils/appUpdate'

installStaleBuildReload(() => i18n.t('app.updateReload'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InspectionProvider>
      <App />
    </InspectionProvider>
  </StrictMode>,
)
