import type { Inspection, PhotoEvidence } from '../types'

export interface FigureEntry {
  figureId: string   // e.g. "Fig. 2.1-1"
  photo: PhotoEvidence
  sectionLabel: string
  itemLabel: string
}

export function buildFigureMap(inspection: Inspection): FigureEntry[] {
  const entries: FigureEntry[] = []

  const addPhotos = (photos: PhotoEvidence[], sectionCode: string, sectionLabel: string, itemLabel: string) => {
    photos.forEach((photo, idx) => {
      entries.push({
        figureId: `Fig. ${sectionCode}-${idx + 1}`,
        photo,
        sectionLabel,
        itemLabel,
      })
    })
  }

  inspection.housing.forEach((item, i) => {
    addPhotos(item.photos, `2.1-${i + 1}`, '2.1 Housing', `${item.labelEn} / ${item.labelEs}`)
  })

  inspection.facilities.forEach((item, i) => {
    addPhotos(item.photos, `2.2-${i + 1}`, '2.2 Facilities', `${item.labelEn} / ${item.labelEs}`)
  })

  inspection.tools.forEach((row, i) => {
    addPhotos(row.photos, `3-${i + 1}`, '3. Equipment', row.description || `Tool ${i + 1}`)
  })

  inspection.toolsValidation.forEach((q, i) => {
    addPhotos(q.photos, `3.1-${i + 1}`, '3.1 Validation', q.questionEn)
  })

  inspection.materials.forEach((row, i) => {
    addPhotos(row.photos, `4-${i + 1}`, '4. Material', row.description || `Material ${i + 1}`)
  })

  inspection.technicalData.forEach((row, i) => {
    addPhotos(row.photos, `5-${i + 1}`, '5. Technical Data', row.publicationDescription || `Publication ${i + 1}`)
  })

  inspection.processes.forEach((row, i) => {
    addPhotos(row.photos, `6-${i + 1}`, '6. Processes', row.processName || `Process ${i + 1}`)
  })

  inspection.trainedPersonnel.forEach((row, i) => {
    addPhotos(row.photos, `7-${i + 1}`, '7. Personnel', row.nameAndJobTitle || `Personnel ${i + 1}`)
  })

  inspection.personnelValidation.forEach((q, i) => {
    addPhotos(q.photos, `7.2-${i + 1}`, '7.2 Validation', q.questionEn)
  })

  return entries
}
