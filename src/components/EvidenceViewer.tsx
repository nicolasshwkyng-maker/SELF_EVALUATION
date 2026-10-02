import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, Loader2, ExternalLink, ImageOff } from 'lucide-react'
import type { PhotoEvidence, PdfEvidence } from '../types'
import { loadBlob } from '../db/indexeddb'
import { openStoredPdf, renderPdfPage } from '../utils/pdfEvidence'

/** Object URL for a stored blob; `null` while loading, `false` if missing. */
export function useBlobUrl(key: string | undefined): string | null | false {
  const [url, setUrl] = useState<string | null | false>(null)
  useEffect(() => {
    if (!key) { setUrl(false); return }
    let objectUrl: string | undefined
    let cancelled = false
    setUrl(null)
    loadBlob(key)
      .then((blob) => {
        if (cancelled) return
        if (!blob) { setUrl(false); return }
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => { if (!cancelled) setUrl(false) })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [key])
  return url
}

export function BlobThumb({ blobKey, alt, fit = 'cover' }: { blobKey: string; alt: string; fit?: 'cover' | 'contain' }) {
  const src = useBlobUrl(blobKey)
  if (src === null) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      </div>
    )
  }
  if (src === false) {
    return (
      <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-1">
        <ImageOff className="w-5 h-5 text-gray-400" />
        <span className="text-xs text-gray-400">No disponible</span>
      </div>
    )
  }
  return <img src={src} alt={alt} className={`w-full h-full ${fit === 'contain' ? 'object-contain p-1' : 'object-cover'}`} />
}

function Modal({ title, subtitle, actions, onClose, children }: {
  title: string
  subtitle?: string
  actions?: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  const { t } = useTranslation()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex flex-col" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 text-white">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{title}</div>
          {subtitle && <div className="text-xs text-slate-400 truncate">{subtitle}</div>}
        </div>
        {actions}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          title={t('gallery.close')}
          aria-label={t('gallery.close')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-3 sm:p-6">{children}</div>
    </div>,
    document.body,
  )
}

export function PhotoViewer({ photo, subtitle, onClose }: { photo: PhotoEvidence; subtitle?: string; onClose: () => void }) {
  const src = useBlobUrl(photo.blobKey)
  return (
    <Modal title={photo.caption || new Date(photo.timestamp).toLocaleString()} subtitle={subtitle} onClose={onClose}>
      <div className="min-h-full flex items-center justify-center">
        {src === null && <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />}
        {src === false && <span className="text-slate-300 text-sm">No disponible</span>}
        {src && <img src={src} alt={photo.caption || 'foto'} className="max-w-full max-h-[85dvh] object-contain rounded" />}
      </div>
    </Modal>
  )
}

/** Renders every page of a stored PDF, sized to the viewer width, one after another. */
export function PdfViewer({ pdf, subtitle, onClose }: { pdf: PdfEvidence; subtitle?: string; onClose: () => void }) {
  const { t } = useTranslation()
  const originalUrl = useBlobUrl(pdf.blobKey)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<string[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const urls: string[] = []
    const widthPx = Math.min(containerRef.current?.clientWidth || 900, 1100) * Math.min(window.devicePixelRatio || 1, 2)
    ;(async () => {
      const doc = await openStoredPdf(pdf).catch(() => null)
      if (!doc) { if (!cancelled) setError(true); return }
      try {
        for (let p = 1; p <= doc.numPages && !cancelled; p++) {
          const page = await doc.getPage(p)
          const { width, height } = page.getViewport({ scale: 1 })
          const blob = await renderPdfPage(doc, p, Math.round(widthPx * Math.max(1, height / width)))
          if (cancelled) break
          const url = URL.createObjectURL(blob)
          urls.push(url)
          setPages([...urls])
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        await doc.destroy()
      }
    })()
    return () => {
      cancelled = true
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [pdf])

  const actions = originalUrl ? (
    <a
      href={originalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600"
    >
      <ExternalLink className="w-3.5 h-3.5" />
      {t('pdf.openOriginal')}
    </a>
  ) : null

  return (
    <Modal
      title={pdf.caption || pdf.fileName}
      subtitle={[t('pdf.pages', { count: pdf.pageCount }), subtitle].filter(Boolean).join(' · ')}
      actions={actions}
      onClose={onClose}
    >
      <div ref={containerRef} className="max-w-[1100px] mx-auto flex flex-col gap-4">
        {pages.map((src, i) => (
          <figure key={src} className="m-0">
            <img src={src} alt={`${pdf.fileName} — ${i + 1}/${pdf.pageCount}`} className="w-full bg-white rounded shadow-lg" />
            <figcaption className="text-center text-xs text-slate-400 mt-1 tabular-nums">{i + 1} / {pdf.pageCount}</figcaption>
          </figure>
        ))}
        {!error && pages.length < pdf.pageCount && (
          <div className="flex justify-center py-6"><Loader2 className="w-8 h-8 text-slate-300 animate-spin" /></div>
        )}
        {error && <p className="text-center text-sm text-red-300 py-6">{t('pdf.invalid')}</p>}
      </div>
    </Modal>
  )
}
