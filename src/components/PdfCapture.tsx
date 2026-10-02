import { useRef, useState } from 'react'
import { FileText, X, Pencil, Check, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PdfEvidence } from '../types'
import { deleteBlob } from '../db/indexeddb'
import { isPdfFile, processPdfFile } from '../utils/pdfEvidence'
import { BlobThumb, PdfViewer } from './EvidenceViewer'

interface Props {
  pdfs: PdfEvidence[]
  onChange: (pdfs: PdfEvidence[]) => void
}

function PdfCard({ pdf, onOpen, onDelete, onCaptionChange }: {
  pdf: PdfEvidence
  onOpen: () => void
  onDelete: () => void
  onCaptionChange: (caption: string) => void
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(pdf.caption)
  const kb = (pdf.sizeBytes / 1024).toFixed(0)

  return (
    <div className="relative border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full aspect-square bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        title={t('pdf.view')}
      >
        <BlobThumb blobKey={pdf.thumbnailBlobKey} alt={pdf.fileName} fit="contain" />
      </button>
      <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
        <FileText className="w-3 h-3" />
        PDF · {t('pdf.pages', { count: pdf.pageCount })}
      </span>
      <button
        type="button"
        onClick={onDelete}
        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700"
        title={t('pdf.delete')}
      >
        <X className="w-3 h-3" />
      </button>
      <div className="p-1.5 text-xs text-gray-500">
        <div className="truncate font-medium text-slate-700" title={pdf.fileName}>{pdf.fileName}</div>
        <div>{kb} KB</div>
        {editing ? (
          <div className="mt-1 flex gap-1">
            <input
              className="flex-1 min-w-0 border border-gray-300 rounded px-1 text-xs"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <button type="button" onClick={() => { onCaptionChange(draft); setEditing(false) }} className="text-green-600">
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-1">
            <span className="truncate">{pdf.caption || t('photo.caption')}</span>
            <button type="button" onClick={() => setEditing(true)} className="text-blue-500 shrink-0">
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PdfCapture({ pdfs, onChange }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [viewing, setViewing] = useState<PdfEvidence | null>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setProcessing(true)
    const added: PdfEvidence[] = []
    const failed: string[] = []
    try {
      for (const file of Array.from(files)) {
        if (!isPdfFile(file)) { failed.push(file.name); continue }
        try {
          added.push(await processPdfFile(file))
        } catch (e) {
          console.error('Error processing PDF:', file.name, e)
          failed.push(file.name)
        }
      }
      if (added.length > 0) onChange([...pdfs, ...added])
      if (failed.length > 0) alert(`${t('pdf.invalid')}\n\n${failed.join('\n')}`)
    } finally {
      setProcessing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (pdf: PdfEvidence) => {
    await Promise.all([deleteBlob(pdf.blobKey), deleteBlob(pdf.thumbnailBlobKey)])
    onChange(pdfs.filter((p) => p.id !== pdf.id))
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={processing}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-rose-700 text-white rounded-lg disabled:opacity-40 hover:bg-rose-800 transition-colors"
      >
        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        {processing ? t('pdf.processing') : t('pdf.add')}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {pdfs.length > 0 && (
        <div className="photo-grid mt-2">
          {pdfs.map((pdf) => (
            <PdfCard
              key={pdf.id}
              pdf={pdf}
              onOpen={() => setViewing(pdf)}
              onDelete={() => handleDelete(pdf)}
              onCaptionChange={(caption) => onChange(pdfs.map((p) => (p.id === pdf.id ? { ...p, caption } : p)))}
            />
          ))}
        </div>
      )}

      {viewing && <PdfViewer pdf={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
