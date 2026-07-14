import type { Inspection, PhotoEvidence, Catalog } from '../types'
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
  catalog?: Catalog
  catalogPhotos?: ExportedPhoto[]
}

export interface ImportResult {
  inspection: Inspection
  catalog: Catalog | null
}

async function blobifyPhotos(
  photos: PhotoEvidence[],
  blobMap: Map<string, Blob>,
): Promise<ExportedPhoto[]> {
  const result: ExportedPhoto[] = []
  for (const photo of photos) {
    const blob = blobMap.get(photo.blobKey)
    const thumb = blobMap.get(photo.thumbnailBlobKey)
    if (blob && thumb) {
      result.push({
        ...photo,
        dataUrl: await blobToDataUrl(blob),
        thumbDataUrl: await blobToDataUrl(thumb),
      })
    }
  }
  return result
}

export async function exportToJson(inspection: Inspection, catalog?: Catalog): Promise<void> {
  const blobEntries = await getAllBlobEntries()
  const blobMap = new Map(blobEntries.map((e) => [e.key, e.blob]))

  const inspectionPhotos: PhotoEvidence[] = [
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

  const exportedPhotos = await blobifyPhotos(inspectionPhotos, blobMap)

  // Catalog photos
  let exportedCatalogPhotos: ExportedPhoto[] = []
  if (catalog) {
    const catalogPhotos: PhotoEvidence[] = [
      ...catalog.tools.flatMap((t) => t.photos),
      ...catalog.materials.flatMap((m) => m.photos),
      ...catalog.personnel.flatMap((p) => p.photos),
    ]
    exportedCatalogPhotos = await blobifyPhotos(catalogPhotos, blobMap)
  }

  const payload: ExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    inspection,
    photos: exportedPhotos,
    catalog: catalog ?? undefined,
    catalogPhotos: exportedCatalogPhotos.length > 0 ? exportedCatalogPhotos : undefined,
  }

  const json = JSON.stringify(payload)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const partNumber = safeFilename(inspection.componentId.partNumber.trim())
  a.href = url
  a.download = `SAT-F743 - ${partNumber}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importFromJson(file: File): Promise<ImportResult> {
  let text: string
  try {
    text = await file.text()
  } catch {
    throw new Error('No se pudo leer el archivo. Asegúrese de que esté descargado localmente (no solo en la nube).')
  }

  const payload = JSON.parse(text) as ExportPayload
  if (!payload.inspection) throw new Error('Archivo inválido: falta inspection')

  for (const photo of payload.photos ?? []) {
    if (photo.dataUrl) await saveBlobFromDataUrl(photo.blobKey, photo.dataUrl)
    if (photo.thumbDataUrl) await saveBlobFromDataUrl(photo.thumbnailBlobKey, photo.thumbDataUrl)
  }

  for (const photo of payload.catalogPhotos ?? []) {
    if (photo.dataUrl) await saveBlobFromDataUrl(photo.blobKey, photo.dataUrl)
    if (photo.thumbDataUrl) await saveBlobFromDataUrl(photo.thumbnailBlobKey, photo.thumbDataUrl)
  }

  return { inspection: payload.inspection, catalog: payload.catalog ?? null }
}

/** Remove / replace characters that are illegal in filenames on any OS. */
export function safeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '-')   // illegal on Windows / macOS / Linux
    .replace(/\s*-\s*/g, '-')          // collapse " - " around replacements
    .replace(/-+/g, '-')               // collapse consecutive dashes
    .replace(/^[-.\s]+|[-.\s]+$/g, '') // trim leading / trailing dashes or dots
    || 'SIN-PN'
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
