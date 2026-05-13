import { Trash2, PlusCircle, Images } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'
import { useInspection } from '../../context/InspectionContext'
import { useCatalog } from '../../context/CatalogContext'
import ComplianceToggle from '../ComplianceToggle'
import PhotoCapture from '../PhotoCapture'
import type { MaterialRow, PhotoEvidence } from '../../types'
import { catalogMatchKey } from '../../types'

function MaterialCard({ row, index, onChange, onDelete, catalogPhotoCount }: {
  row: MaterialRow
  index: number
  onChange: (r: MaterialRow) => void
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
            {t('materials.description')} <span className="text-red-400">*</span>
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
            {t('materials.partNumber')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={row.partNumberOrReference}
            onChange={(e) => onChange({ ...row, partNumberOrReference: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">{t('materials.equivalent')}</label>
          <input
            type="text"
            value={row.equivalent}
            onChange={(e) => onChange({ ...row, equivalent: e.target.value })}
            placeholder="EQUIVALENT"
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>
      <PhotoCapture photos={row.photos} onChange={(photos: PhotoEvidence[]) => onChange({ ...row, photos })} />
    </div>
  )
}

export default function MaterialsSection() {
  const { t } = useTranslation()
  const { inspection, update } = useInspection()
  const { findMaterialPhotos } = useCatalog()
  if (!inspection) return null

  const addRow = () => update((prev) => ({
    ...prev,
    materials: [...prev.materials, { id: uuidv4(), description: '', partNumberOrReference: '', equivalent: '', photos: [] }],
  }))

  const updateRow = (i: number, row: MaterialRow) =>
    update((prev) => { const materials = [...prev.materials]; materials[i] = row; return { ...prev, materials } })

  const deleteRow = (i: number) =>
    update((prev) => ({ ...prev, materials: prev.materials.filter((_, idx) => idx !== i) }))

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">{t('materials.title')}</h2>
      <div className="space-y-3">
        {inspection.materials.map((row, i) => {
          const matchKey = catalogMatchKey(row.partNumberOrReference || row.description)
          const catalogPhotoCount = matchKey ? findMaterialPhotos(matchKey).length : 0
          return (
            <MaterialCard
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
        {t('materials.addMaterial')}
      </button>
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">{t('materials.sectionVerify')}:</span>
        <ComplianceToggle
          value={inspection.sectionVerify.materials}
          onChange={(v) => update((prev) => ({ ...prev, sectionVerify: { ...prev.sectionVerify, materials: v } }))}
          showNa={false}
        />
      </div>
    </div>
  )
}
