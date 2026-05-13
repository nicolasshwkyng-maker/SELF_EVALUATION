import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/index'
import './index.css'
import App from './App.tsx'
import { InspectionProvider } from './context/InspectionContext'
import { CatalogProvider } from './context/CatalogContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InspectionProvider>
      <CatalogProvider>
        <App />
      </CatalogProvider>
    </InspectionProvider>
  </StrictMode>,
)
