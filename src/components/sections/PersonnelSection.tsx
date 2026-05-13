import { Trash2, PlusCircle, Images } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'
import { useInspection } from '../../context/InspectionContext'
import { useCatalog } from '../../context/CatalogContext'
import ComplianceToggle from '../ComplianceToggle'
import PhotoCapture from '../PhotoCapture'
import type { TrainedPersonnelRow, ValidationQuestion, PhotoEvidence } from '../../types'
import { catalogMatchKey } from '../../types'

function PersonnelCard({ row, index, onChange, onDelete, catalogPhotoCount }: {
  row: TrainedPersonnelRow
  index: number
  onChange: (r: TrainedPersonnelRow) => void
  onDelete: () => void
  catalogPhotoCount: number
}) {
  const { t } = useTranslation()

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">#{index + 1}</span>
          {catalogPhotoCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              <Images className="w-3 h-3" />
              {catalogPhotoCount} en catálogo
            </span>
          )}
        </div>
        <button type="button" onClick={onDelete} className="text-red-500 hover:text-red-700 p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            {t('personnel.nameJobTitle')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={row.nameAndJobTitle}
            onChange={(e) => onChange({ ...row, nameAndJobTitle: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            {t('personnel.license')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={row.licenseNumber}
            onChange={(e) => onChange({ ...row, licenseNumber: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">{t('personnel.specificTraining')}</label>
          <input
            type="text"
            value={row.specificTraining}
            onChange={(e) => onChange({ ...row, specificTraining: e.target.value })}
            placeholder="WHEELS, BRAKES OF GOODRICH..."
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">CUMPLE / COMPLIES:</span>
          <ComplianceToggle value={row.compliance} onChange={(v) => onChange({ ...row, compliance: v })} showNa={false} />
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

export default function PersonnelSection() {
  const { t } = useTranslation()
  const { inspection, update } = useInspection()
  const { findPersonPhotos } = useCatalog()
  if (!inspection) return null

  const addRow = () => update((prev) => ({
    ...prev,
    trainedPersonnel: [...prev.trainedPersonnel, { id: uuidv4(), nameAndJobTitle: '', licenseNumber: '', specificTraining: '', compliance: null, photos: [] }],
  }))

  const updateRow = (i: number, row: TrainedPersonnelRow) =>
    update((prev) => { const trainedPersonnel = [...prev.trainedPersonnel]; trainedPersonnel[i] = row; return { ...prev, trainedPersonnel } })

  const deleteRow = (i: number) =>
    update((prev) => ({ ...prev, trainedPersonnel: prev.trainedPersonnel.filter((_, idx) => idx !== i) }))

  const updateValidation = (i: number, q: ValidationQuestion) =>
    update((prev) => { const pv = [...prev.personnelValidation]; pv[i] = q; return { ...prev, personnelValidation: pv } })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">{t('personnel.title')}</h2>
      <div className="space-y-3">
        {inspection.trainedPersonnel.map((row, i) => {
          const matchKey = catalogMatchKey(row.nameAndJobTitle)
          const catalogPhotoCount = matchKey ? findPersonPhotos(matchKey).length : 0
          return (
            <PersonnelCard
              key={row.id}
              row={row}
              index={i}
              onChange={(r) => updateRow(i, r)}
              onDelete={() => deleteRow(i)}
              catalogPhotoCount={catalogPhotoCount}
            />
          )
        })}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-xl py-3 hover:bg-blue-50 transition-colors text-sm font-medium"
      >
        <PlusCircle className="w-4 h-4" />
        {t('personnel.addRow')}
      </button>
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">{t('personnel.sectionVerify')}:</span>
        <ComplianceToggle
          value={inspection.sectionVerify.personnel}
          onChange={(v) => update((prev) => ({ ...prev, sectionVerify: { ...prev.sectionVerify, personnel: v } }))}
          showNa={false}
        />
      </div>

      <h3 className="text-base font-bold text-slate-800 pt-2">{t('personnel.validation.title')}</h3>
      <div className="space-y-3">
        {inspection.personnelValidation.map((q, i) => (
          <ValidationCard key={q.id} q={q} onChange={(u) => updateValidation(i, u)} />
        ))}
      </div>
    </div>
  )
}
