import { useTranslation } from 'react-i18next'
import { useInspection } from '../../context/InspectionContext'
import ComplianceToggle from '../ComplianceToggle'
import PhotoCapture from '../PhotoCapture'
import type { HousingFacilityItem, PhotoEvidence } from '../../types'

function ItemCard({ item, index, onChange }: {
  item: HousingFacilityItem
  index: number
  onChange: (u: HousingFacilityItem) => void
}) {
  const { i18n, t } = useTranslation()
  const label = i18n.language === 'en' ? item.labelEn : item.labelEs
  const subLabel = i18n.language === 'en' ? item.labelEs : item.labelEn

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-sm text-slate-800">{index + 1}. {label}</div>
          <div className="text-xs text-gray-500 mt-0.5">{subLabel}</div>
        </div>
        <ComplianceToggle value={item.compliance} onChange={(v) => onChange({ ...item, compliance: v })} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">{t('common.evidence')}</label>
        <input
          type="text"
          value={item.evidence}
          onChange={(e) => onChange({ ...item, evidence: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="N/A"
        />
      </div>
      <PhotoCapture photos={item.photos} onChange={(photos: PhotoEvidence[]) => onChange({ ...item, photos })} />
    </div>
  )
}

export default function FacilitiesSection() {
  const { t } = useTranslation()
  const { inspection, update } = useInspection()
  if (!inspection) return null

  const updateItem = (index: number, updated: HousingFacilityItem) =>
    update((prev) => {
      const facilities = [...prev.facilities]
      facilities[index] = updated
      return { ...prev, facilities }
    })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">{t('facilities.title')}</h2>
      <div className="space-y-3">
        {inspection.facilities.map((item, i) => (
          <ItemCard key={item.id} item={item} index={i} onChange={(u) => updateItem(i, u)} />
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">{t('facilities.sectionVerify')}:</span>
        <ComplianceToggle
          value={inspection.sectionVerify.facilities}
          onChange={(v) => update((prev) => ({ ...prev, sectionVerify: { ...prev.sectionVerify, facilities: v } }))}
          showNa={false}
        />
      </div>
    </div>
  )
}
