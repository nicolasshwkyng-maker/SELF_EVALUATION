import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Download, Upload, PlusCircle, AlertTriangle, CheckCircle } from 'lucide-react'
import { useInspection } from '../../context/InspectionContext'
import { useCatalog } from '../../context/CatalogContext'
import { exportToJson, importFromJson, triggerPdfDownload, safeFilename } from '../../utils/jsonExport'
import { exportFormatA } from '../../pdf/exportFormatA'
import { exportFormatB } from '../../pdf/exportFormatB'
import { deleteInspection, createEmptyInspection } from '../../db/indexeddb'

function getWarnings(inspection: ReturnType<typeof useInspection>['inspection']): string[] {
  if (!inspection) return []
  const w: string[] = []
  if (!inspection.admin.workshopName) w.push('Sección 0: falta nombre del taller')
  if (!inspection.admin.requestDate) w.push('Sección 0: falta fecha de requerimiento')
  inspection.tools.forEach((t, i) => {
    if (!t.description) w.push(`Sección 3 — Fila ${i + 1}: falta descripción`)
    if (!t.partNumber) w.push(`Sección 3 — Fila ${i + 1}: falta número de parte`)
  })
  inspection.materials.forEach((m, i) => {
    if (!m.description) w.push(`Sección 4 — Fila ${i + 1}: falta descripción`)
    if (!m.partNumberOrReference) w.push(`Sección 4 — Fila ${i + 1}: falta número de parte/referencia`)
  })
  inspection.technicalData.forEach((r, i) => {
    if (!r.publicationDescription) w.push(`Sección 5 — Fila ${i + 1}: falta tipo de publicación`)
    if (!r.reference) w.push(`Sección 5 — Fila ${i + 1}: falta número de referencia`)
  })
  inspection.processes.forEach((r, i) => {
    if (!r.processName) w.push(`Sección 6 — Fila ${i + 1}: falta nombre del proceso`)
    if (!r.reference) w.push(`Sección 6 — Fila ${i + 1}: falta identificación`)
  })
  inspection.trainedPersonnel.forEach((r, i) => {
    if (!r.nameAndJobTitle) w.push(`Sección 7 — Fila ${i + 1}: falta nombre y cargo`)
    if (!r.licenseNumber) w.push(`Sección 7 — Fila ${i + 1}: falta número de licencia`)
  })
  return w
}

function countPhotos(inspection: NonNullable<ReturnType<typeof useInspection>['inspection']>): number {
  return [
    ...inspection.housing, ...inspection.facilities,
    ...inspection.tools, ...inspection.toolsValidation,
    ...inspection.materials, ...inspection.technicalData,
    ...inspection.processes, ...inspection.trainedPersonnel,
    ...inspection.personnelValidation,
  ].reduce((sum, item) => sum + (item.photos?.length ?? 0), 0)
}

export default function SummarySection({ onSectionChange }: { onSectionChange: (i: number) => void }) {
  const { t } = useTranslation()
  const { inspection, update, setInspection } = useInspection()
  const { catalog, setCatalog, syncFromInspection } = useCatalog()
  const [pdfFormat, setPdfFormat] = useState<'A' | 'B'>('A')
  const [showWarnings, setShowWarnings] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  if (!inspection) return null

  const warnings = getWarnings(inspection)
  const totalPhotos = countPhotos(inspection)

  const doPdfExport = async (draft: boolean) => {
    setExporting(true)
    setShowWarnings(false)
    try {
      const bytes = pdfFormat === 'A'
        ? await exportFormatA(inspection, draft)
        : await exportFormatB(inspection, draft)
      const partNumber = safeFilename(inspection.componentId.partNumber.trim())
      triggerPdfDownload(bytes, `SAT-F743 - ${partNumber}.pdf`)
    } catch (e) {
      console.error('PDF export error:', e)
      alert('Error al exportar PDF. Inténtalo de nuevo.')
    } finally {
      setExporting(false)
    }
  }

  const handleExportPdf = () => {
    if (warnings.length > 0) {
      setShowWarnings(true)
    } else {
      doPdfExport(false)
    }
  }

  const handleExportJson = async () => {
    try {
      await exportToJson(inspection, catalog)
    } catch (e) {
      console.error('JSON export error:', e)
    }
  }

  const handleImport = async (file: File) => {
    if (!confirm(t('summary.importConfirm'))) return
    setImporting(true)
    try {
      const { inspection: imported, catalog: importedCatalog } = await importFromJson(file)
      setInspection(imported)
      if (importedCatalog) {
        setCatalog(importedCatalog)
      } else {
        syncFromInspection(imported)
      }
    } catch (e) {
      alert('Error al importar: ' + String(e))
    } finally {
      setImporting(false)
    }
  }

  const handleNewInspection = async () => {
    if (!confirm(t('summary.newInspectionConfirm'))) return
    if (!confirm('¿Confirmas que deseas borrar la inspección actual?')) return
    await deleteInspection()
    setInspection(createEmptyInspection())
    onSectionChange(0)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">{t('summary.title')}</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{totalPhotos}</div>
          <div className="text-xs text-gray-500 mt-1">{t('summary.totalPhotos')}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{warnings.length}</div>
          <div className="text-xs text-gray-500 mt-1">Advertencias</div>
        </div>
      </div>

      {/* Warnings summary */}
      <div className={`rounded-xl border p-4 ${warnings.length === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-2 mb-2">
          {warnings.length === 0
            ? <CheckCircle className="w-4 h-4 text-green-600" />
            : <AlertTriangle className="w-4 h-4 text-amber-600" />
          }
          <span className="text-sm font-semibold text-slate-800">
            {warnings.length === 0 ? t('summary.noWarnings') : `${warnings.length} ${t('summary.warnings')}`}
          </span>
        </div>
        {warnings.length > 0 && (
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-700">• {w}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Observations */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-sm font-semibold text-slate-700 mb-2">{t('summary.observations')}</label>
        <textarea
          value={inspection.observations}
          onChange={(e) => update((prev) => ({ ...prev, observations: e.target.value }))}
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
        />
      </div>

      {/* PDF Format */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">{t('summary.pdfFormat')}</p>
        <div className="space-y-2">
          {(['A', 'B'] as const).map((f) => (
            <label key={f} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                value={f}
                checked={pdfFormat === f}
                onChange={() => setPdfFormat(f)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-slate-700">{t(`summary.format${f}`)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Export PDF */}
      <button
        type="button"
        onClick={handleExportPdf}
        disabled={exporting}
        className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white py-3 rounded-xl font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors"
      >
        <FileText className="w-5 h-5" />
        {exporting ? 'Generando PDF...' : t('summary.exportPdf')}
      </button>

      {/* Warning modal */}
      {showWarnings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-800">Advertencias</h3>
            </div>
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {warnings.map((w, i) => <li key={i} className="text-sm text-amber-700">• {w}</li>)}
            </ul>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowWarnings(false)}
                className="flex-1 border border-gray-300 rounded-xl py-2 text-sm font-medium hover:bg-gray-50"
              >
                {t('summary.backToEdit')}
              </button>
              <button
                type="button"
                onClick={() => { setShowWarnings(false); doPdfExport(true) }}
                className="flex-1 bg-amber-500 text-white rounded-xl py-2 text-sm font-medium hover:bg-amber-600"
              >
                {t('summary.exportDraft')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleExportJson}
          className="flex items-center justify-center gap-2 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          {t('summary.exportJson')}
        </button>
        <button
          type="button"
          onClick={() => importRef.current?.click()}
          disabled={importing}
          className="flex items-center justify-center gap-2 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <Upload className="w-4 h-4" />
          {importing ? 'Importando...' : t('summary.importJson')}
        </button>
      </div>
      <input
        ref={importRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
      />

      {/* New inspection */}
      <button
        type="button"
        onClick={handleNewInspection}
        className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
      >
        <PlusCircle className="w-4 h-4" />
        {t('summary.newInspection')}
      </button>
    </div>
  )
}
