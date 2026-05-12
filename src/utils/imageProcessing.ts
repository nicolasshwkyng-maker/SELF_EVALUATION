import imageCompression from 'browser-image-compression'
import { v4 as uuidv4 } from 'uuid'
import { saveBlob } from '../db/indexeddb'
import type { PhotoEvidence } from '../types'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

const COMPRESS_OPTIONS = {
  maxSizeMB: 0.4,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
  initialQuality: 0.75,
}

const THUMB_OPTIONS = {
  maxSizeMB: 0.05,
  maxWidthOrHeight: 400,
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
  initialQuality: 0.7,
}

function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = reject
    img.src = url
  })
}

export async function processImageFile(file: File): Promise<PhotoEvidence> {
  if (!ACCEPTED_TYPES.includes(file.type) && !file.name.toLowerCase().match(/\.(heic|heif)$/)) {
    throw new Error(`Tipo de archivo no soportado: ${file.type}`)
  }

  let sourceFile = file

  // Convert HEIC/HEIF lazily
  if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().match(/\.(heic|heif)$/)) {
    const heic2any = (await import('heic2any')).default
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
    sourceFile = new File([converted as Blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
  }

  const [compressed, thumbnail] = await Promise.all([
    imageCompression(sourceFile, COMPRESS_OPTIONS),
    imageCompression(sourceFile, THUMB_OPTIONS),
  ])

  const { width, height } = await getImageDimensions(compressed)

  const blobKey = `photo_${uuidv4()}`
  const thumbnailBlobKey = `thumb_${uuidv4()}`

  await Promise.all([saveBlob(blobKey, compressed), saveBlob(thumbnailBlobKey, thumbnail)])

  return {
    id: uuidv4(),
    blobKey,
    thumbnailBlobKey,
    caption: '',
    timestamp: new Date().toISOString(),
    width,
    height,
    sizeBytes: compressed.size,
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
