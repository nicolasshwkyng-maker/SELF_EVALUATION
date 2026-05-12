import { useTranslation } from 'react-i18next'
import type { ComplianceStatus } from '../types'

interface Props {
  value: ComplianceStatus
  onChange: (v: ComplianceStatus) => void
  showNa?: boolean
}

export default function ComplianceToggle({ value, onChange, showNa = true }: Props) {
  const { t } = useTranslation()

  const btn = (v: ComplianceStatus, label: string, activeClass: string) => (
    <button
      type="button"
      onClick={() => onChange(value === v ? null : v)}
      className={`px-3 py-1 text-xs font-semibold rounded border transition-colors ${
        value === v
          ? activeClass
          : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex gap-1">
      {btn('yes', t('compliance.yes'), 'border-green-500 bg-green-100 text-green-800')}
      {btn('no', t('compliance.no'), 'border-red-500 bg-red-100 text-red-800')}
      {showNa && btn('na', t('compliance.na'), 'border-gray-500 bg-gray-200 text-gray-700')}
    </div>
  )
}
