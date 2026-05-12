import type { Inspection, PhotoEvidence } from '../types'
import { getAllBlobEntries, saveBlobFromDataUrl, saveBlob } from '../db/indexeddb'
import { blobToDataUrl } from './imageProcessing'
import { createEmptyInspection } from '../db/indexeddb'

interface ExportedPhoto extends PhotoEvidence {
  dataUrl: string
  thumbDataUrl: string
}

interface ExportPayload {
  version: number
  exportedAt: string
  inspection: Inspection
  photos: ExportedPhoto[]
}

export async function exportToJson(inspection: Inspection): Promise<void> {
  const blobEntries = await getAllBlobEntries()
  const blobMap = new Map(blobEntries.map((e) => [e.key, e.blob]))

  const allPhotos: PhotoEvidence[] = [
    ...inspection.housing.flatMap((i) => i.photos),
    ...inspection.facilities.flatMap((i) => i.photos),
    ...inspection.tools.flatMap((t) => t.photos),
    ...inspection.toolsValidation.flatMap((q) => q.photos),
    ...inspection.materials.flatMap((m) => m.photos),
    ...inspection.technicalData.flatMap((t) => t.photos),
    ...inspection.processes.flatMap((p) => p.photos),
    ...inspection.trainedPersonnel.flatMap((p) => p.photos),
    ...inspection.personnelValidation.flatMap((q) => q.photos),
  ]

  const exportedPhotos: ExportedPhoto[] = []
  for (const photo of allPhotos) {
    const blob = blobMap.get(photo.blobKey)
    const thumb = blobMap.get(photo.thumbnailBlobKey)
    if (blob && thumb) {
      exportedPhotos.push({
        ...photo,
        dataUrl: await blobToDataUrl(blob),
        thumbDataUrl: await blobToDataUrl(thumb),
      })
    }
  }

  const payload: ExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    inspection,
    photos: exportedPhotos,
  }

  const json = JSON.stringify(payload)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const workshop = inspection.admin.workshopName.replace(/\s+/g, '') || 'Inspeccion'
  const date = inspection.admin.requestDate || new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `SAT-F743_${workshop}_${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importFromJson(file: File): Promise<Inspection> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const payload = JSON.parse(reader.result as string) as ExportPayload
        if (!payload.inspection) throw new Error('Archivo inválido: falta inspection')

        // Re-save all blobs
        for (const photo of payload.photos ?? []) {
          if (photo.dataUrl) await saveBlobFromDataUrl(photo.blobKey, photo.dataUrl)
          if (photo.thumbDataUrl) await saveBlobFromDataUrl(photo.thumbnailBlobKey, photo.thumbDataUrl)
        }

        resolve(payload.inspection)
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export function triggerPdfDownload(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export { createEmptyInspection }
export { saveBlob }
