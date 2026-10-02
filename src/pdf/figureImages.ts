import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { loadBlob } from '../db/indexeddb'
import type { FigureSource } from '../utils/figureNumbering'
import { openStoredPdf, renderPdfPage, EXPORT_PAGE_MAX_PX } from '../utils/pdfEvidence'

/** Resolves the image for a figure; PDF documents are opened once and reused across their pages. */
export class FigureImageLoader {
  private docs = new Map<string, Promise<PDFDocumentProxy | null>>()

  async load(source: FigureSource): Promise<Blob | null> {
    if (source.kind === 'photo') return loadBlob(source.photo.blobKey)

    let doc = this.docs.get(source.pdf.id)
    if (!doc) {
      doc = openStoredPdf(source.pdf).catch((e) => {
        console.error('No se pudo abrir el PDF de evidencia', source.pdf.fileName, e)
        return null
      })
      this.docs.set(source.pdf.id, doc)
    }
    const d = await doc
    if (!d) return null
    try {
      return await renderPdfPage(d, source.pageNumber, EXPORT_PAGE_MAX_PX)
    } catch (e) {
      console.error('No se pudo renderizar la página', source.pageNumber, 'de', source.pdf.fileName, e)
      return null
    }
  }

  async dispose() {
    for (const doc of this.docs.values()) await (await doc)?.destroy()
    this.docs.clear()
  }
}
