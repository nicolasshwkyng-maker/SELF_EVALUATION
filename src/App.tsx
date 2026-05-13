import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInspection } from './context/InspectionContext'
import { useCatalog } from './context/CatalogContext'
import Layout from './components/Layout'
import AdminSection from './components/sections/AdminSection'
import ComponentSection from './components/sections/ComponentSection'
import HousingSection from './components/sections/HousingSection'
import FacilitiesSection from './components/sections/FacilitiesSection'
import ToolsSection from './components/sections/ToolsSection'
import MaterialsSection from './components/sections/MaterialsSection'
import TechnicalDataSection from './components/sections/TechnicalDataSection'
import ProcessesSection from './components/sections/ProcessesSection'
import PersonnelSection from './components/sections/PersonnelSection'
import ContractSection from './components/sections/ContractSection'
import CatalogSection from './components/sections/CatalogSection'
import SummarySection from './components/sections/SummarySection'
import { importFromJson } from './utils/jsonExport'

function LoadingScreen() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-900">
      <div className="text-center text-white space-y-3">
        <div className="text-2xl font-bold tracking-widest">SAT-F743</div>
        <div className="text-sm text-slate-400">Cargando inspección...</div>
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )
}

export default function App() {
  const [section, setSection] = useState(0)
  const { t } = useTranslation()
  const { loading, setInspection } = useInspection()
  const { setCatalog, syncFromInspection } = useCatalog()

  if (loading) return <LoadingScreen />

  const handleImport = async (file: File) => {
    if (!confirm(t('summary.importConfirm'))) return
    try {
      const { inspection, catalog } = await importFromJson(file)
      setInspection(inspection)
      // If the file included a catalog, restore it; otherwise seed catalog from inspection items
      if (catalog) {
        setCatalog(catalog)
      } else {
        syncFromInspection(inspection)
      }
    } catch (e) {
      alert('Error al importar: ' + String(e))
    }
  }

  const renderSection = () => {
    switch (section) {
      case 0:  return <AdminSection />
      case 1:  return <ComponentSection />
      case 2:  return <HousingSection />
      case 3:  return <FacilitiesSection />
      case 4:  return <ToolsSection />
      case 5:  return <MaterialsSection />
      case 6:  return <TechnicalDataSection />
      case 7:  return <ProcessesSection />
      case 8:  return <PersonnelSection />
      case 9:  return <ContractSection />
      case 10: return <CatalogSection />
      case 11: return <SummarySection onSectionChange={setSection} />
      default: return <AdminSection />
    }
  }

  return (
    <Layout currentSection={section} onSectionChange={setSection} onImport={handleImport}>
      {renderSection()}
    </Layout>
  )
}
