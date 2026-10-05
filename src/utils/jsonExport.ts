import { v4 as uuidv4 } from 'uuid'
import type { Inspection, PhotoEvidence, PdfEvidence, ContractMaintenanceService } from '../types'
import { getAllBlobEntries, saveBlobFromDataUrl, saveBlob, loadBlob } from '../db/indexeddb'
import { blobToDataUrl } from './imageProcessing'
import { createEmptyInspection } from '../db/indexeddb'
import { listEvidenceItems } from './figureNumbering'

interface ExportedPhoto extends PhotoEvidence {
  dataUrl: string
  thumbDataUrl: string
}

interface ExportedPdf extends PdfEvidence {
  dataUrl: string
  thumbDataUrl: string
}

interface ExportPayload {
  version: number
  exportedAt: string
  inspection: Inspection
  photos: ExportedPhoto[]
  pdfFiles?: ExportedPdf[]
}

async function withDataUrls<T extends { blobKey: string; thumbnailBlobKey: string }>(
  items: T[],
  blobMap: Map<string, Blob>,
): Promise<(T & { dataUrl: string; thumbDataUrl: string })[]> {
  const result: (T & { dataUrl: string; thumbDataUrl: string })[] = []
  for (const item of items) {
    const blob = blobMap.get(item.blobKey)
    const thumb = blobMap.get(item.thumbnailBlobKey)
    if (blob && thumb) {
      result.push({
        ...item,
        dataUrl: await blobToDataUrl(blob),
        thumbDataUrl: await blobToDataUrl(thumb),
      })
    }
  }
  return result
}

export async function exportToJson(inspection: Inspection): Promise<void> {
  const blobEntries = await getAllBlobEntries()
  const blobMap = new Map(blobEntries.map((e) => [e.key, e.blob]))
  const items = listEvidenceItems(inspection)

  const payload: ExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    inspection,
    photos: await withDataUrls(items.flatMap((i) => i.photos), blobMap),
    pdfFiles: await withDataUrls(items.flatMap((i) => i.pdfs), blobMap),
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

export interface ImportResult {
  inspection: Inspection
  /** Evidence referenced by the inspection whose file is not on this device after importing. */
  missingFiles: string[]
}

async function findMissingEvidence(inspection: Inspection): Promise<string[]> {
  const missing: string[] = []
  for (const item of listEvidenceItems(inspection)) {
    for (const photo of item.photos) {
      if (!(await loadBlob(photo.blobKey))) missing.push(`${item.sectionLabel} — foto ${photo.caption || photo.id.slice(0, 8)}`)
    }
    for (const pdf of item.pdfs) {
      if (!(await loadBlob(pdf.blobKey))) missing.push(`${item.sectionLabel} — ${pdf.fileName}`)
    }
  }
  return missing
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

  for (const item of [...(payload.photos ?? []), ...(payload.pdfFiles ?? [])]) {
    if (item.dataUrl) await saveBlobFromDataUrl(item.blobKey, item.dataUrl)
    if (item.thumbDataUrl) await saveBlobFromDataUrl(item.thumbnailBlobKey, item.thumbDataUrl)
  }

  const rawServices: unknown[] = payload.inspection.contractMaintenance?.services ?? []
  const services: ContractMaintenanceService[] = rawServices.map((s) =>
    typeof s === 'string'
      ? { id: uuidv4(), serviceType: s, standard: '' }
      : {
          ...(s as ContractMaintenanceService),
          id: (s as ContractMaintenanceService).id || uuidv4(),
          serviceType: (s as ContractMaintenanceService).serviceType ?? '',
          standard: (s as ContractMaintenanceService).standard ?? '',
        }
  )
  const inspection = { ...payload.inspection, contractMaintenance: { services } }
  return { inspection, missingFiles: await findMissingEvidence(inspection) }
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
