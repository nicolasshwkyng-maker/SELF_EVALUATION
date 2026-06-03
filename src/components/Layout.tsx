import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderOpen, ArrowUp } from 'lucide-react'
import { useInspection } from '../context/InspectionContext'
import ProgressBar from './ProgressBar'
import LanguageToggle from './LanguageToggle'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  currentSection: number
  onSectionChange: (i: number) => void
  onImport: (file: File) => void
}

const NAV_KEYS = [
  'nav.admin',
  'nav.component',
  'nav.housing',
  'nav.facilities',
  'nav.tools',
  'nav.materials',
  'nav.techData',
  'nav.processes',
  'nav.personnel',
  'nav.contract',
  'nav.catalog',
  'nav.summary',
]

export default function Layout({ children, currentSection, onSectionChange, onImport }: Props) {
  const { t } = useTranslation()
  const { inspection, saveStatus } = useInspection()
  const importRef = useRef<HTMLInputElement>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 200)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const statusColor = saveStatus === 'saved' ? 'text-green-300' : saveStatus === 'saving' ? 'text-yellow-300' : saveStatus === 'error' ? 'text-red-300' : 'text-slate-400'

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      {/* Header + Nav sticky wrapper */}
      <div className="sticky top-0 z-20 shadow-lg">
      {/* Header */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-3 py-2">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <div className="text-xs font-bold tracking-widest text-slate-300 uppercase">CODE: SAT-F743</div>
              <div className="text-sm font-semibold leading-tight truncate max-w-[200px]">
                {inspection?.componentId.partNumber || t('appShort')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${statusColor}`}>{t(`status.${saveStatus === 'idle' ? 'saved' : saveStatus}`)}</span>
              <button
                type="button"
                title="Abrir JSON / Open JSON"
                onClick={() => importRef.current?.click()}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Abrir</span>
              </button>
              <input
                ref={importRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) { onImport(file); e.target.value = '' }
                }}
              />
              <LanguageToggle />
            </div>
          </div>
          {inspection && (
            <ProgressBar inspection={inspection} currentSection={currentSection} />
          )}
        </div>
      </header>

      {/* Section nav */}
      <nav className="bg-slate-800 text-white overflow-x-auto">
        <div className="flex w-max min-w-full">
          {NAV_KEYS.map((key, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSectionChange(i)}
              className={`px-3 py-2 text-xs whitespace-nowrap border-b-2 transition-colors ${
                currentSection === i
                  ? 'border-blue-400 text-blue-300 font-semibold'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              {t(key)}
            </button>
          ))}
        </div>
      </nav>
      </div>{/* end sticky wrapper */}

      {/* Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-3 py-4">
        {children}
      </main>

      {/* Scroll-to-top button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Ir arriba"
          className="fixed bottom-20 right-4 z-30 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full w-11 h-11 flex items-center justify-center shadow-lg transition-all duration-200"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Bottom nav */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-up">
        <div className="max-w-3xl mx-auto flex justify-between px-4 py-2">
          <button
            type="button"
            disabled={currentSection === 0}
            onClick={() => onSectionChange(currentSection - 1)}
            className="px-4 py-2 text-sm font-medium text-slate-600 disabled:opacity-30 hover:bg-slate-100 rounded-lg transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-xs text-gray-400 self-center">{currentSection + 1} / {NAV_KEYS.length}</span>

          <button
            type="button"
            disabled={currentSection === NAV_KEYS.length - 1}
            onClick={() => onSectionChange(currentSection + 1)}
            className="px-4 py-2 text-sm font-medium text-blue-600 disabled:opacity-30 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  )
}
