import { Trash2, PlusCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'
import { useInspection } from '../../context/InspectionContext'
import ComplianceToggle from '../ComplianceToggle'
import PhotoCapture from '../PhotoCapture'
import type { ProcessRow, PhotoEvidence } from '../../types'

function ProcessCard({ row, index, onChange, onDelete }: {
  row: ProcessRow
  index: number
  onChange: (r: ProcessRow) => void
  onDelete: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">#{index + 1}</span>
        <button type="button" onClick={onDelete} className="text-red-500 hover:text-red-700 p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            {t('processes.name')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={row.processName}
            onChange={(e) => onChange({ ...row, processName: e.target.value })}
            placeholder="RS/QCM"
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            {t('processes.identification')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={row.reference}
            onChange={(e) => onChange({ ...row, reference: e.target.value })}
            placeholder="SAT-M127"
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{t('processes.revNumber')}</label>
            <input
              type="text"
              value={row.revNumber}
              onChange={(e) => onChange({ ...row, revNumber: e.target.value })}
              placeholder="01"
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{t('processes.revDate')}</label>
            <input
              type="date"
              value={row.revDate}
              onChange={(e) => onChange({ ...row, revDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      </div>
      <PhotoCapture photos={row.photos} onChange={(photos: PhotoEvidence[]) => onChange({ ...row, photos })} />
    </div>
  )
}

export default function ProcessesSection() {
  const { t } = useTranslation()
  const { inspection, update } = useInspection()
  if (!inspection) return null

  const addRow = () => update((prev) => ({
    ...prev,
    processes: [...prev.processes, { id: uuidv4(), processName: '', reference: '', revNumber: '', revDate: '', photos: [] }],
  }))

  const updateRow = (i: number, row: ProcessRow) =>
    update((prev) => { const processes = [...prev.processes]; processes[i] = row; return { ...prev, processes } })

  const deleteRow = (i: number) =>
    update((prev) => ({ ...prev, processes: prev.processes.filter((_, idx) => idx !== i) }))

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">{t('processes.title')}</h2>
      <div className="space-y-3">
        {inspection.processes.map((row, i) => (
          <ProcessCard key={row.id} row={row} index={i} onChange={(r) => updateRow(i, r)} onDelete={() => deleteRow(i)} />
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-xl py-3 hover:bg-blue-50 transition-colors text-sm font-medium"
      >
        <PlusCircle className="w-4 h-4" />
        {t('processes.addRow')}
      </button>
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">{t('processes.sectionVerify')}:</span>
        <ComplianceToggle
          value={inspection.sectionVerify.processes}
          onChange={(v) => update((prev) => ({ ...prev, sectionVerify: { ...prev.sectionVerify, processes: v } }))}
          showNa={false}
        />
      </div>
    </div>
  )
}
