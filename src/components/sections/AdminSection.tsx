import { useTranslation } from 'react-i18next'
import { useInspection } from '../../context/InspectionContext'
import ComplianceToggle from '../ComplianceToggle'

export default function AdminSection() {
  const { t } = useTranslation()
  const { inspection, update } = useInspection()
  if (!inspection) return null
  const { admin } = inspection

  const set = (field: keyof typeof admin, value: string) =>
    update((prev) => ({ ...prev, admin: { ...prev.admin, [field]: value } }))

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">{t('admin.title')}</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            {t('admin.workshopName')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={admin.workshopName}
            onChange={(e) => set('workshopName', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="NAME OF THE WORKSHOP LIDER"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            {t('admin.requestDate')} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={admin.requestDate}
            onChange={(e) => set('requestDate', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            {t('admin.responsible')}
          </label>
          <input
            type="text"
            value={admin.responsibleForRequest}
            onChange={(e) => set('responsibleForRequest', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="RESPONSIBLE FOR THE REQUEST"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            {t('admin.rating')}
          </label>
          <input
            type="text"
            value={admin.rating}
            onChange={(e) => set('rating', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder='Accessories "Mechanical"'
          />
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">{t('admin.ratingVerify')}:</span>
            <ComplianceToggle
              value={admin.ratingVerify}
              onChange={(v) => update((prev) => ({ ...prev, admin: { ...prev.admin, ratingVerify: v } }))}
              showNa={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
