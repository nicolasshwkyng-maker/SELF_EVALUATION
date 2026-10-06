import { useState } from 'react'
import { Trash2, PlusCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'
import { useInspection } from '../../context/InspectionContext'
import ComplianceToggle from '../ComplianceToggle'
import PhotoCapture from '../PhotoCapture'
import PdfCapture from '../PdfCapture'
import type { ToolRow, ValidationQuestion, PhotoEvidence } from '../../types'

const TOOL_KINDS = ['', 'standard', 'special', 'equivalent', 'calibration'] as const
type KindFilter = 'all' | ToolRow['toolKind']
type FilterOption = { id: KindFilter; label: string; count: number }

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
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">#{index + 1}</span>
        </div>
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
      <PdfCapture pdfs={row.pdfs ?? []} onChange={(pdfs) => onChange({ ...row, pdfs })} />
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
      <PdfCapture pdfs={q.pdfs ?? []} onChange={(pdfs) => onChange({ ...q, pdfs })} />
    </div>
  )
}

export default function ToolsSection() {
  const { t } = useTranslation()
  const { inspection, update } = useInspection()
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  if (!inspection) return null

  const kindCount = (k: ToolRow['toolKind']) => inspection.tools.filter((tool) => (tool.toolKind || '') === k).length
  const allOptions: FilterOption[] = [
    { id: 'all', label: t('tools.filter.all'), count: inspection.tools.length },
    ...TOOL_KINDS.filter((k) => k !== '').map((k): FilterOption => ({ id: k, label: t(`tools.kinds.${k}`), count: kindCount(k) })),
    { id: '', label: t('tools.filter.none'), count: kindCount('') },
  ]
  const filterOptions = allOptions.filter((o) => o.id !== '' || o.count > 0 || kindFilter === '')
  const visibleTools = inspection.tools
    .map((row, i) => ({ row, i }))
    .filter(({ row }) => kindFilter === 'all' || (row.toolKind || '') === kindFilter)

  const addTool = () => {
    setKindFilter('all')
    update((prev) => ({
    ...prev,
      tools: [...prev.tools, { id: uuidv4(), description: '', partNumber: '', serialNumber: '', calibrationExpiry: '', toolKind: '', photos: [] }],
    }))
  }

  const updateTool = (i: number, row: ToolRow) =>
    update((prev) => { const tools = [...prev.tools]; tools[i] = row; return { ...prev, tools } })

  const deleteTool = (i: number) =>
    update((prev) => ({ ...prev, tools: prev.tools.filter((_, idx) => idx !== i) }))

  const updateValidation = (i: number, q: ValidationQuestion) =>
    update((prev) => { const tv = [...prev.toolsValidation]; tv[i] = q; return { ...prev, toolsValidation: tv } })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">{t('tools.title')}</h2>

      {inspection.tools.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label={t('tools.toolKind')}>
          {filterOptions.map(({ id, label, count }) => {
            const active = kindFilter === id
            return (
              <button
                key={id || 'none'}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setKindFilter(id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-slate-600 hover:border-blue-400'
                }`}
              >
                {label}
                <span className={`text-xs tabular-nums ${active ? 'text-blue-100' : 'text-gray-400'}`}>{count}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="space-y-3">
        {visibleTools.map(({ row, i }) => (
          <ToolCard
            key={row.id}
            row={row}
            index={i}
            onChange={(r) => updateTool(i, r)}
            onDelete={() => deleteTool(i)}
          />
        ))}
        {inspection.tools.length > 0 && visibleTools.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">{t('tools.filter.empty')}</p>
        )}
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
