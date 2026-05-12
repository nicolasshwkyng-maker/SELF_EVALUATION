import { Trash2, PlusCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'
import { useInspection } from '../../context/InspectionContext'
import ComplianceToggle from '../ComplianceToggle'
import PhotoCapture from '../PhotoCapture'
import type { ToolRow, ValidationQuestion, PhotoEvidence } from '../../types'

const TOOL_KINDS = ['', 'standard', 'special', 'equivalent', 'calibration'] as const

function ToolCard({ row, index, onChange, onDelete }: {
  row: ToolRow
  index: number
  onChange: (r: ToolRow) => void
  onDelete: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">#{index + 1}</span>
        <button
          type="button"
          onClick={onDelete}
          className="text-red-500 hover:text-red-700 p-1"
          title={t('common.delete')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            {t('tools.description')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={row.description}
            onChange={(e) => onChange({ ...row, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            {t('tools.partNumber')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={row.partNumber}
            onChange={(e) => onChange({ ...row, partNumber: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">{t('tools.serialNumber')}</label>
          <input
            type="text"
            value={row.serialNumber}
            onChange={(e) => onChange({ ...row, serialNumber: e.target.value })}
            placeholder="N/A"
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">{t('tools.calibrationExpiry')}</label>
          <input
            type="date"
            value={row.calibrationExpiry}
            onChange={(e) => onChange({ ...row, calibrationExpiry: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">{t('tools.toolKind')}</label>
          <select
            value={row.toolKind}
            onChange={(e) => onChange({ ...row, toolKind: e.target.value as ToolRow['toolKind'] })}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {TOOL_KINDS.map((k) => (
              <option key={k} value={k}>{k ? t(`tools.kinds.${k}`) : '—'}</option>
            ))}
          </select>
        </div>
      </div>
      <PhotoCapture photos={row.photos} onChange={(photos: PhotoEvidence[]) => onChange({ ...row, photos })} />
    </div>
  )
}

function ValidationCard({ q, onChange }: {
  q: ValidationQuestion
  onChange: (q: ValidationQuestion) => void
}) {
  const { i18n } = useTranslation()
  const question = i18n.language === 'en' ? q.questionEn : q.questionEs

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-slate-800">{question}</p>
        <ComplianceToggle value={q.answer} onChange={(v) => onChange({ ...q, answer: v })} showNa={false} />
      </div>
      <PhotoCapture photos={q.photos} onChange={(photos: PhotoEvidence[]) => onChange({ ...q, photos })} />
    </div>
  )
}

export default function ToolsSection() {
  const { t } = useTranslation()
  const { inspection, update } = useInspection()
  if (!inspection) return null

  const addTool = () => update((prev) => ({
    ...prev,
    tools: [...prev.tools, { id: uuidv4(), description: '', partNumber: '', serialNumber: '', calibrationExpiry: '', toolKind: '', photos: [] }],
  }))

  const updateTool = (i: number, row: ToolRow) =>
    update((prev) => { const tools = [...prev.tools]; tools[i] = row; return { ...prev, tools } })

  const deleteTool = (i: number) =>
    update((prev) => ({ ...prev, tools: prev.tools.filter((_, idx) => idx !== i) }))

  const updateValidation = (i: number, q: ValidationQuestion) =>
    update((prev) => { const tv = [...prev.toolsValidation]; tv[i] = q; return { ...prev, toolsValidation: tv } })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">{t('tools.title')}</h2>

      <div className="space-y-3">
        {inspection.tools.map((row, i) => (
          <ToolCard key={row.id} row={row} index={i} onChange={(r) => updateTool(i, r)} onDelete={() => deleteTool(i)} />
        ))}
      </div>

      <button
        type="button"
        onClick={addTool}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-xl py-3 hover:bg-blue-50 transition-colors text-sm font-medium"
      >
        <PlusCircle className="w-4 h-4" />
        {t('tools.addTool')}
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">{t('tools.sectionVerify')}:</span>
        <ComplianceToggle
          value={inspection.sectionVerify.tools}
          onChange={(v) => update((prev) => ({ ...prev, sectionVerify: { ...prev.sectionVerify, tools: v } }))}
          showNa={false}
        />
      </div>

      <h3 className="text-base font-bold text-slate-800 pt-2">{t('tools.validation.title')}</h3>
      <div className="space-y-3">
        {inspection.toolsValidation.map((q, i) => (
          <ValidationCard key={q.id} q={q} onChange={(u) => updateValidation(i, u)} />
        ))}
      </div>
    </div>
  )
}
