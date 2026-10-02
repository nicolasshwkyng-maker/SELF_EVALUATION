import { v4 as uuidv4 } from 'uuid'
import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { saveBlob, loadBlob } from '../db/indexeddb'
import type { PdfEvidence } from '../types'

const THUMB_WIDTH_PX = 400
/** Long-edge size for pages rasterized into the exported report (≈ 200 DPI on Letter). */
export const EXPORT_PAGE_MAX_PX = 2200

let pdfjsPromise: Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> | null = null

function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjs
    })
  }
  return pdfjsPromise
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export async function openPdf(blob: Blob): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfjs()
  const data = new Uint8Array(await blob.arrayBuffer())
  return pdfjs.getDocument({ data }).promise
}

export async function openStoredPdf(pdf: PdfEvidence): Promise<PDFDocumentProxy | null> {
  const blob = await loadBlob(pdf.blobKey)
  return blob ? openPdf(blob) : null
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo convertir la página'))), 'image/jpeg', quality)
  })
}

/** Rasterize one page (1-based) so its longest edge is `maxPx` pixels, on a white background. */
export async function renderPdfPage(doc: PDFDocumentProxy, pageNumber: number, maxPx: number, quality = 0.88): Promise<Blob> {
  const page = await doc.getPage(pageNumber)
  const base = page.getViewport({ scale: 1 })
  const scale = maxPx / Math.max(base.width, base.height)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  const context = canvas.getContext('2d')!
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvas, canvasContext: context, viewport }).promise
  const blob = await canvasToJpeg(canvas, quality)
  page.cleanup()
  canvas.width = 0
  canvas.height = 0
  return blob
}

export async function processPdfFile(file: File): Promise<PdfEvidence> {
  const doc = await openPdf(file)
  try {
    const thumb = await renderPdfPage(doc, 1, THUMB_WIDTH_PX, 0.75)
    const blobKey = `pdf_${uuidv4()}`
    const thumbnailBlobKey = `pdfthumb_${uuidv4()}`
    const stored = file.type === 'application/pdf' ? file : new Blob([file], { type: 'application/pdf' })
    await Promise.all([saveBlob(blobKey, stored), saveBlob(thumbnailBlobKey, thumb)])
    return {
      id: uuidv4(),
      blobKey,
      thumbnailBlobKey,
      fileName: file.name,
      pageCount: doc.numPages,
      caption: '',
      timestamp: new Date().toISOString(),
      sizeBytes: file.size,
    }
  } finally {
    await doc.destroy()
  }
}
