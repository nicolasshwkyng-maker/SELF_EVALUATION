import { useTranslation } from 'react-i18next'

export default function LanguageToggle() {
  const { i18n, t } = useTranslation()

  const toggle = () => {
    const next = i18n.language === 'es' ? 'en' : 'es'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="px-2 py-1 text-xs font-semibold border border-slate-400 text-slate-200 rounded hover:bg-slate-600 transition-colors"
    >
      {t('langToggle')}
    </button>
  )
}
