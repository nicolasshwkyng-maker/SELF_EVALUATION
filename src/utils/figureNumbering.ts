import type { Inspection, PhotoEvidence, PdfEvidence } from '../types'

export type FigureSource =
  | { kind: 'photo'; photo: PhotoEvidence }
  | { kind: 'pdfPage'; pdf: PdfEvidence; pageNumber: number }

export interface FigureEntry {
  figureId: string   // e.g. "Fig. 2.1-1-1"
  source: FigureSource
  caption: string
  timestamp: string
  sectionLabel: string
  itemLabel: string
}

export interface EvidenceItem {
  /** Index of the app section that owns the item (matches App.tsx routing). */
  appSection: number
  sectionCode: string
  sectionLabel: string
  itemLabel: string
  photos: PhotoEvidence[]
  pdfs: PdfEvidence[]
}

export function listEvidenceItems(inspection: Inspection): EvidenceItem[] {
  const items: EvidenceItem[] = []
  const add = (
    appSection: number,
    sectionCode: string,
    sectionLabel: string,
    itemLabel: string,
    item: { photos?: PhotoEvidence[]; pdfs?: PdfEvidence[] },
  ) => items.push({ appSection, sectionCode, sectionLabel, itemLabel, photos: item.photos ?? [], pdfs: item.pdfs ?? [] })

  inspection.housing.forEach((item, i) =>
    add(2, `2.1-${i + 1}`, '2.1 Housing', `${item.labelEn} / ${item.labelEs}`, item))
  inspection.facilities.forEach((item, i) =>
    add(3, `2.2-${i + 1}`, '2.2 Facilities', `${item.labelEn} / ${item.labelEs}`, item))
  inspection.tools.forEach((row, i) =>
    add(4, `3-${i + 1}`, '3. Equipment', row.description || `Tool ${i + 1}`, row))
  inspection.toolsValidation.forEach((q, i) =>
    add(4, `3.1-${i + 1}`, '3.1 Validation', q.questionEn, q))
  inspection.materials.forEach((row, i) =>
    add(5, `4-${i + 1}`, '4. Material', row.description || `Material ${i + 1}`, row))
  inspection.technicalData.forEach((row, i) =>
    add(6, `5-${i + 1}`, '5. Technical Data', row.publicationDescription || `Publication ${i + 1}`, row))
  inspection.processes.forEach((row, i) =>
    add(7, `6-${i + 1}`, '6. Processes', row.processName || `Process ${i + 1}`, row))
  inspection.trainedPersonnel.forEach((row, i) =>
    add(8, `7-${i + 1}`, '7. Personnel', row.nameAndJobTitle || `Personnel ${i + 1}`, row))
  inspection.personnelValidation.forEach((q, i) =>
    add(8, `7.2-${i + 1}`, '7.2 Validation', q.questionEn, q))

  return items
}

function pdfPageCaption(pdf: PdfEvidence, pageNumber: number): string {
  const base = pdf.caption ? `${pdf.caption} - ${pdf.fileName}` : pdf.fileName
  return `${base} (Pag. ${pageNumber}/${pdf.pageCount})`
}

/** Photos keep their current numbering; each PDF page continues the item's sequence after them. */
export function buildFigureMap(inspection: Inspection): FigureEntry[] {
  const entries: FigureEntry[] = []

  for (const item of listEvidenceItems(inspection)) {
    let n = 0
    for (const photo of item.photos) {
      entries.push({
        figureId: `Fig. ${item.sectionCode}-${++n}`,
        source: { kind: 'photo', photo },
        caption: photo.caption || '',
        timestamp: photo.timestamp,
        sectionLabel: item.sectionLabel,
        itemLabel: item.itemLabel,
      })
    }
    for (const pdf of item.pdfs) {
      for (let p = 1; p <= pdf.pageCount; p++) {
        entries.push({
          figureId: `Fig. ${item.sectionCode}-${++n}`,
          source: { kind: 'pdfPage', pdf, pageNumber: p },
          caption: pdfPageCaption(pdf, p),
          timestamp: pdf.timestamp,
          sectionLabel: item.sectionLabel,
          itemLabel: item.itemLabel,
        })
      }
    }
  }

  return entries
}
