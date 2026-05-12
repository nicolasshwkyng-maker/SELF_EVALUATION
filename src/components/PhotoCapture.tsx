import { useRef, useState, useEffect } from 'react'
import { Camera, ImageIcon, X, Pencil, Check, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PhotoEvidence } from '../types'
import { MAX_PHOTOS_PER_ITEM } from '../types'
import { processImageFile } from '../utils/imageProcessing'
import { loadBlob, deleteBlob } from '../db/indexeddb'

interface Props {
  photos: PhotoEvidence[]
  onChange: (photos: PhotoEvidence[]) => void
}

function PhotoThumb({ photo, onDelete, onCaptionChange }: {
  photo: PhotoEvidence
  onDelete: () => void
  onCaptionChange: (caption: string) => void
}) {
  const { t } = useTranslation()
  const [src, setSrc] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(photo.caption)

  useEffect(() => {
    let url: string
    loadBlob(photo.thumbnailBlobKey).then((blob) => {
      if (blob) {
        url = URL.createObjectURL(blob)
        setSrc(url)
      }
    })
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [photo.thumbnailBlobKey])

  const kb = (photo.sizeBytes / 1024).toFixed(0)
  const ts = new Date(photo.timestamp).toLocaleString()

  return (
    <div className="relative border border-gray-200 rounded-lg overflow-hidden bg-white">
      {src ? (
        <img src={src} alt={photo.caption || 'photo'} className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700"
        title={t('photo.delete')}
      >
        <X className="w-3 h-3" />
      </button>
      <div className="p-1.5 text-xs text-gray-500">
        <div>{ts}</div>
        <div>{kb} KB</div>
        {editing ? (
          <div className="mt-1 flex gap-1">
            <input
              className="flex-1 border border-gray-300 rounded px-1 text-xs"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              onClick={() => { onCaptionChange(draft); setEditing(false) }}
              className="text-green-600"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-1">
            <span className="truncate">{photo.caption || t('photo.caption')}</span>
            <button type="button" onClick={() => setEditing(true)} className="text-blue-500 shrink-0">
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PhotoCapture({ photos, onChange }: Props) {
  const { t } = useTranslation()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const atLimit = photos.length >= MAX_PHOTOS_PER_ITEM

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setProcessing(true)
    try {
      const remaining = MAX_PHOTOS_PER_ITEM - photos.length
      const toProcess = Array.from(files).slice(0, remaining)
      const newPhotos = await Promise.all(toProcess.map(processImageFile))
      onChange([...photos, ...newPhotos])
    } catch (e) {
      console.error('Error processing image:', e)
    } finally {
      setProcessing(false)
      if (cameraRef.current) cameraRef.current.value = ''
      if (galleryRef.current) galleryRef.current.value = ''
    }
  }

  const handleDelete = async (photo: PhotoEvidence) => {
    await Promise.all([deleteBlob(photo.blobKey), deleteBlob(photo.thumbnailBlobKey)])
    onChange(photos.filter((p) => p.id !== photo.id))
  }

  const handleCaptionChange = (photoId: string, caption: string) => {
    onChange(photos.map((p) => (p.id === photoId ? { ...p, caption } : p)))
  }

  return (
    <div className="mt-2">
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          disabled={atLimit || processing}
          onClick={() => cameraRef.current?.click()}
          title={atLimit ? t('photo.limitReached') : undefined}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {t('photo.camera')}
        </button>
        <button
          type="button"
          disabled={atLimit || processing}
          onClick={() => galleryRef.current?.click()}
          title={atLimit ? t('photo.limitReached') : undefined}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-600 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors"
        >
          <ImageIcon className="w-4 h-4" />
          {t('photo.gallery')}
        </button>
        {atLimit && (
          <span className="text-xs text-amber-600 self-center">{t('photo.limitReached')}</span>
        )}
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {photos.length > 0 && (
        <div className="photo-grid mt-2">
          {photos.map((photo) => (
            <PhotoThumb
              key={photo.id}
              photo={photo}
              onDelete={() => handleDelete(photo)}
              onCaptionChange={(caption) => handleCaptionChange(photo.id, caption)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
