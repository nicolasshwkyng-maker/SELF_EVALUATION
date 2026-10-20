import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'

const CHECK_EVERY_MS = 15 * 60 * 1000

/**
 * The service worker (skipWaiting + clientsClaim) activates new builds in the background, but an open
 * tab keeps running the old code until it reloads. Offer that reload as soon as the new worker takes over.
 */
export default function UpdateBanner() {
  const { t } = useTranslation()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sw = navigator.serviceWorker
    if (!sw) return
    const hadController = !!sw.controller
    const onControllerChange = () => { if (hadController) setReady(true) }
    sw.addEventListener('controllerchange', onControllerChange)

    const check = () => { sw.getRegistration().then((reg) => reg?.update()).catch(() => {}) }
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    const timer = setInterval(check, CHECK_EVERY_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      sw.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [])

  if (!ready) return null
  return (
    <div className="fixed bottom-20 inset-x-0 z-40 flex justify-center px-4" role="status">
      <div className="flex items-center gap-3 bg-slate-900 text-white rounded-xl shadow-lg px-4 py-3 max-w-md w-full">
        <span className="text-sm flex-1">{t('app.updateAvailable')}</span>
        <button
          type="button"
          // Let the 500 ms autosave debounce flush before the page goes away.
          onClick={() => setTimeout(() => window.location.reload(), 800)}
          className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-3 py-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <RefreshCw className="w-4 h-4" />
          {t('app.updateNow')}
        </button>
      </div>
    </div>
  )
}
