import { useTranslation } from 'react-i18next'
import { useInspection } from '../../context/InspectionContext'
import ComplianceToggle from '../ComplianceToggle'

export default function ComponentSection() {
  const { t } = useTranslation()
  const { inspection, update } = useInspection()
  if (!inspection) return null
  const { componentId } = inspection

  const set = (field: keyof typeof componentId, value: string) =>
    update((prev) => ({ ...prev, componentId: { ...prev.componentId, [field]: value } }))

  const fields: { key: keyof typeof componentId; label: string; placeholder: string }[] = [
    { key: 'description', label: t('component.description'), placeholder: 'MAIN WHEEL ASSY' },
    { key: 'manufacturer', label: t('component.manufacturer'), placeholder: 'COLLINS AEROSPACES' },
    { key: 'partNumber', label: t('component.partNumber'), placeholder: '3-1518' },
    { key: 'scope', label: t('component.scope'), placeholder: 'INSPECTION, TEST, REPAIR' },
    { key: 'ata', label: t('component.ata'), placeholder: '32' },
    { key: 'applicableEquipment', label: t('component.applicableEquipment'), placeholder: 'ATR 42' },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">{t('component.title')}</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
            <input
              type="text"
              value={typeof componentId[key] === 'string' ? (componentId[key] as string) : ''}
              onChange={(e) => set(key, e.target.value)}
              placeholder={placeholder}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        ))}

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">{t('component.verify')}:</span>
            <ComplianceToggle
              value={componentId.verify}
              onChange={(v) => update((prev) => ({ ...prev, componentId: { ...prev.componentId, verify: v } }))}
              showNa={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
