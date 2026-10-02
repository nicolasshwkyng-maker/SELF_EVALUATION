import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, FileText, ArrowRight, Images } from 'lucide-react'
import { useInspection } from '../../context/InspectionContext'
import { listEvidenceItems, type EvidenceItem } from '../../utils/figureNumbering'
import { BlobThumb, PdfViewer, PhotoViewer } from '../EvidenceViewer'
import type { PhotoEvidence, PdfEvidence } from '../../types'

type Filter = 'all' | 'photos' | 'pdfs'

type Viewing =
  | { kind: 'photo'; photo: PhotoEvidence; subtitle: string }
  | { kind: 'pdf'; pdf: PdfEvidence; subtitle: string }

function figureRange(code: string, from: number, to: number) {
  return from === to ? `Fig. ${code}-${from}` : `Fig. ${code}-${from} – ${to}`
}

function Tile({ thumbKey, alt, badge, label, sub, onOpen, fit }: {
  thumbKey: string
  fit?: 'cover' | 'contain'
  alt: string
  badge: ReactNode
  label: string
  sub: string
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left border border-gray-200 rounded-lg overflow-hidden bg-white hover:border-blue-400 hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
    >
      <div className="relative aspect-square bg-gray-50">
        <BlobThumb blobKey={thumbKey} alt={alt} fit={fit} />
        <span className="absolute top-1 left-1">{badge}</span>
      </div>
      <div className="p-1.5">
        <div className="text-[11px] font-semibold text-slate-700 tabular-nums">{label}</div>
        <div className="text-[11px] text-gray-500 truncate" title={sub}>{sub}</div>
      </div>
    </button>
  )
}

function ItemGroup({ item, filter, onOpen, onGoTo }: {
  item: EvidenceItem
  filter: Filter
  onOpen: (v: Viewing) => void
  onGoTo: () => void
}) {
  const { t } = useTranslation()
  const subtitle = `${item.sectionLabel} — ${item.itemLabel}`
  let pdfStart = item.photos.length + 1

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 space-y-3">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.sectionLabel}</div>
          <h3 className="text-sm font-semibold text-slate-800 leading-snug">{item.itemLabel}</h3>
        </div>
        <button
          type="button"
          onClick={onGoTo}
          className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50"
        >
          {t('gallery.goToItem')}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      <div className="photo-grid">
        {filter !== 'pdfs' && item.photos.map((photo, i) => (
          <Tile
            key={photo.id}
            thumbKey={photo.thumbnailBlobKey}
            alt={photo.caption || 'foto'}
            badge={
              <span className="inline-flex items-center gap-0.5 bg-slate-800/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                <Camera className="w-3 h-3" />
              </span>
            }
            label={figureRange(item.sectionCode, i + 1, i + 1)}
            sub={photo.caption || new Date(photo.timestamp).toLocaleString()}
            onOpen={() => onOpen({ kind: 'photo', photo, subtitle })}
          />
        ))}
        {item.pdfs.map((pdf) => {
          const from = pdfStart
          pdfStart += pdf.pageCount
          if (filter === 'photos') return null
          return (
            <Tile
              key={pdf.id}
              thumbKey={pdf.thumbnailBlobKey}
              alt={pdf.fileName}
              fit="contain"
              badge={
                <span className="inline-flex items-center gap-0.5 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  <FileText className="w-3 h-3" />
                  PDF · {t('pdf.pages', { count: pdf.pageCount })}
                </span>
              }
              label={figureRange(item.sectionCode, from, from + pdf.pageCount - 1)}
              sub={pdf.caption || pdf.fileName}
              onOpen={() => onOpen({ kind: 'pdf', pdf, subtitle })}
            />
          )
        })}
      </div>
    </section>
  )
}

export default function CatalogSection({ onSectionChange }: { onSectionChange: (i: number) => void }) {
  const { t } = useTranslation()
  const { inspection } = useInspection()
  const [filter, setFilter] = useState<Filter>('all')
  const [viewing, setViewing] = useState<Viewing | null>(null)

  const items = useMemo(
    () => (inspection ? listEvidenceItems(inspection).filter((i) => i.photos.length + i.pdfs.length > 0) : []),
    [inspection],
  )
  if (!inspection) return null

  const photoCount = items.reduce((s, i) => s + i.photos.length, 0)
  const pdfCount = items.reduce((s, i) => s + i.pdfs.length, 0)
  const pdfPageCount = items.reduce((s, i) => s + i.pdfs.reduce((n, p) => n + p.pageCount, 0), 0)
  const visible = items.filter((i) =>
    filter === 'all' ? true : filter === 'photos' ? i.photos.length > 0 : i.pdfs.length > 0,
  )

  const filters: { id: Filter; label: string; count: number; icon: typeof Images }[] = [
    { id: 'all', label: t('gallery.all'), count: photoCount + pdfCount, icon: Images },
    { id: 'photos', label: t('gallery.photos'), count: photoCount, icon: Camera },
    { id: 'pdfs', label: t('gallery.pdfs'), count: pdfCount, icon: FileText },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800">{t('gallery.title')}</h2>
        <p className="text-xs text-gray-500 mt-1">{t('gallery.subtitle')}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-xl font-bold text-slate-800 tabular-nums">{photoCount}</div>
          <div className="text-xs text-gray-500">{t('gallery.photos')}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-xl font-bold text-slate-800 tabular-nums">{pdfCount}</div>
          <div className="text-xs text-gray-500">{t('gallery.pdfs')}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-xl font-bold text-slate-800 tabular-nums">{pdfPageCount}</div>
          <div className="text-xs text-gray-500">{t('gallery.pdfPages')}</div>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl" role="tablist">
        {filters.map(({ id, label, count, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === id ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            <span className="text-xs tabular-nums text-gray-400">{count}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3 pb-4">
        {visible.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">
            {items.length === 0 ? t('gallery.empty') : t('gallery.emptyFilter')}
          </p>
        ) : (
          visible.map((item) => (
            <ItemGroup
              key={item.sectionCode}
              item={item}
              filter={filter}
              onOpen={setViewing}
              onGoTo={() => onSectionChange(item.appSection)}
            />
          ))
        )}
      </div>

      {viewing?.kind === 'photo' && (
        <PhotoViewer photo={viewing.photo} subtitle={viewing.subtitle} onClose={() => setViewing(null)} />
      )}
      {viewing?.kind === 'pdf' && (
        <PdfViewer pdf={viewing.pdf} subtitle={viewing.subtitle} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}
