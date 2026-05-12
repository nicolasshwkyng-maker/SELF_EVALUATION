import type { Inspection } from '../types'
import { loadBlob } from '../db/indexeddb'
import {
  createPdfCtx, addPage, drawSectionHeader, drawText, drawDraftWatermark, sanitize,
  embedPhoto, MARGIN, CONTENT_W, PAGE_H, PAGE_W, COLORS,
} from './pdfHelpers'

const LINE_H = 11
const LABEL_W = 110

function formatDate(iso: string): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('es-CO') } catch { return iso }
}
function formatTs(iso: string): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString('es-CO') } catch { return iso }
}

export async function exportFormatB(inspection: Inspection, draft: boolean): Promise<Uint8Array> {
  const ctx = await createPdfCtx()

  // ── Page management ─────────────────────────────────────────────────────
  let currentPage = addPage(ctx)
  let y = PAGE_H - MARGIN

  const newPage = () => {
    currentPage = addPage(ctx)
    y = PAGE_H - MARGIN
  }

  const ensure = (needed: number) => {
    if (y - needed < MARGIN + 16) newPage()
  }

  // ── Drawing helpers ──────────────────────────────────────────────────────
  const heading = (text: string) => {
    ensure(18)
    y = drawSectionHeader(currentPage.page, ctx, y, text)
    y -= 5
  }

  const field = (label: string, value: string) => {
    if (!value) return
    ensure(LINE_H + 2)
    currentPage.page.drawText(sanitize(label), {
      x: MARGIN, y, size: 6, font: ctx.bold, color: COLORS.darkGray,
    })
    // Value rendered to the right of label, with wrapping
    const valueX = MARGIN + LABEL_W
    const valueW = CONTENT_W - LABEL_W
    const lines = wrapText(sanitize(value), valueW, ctx.regular, 7)
    lines.forEach((line, i) => {
      if (i > 0) ensure(8)
      currentPage.page.drawText(line, { x: valueX, y, size: 7, font: ctx.regular, color: COLORS.black })
      if (i < lines.length - 1) y -= 9
    })
    y -= LINE_H
  }

  const badge = (label: string, value: 'yes' | 'no' | 'na' | null) => {
    if (value === null) return
    ensure(LINE_H)
    const text = value === 'yes' ? 'SI / YES' : value === 'no' ? 'NO / NO' : 'N/A'
    const bgColor = value === 'yes' ? COLORS.white : value === 'no' ? COLORS.white : COLORS.lightGray
    currentPage.page.drawText(sanitize(label), { x: MARGIN, y, size: 6, font: ctx.bold, color: COLORS.darkGray })
    const bx = MARGIN + LABEL_W
    currentPage.page.drawRectangle({ x: bx, y: y - 7, width: 30, height: 9, color: bgColor, borderColor: COLORS.darkGray, borderWidth: 0.5 })
    currentPage.page.drawText(text, { x: bx + 2, y: y - 4, size: 5.5, font: ctx.bold, color: COLORS.black })
    y -= LINE_H
  }

  const separator = () => {
    ensure(6)
    currentPage.page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_W, y }, thickness: 0.3, color: COLORS.lightGray })
    y -= 6
  }

  const photos = async (photoList: typeof inspection.housing[0]['photos']) => {
    if (!photoList || photoList.length === 0) return
    const maxW = (CONTENT_W - 8) / 2
    const maxH = 110
    let col = 0
    let rowTopY = y

    for (const photo of photoList) {
      const blob = await loadBlob(photo.blobKey)
      if (!blob) continue
      const emb = await embedPhoto(ctx, blob, maxW, maxH)
      if (!emb) continue

      ensure(maxH + 20)
      if (col === 0) rowTopY = y

      const px = MARGIN + col * (maxW + 8)
      const photoY = y - emb.h

      currentPage.page.drawImage(emb.image, { x: px, y: photoY, width: emb.w, height: emb.h })

      if (photo.caption) {
        currentPage.page.drawText(sanitize(photo.caption), {
          x: px, y: photoY - 5, size: 5.5, font: ctx.regular, color: COLORS.darkGray,
        })
      }
      currentPage.page.drawText(formatTs(photo.timestamp), {
        x: px, y: photoY - (photo.caption ? 12 : 5), size: 5, font: ctx.regular, color: COLORS.darkGray,
      })

      col++
      if (col === 2) {
        col = 0
        y = photoY - (photo.caption ? 20 : 12)
      }
    }
    if (col !== 0) {
      y = y - maxH - 16
    }
    y -= 4
  }

  // ── Helper: text wrapping ────────────────────────────────────────────────
  function wrapText(text: string, maxW: number, font: typeof ctx.regular, size: number): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        lines.push(line)
        line = word
      } else {
        line = test
      }
    }
    if (line) lines.push(line)
    return lines.length > 0 ? lines : ['']
  }

  // ── COVER ────────────────────────────────────────────────────────────────
  y -= 10
  // Title block
  currentPage.page.drawRectangle({ x: MARGIN, y: y - 32, width: CONTENT_W, height: 34, color: COLORS.navyHeader })
  currentPage.page.drawText('Reporte de Evidencia', {
    x: MARGIN + 8, y: y - 12, size: 14, font: ctx.bold, color: COLORS.white,
  })
  currentPage.page.drawText('Evaluacion de Capacidades de Mantenimiento', {
    x: MARGIN + 8, y: y - 24, size: 9, font: ctx.regular, color: COLORS.white,
  })
  y -= 42

  // Cover fields
  y -= 8
  field('Taller / Workshop:', inspection.admin.workshopName)
  field('Fecha / Date:', formatDate(inspection.admin.requestDate))
  field('Responsable:', inspection.admin.responsibleForRequest)
  field('Componente:', inspection.componentId.description)
  field('P/N:', inspection.componentId.partNumber)
  field('ATA:', inspection.componentId.ata)
  field('Generado:', formatTs(new Date().toISOString()))
  y -= 6

  // ── SECTION 0 ─────────────────────────────────────────────────────────────
  heading('0. SECCION ADMINISTRATIVA / ADMINISTRATIVE SECTION')
  field('Encargado del taller:', inspection.admin.workshopName)
  field('Fecha de requerimiento:', formatDate(inspection.admin.requestDate))
  field('Responsable:', inspection.admin.responsibleForRequest)
  field('Capacidad / Rating:', inspection.admin.rating)
  badge('Verificado / Verify:', inspection.admin.ratingVerify)
  separator()

  // ── SECTION 1 ─────────────────────────────────────────────────────────────
  heading('1. IDENTIFICACION DEL COMPONENTE / COMPONENT IDENTIFICATION')
  field('Descripcion / Description:', inspection.componentId.description)
  field('Fabricante / Manufacturer:', inspection.componentId.manufacturer)
  field('Part Number:', inspection.componentId.partNumber)
  field('Alcance / Scope:', inspection.componentId.scope)
  field('ATA:', inspection.componentId.ata)
  field('Equipo aplicable:', inspection.componentId.applicableEquipment)
  separator()

  // ── SECTION 2.1 ───────────────────────────────────────────────────────────
  heading('2.1 EDIFICIOS / HOUSING')
  for (const item of inspection.housing) {
    ensure(18)
    const label = `${item.labelEn} / ${item.labelEs}`
    const labelLines = wrapText(sanitize(label), CONTENT_W, ctx.bold, 6.5)
    labelLines.forEach(line => {
      ensure(10)
      currentPage.page.drawText(line, { x: MARGIN, y, size: 6.5, font: ctx.bold, color: COLORS.black })
      y -= 9
    })
    field('Evidencia:', item.evidence)
    badge('Cumple / Complies:', item.compliance)
    await photos(item.photos)
    y -= 3
  }
  separator()

  // ── SECTION 2.2 ───────────────────────────────────────────────────────────
  heading('2.2 INSTALACIONES / FACILITIES')
  for (const item of inspection.facilities) {
    ensure(18)
    const label = `${item.labelEn} / ${item.labelEs}`
    const labelLines = wrapText(sanitize(label), CONTENT_W, ctx.bold, 6.5)
    labelLines.forEach(line => {
      ensure(10)
      currentPage.page.drawText(line, { x: MARGIN, y, size: 6.5, font: ctx.bold, color: COLORS.black })
      y -= 9
    })
    field('Evidencia:', item.evidence)
    badge('Cumple / Complies:', item.compliance)
    await photos(item.photos)
    y -= 3
  }
  separator()

  // ── SECTION 3 ─────────────────────────────────────────────────────────────
  heading('3. EQUIPOS / EQUIPMENT')
  if (inspection.tools.length === 0) {
    ensure(12)
    currentPage.page.drawText('Sin registros.', { x: MARGIN, y, size: 7, font: ctx.regular, color: COLORS.darkGray })
    y -= 12
  }
  for (const tool of inspection.tools) {
    ensure(20)
    field('Descripcion:', tool.description)
    field('Part Number:', tool.partNumber)
    if (tool.serialNumber) field('S/N:', tool.serialNumber)
    if (tool.calibrationExpiry) field('Venc. Calibracion:', formatDate(tool.calibrationExpiry))
    if (tool.toolKind) field('Tipo:', tool.toolKind.toUpperCase())
    await photos(tool.photos)
    separator()
  }

  heading('3.1 PREGUNTAS DE VALIDACION')
  for (const q of inspection.toolsValidation) {
    ensure(16)
    const qLines = wrapText(sanitize(`${q.questionEs} / ${q.questionEn}`), CONTENT_W, ctx.bold, 6.5)
    qLines.forEach(line => {
      ensure(10)
      currentPage.page.drawText(line, { x: MARGIN, y, size: 6.5, font: ctx.bold, color: COLORS.black })
      y -= 9
    })
    badge('Respuesta:', q.answer)
    await photos(q.photos)
    y -= 3
  }
  separator()

  // ── SECTION 4 ─────────────────────────────────────────────────────────────
  heading('4. MATERIAL')
  if (inspection.materials.length === 0) {
    ensure(12)
    currentPage.page.drawText('Sin registros.', { x: MARGIN, y, size: 7, font: ctx.regular, color: COLORS.darkGray })
    y -= 12
  }
  for (const mat of inspection.materials) {
    ensure(20)
    field('Descripcion:', mat.description)
    field('Part Number / Ref.:', mat.partNumberOrReference)
    if (mat.equivalent) field('Equivalente:', mat.equivalent)
    await photos(mat.photos)
    separator()
  }

  // ── SECTION 5 ─────────────────────────────────────────────────────────────
  heading('5. DATOS TECNICOS / TECHNICAL DATA')
  if (inspection.technicalData.length === 0) {
    ensure(12)
    currentPage.page.drawText('Sin registros.', { x: MARGIN, y, size: 7, font: ctx.regular, color: COLORS.darkGray })
    y -= 12
  }
  for (const td of inspection.technicalData) {
    ensure(20)
    field('Tipo de publicacion:', td.publicationDescription)
    field('No. Referencia:', td.reference)
    if (td.revNumber) field('Rev. No.:', td.revNumber)
    if (td.revDate) field('Fecha Rev.:', formatDate(td.revDate))
    await photos(td.photos)
    separator()
  }

  // ── SECTION 6 ─────────────────────────────────────────────────────────────
  heading('6. PROCESOS / PROCESSES')
  if (inspection.processes.length === 0) {
    ensure(12)
    currentPage.page.drawText('Sin registros.', { x: MARGIN, y, size: 7, font: ctx.regular, color: COLORS.darkGray })
    y -= 12
  }
  for (const pr of inspection.processes) {
    ensure(20)
    field('Proceso:', pr.processName)
    field('Identificacion:', pr.reference)
    if (pr.revNumber) field('Rev. No.:', pr.revNumber)
    if (pr.revDate) field('Fecha Rev.:', formatDate(pr.revDate))
    await photos(pr.photos)
    separator()
  }

  // ── SECTION 7 ─────────────────────────────────────────────────────────────
  heading('7. PERSONAL ENTRENADO / TRAINED PERSONNEL')
  if (inspection.trainedPersonnel.length === 0) {
    ensure(12)
    currentPage.page.drawText('Sin registros.', { x: MARGIN, y, size: 7, font: ctx.regular, color: COLORS.darkGray })
    y -= 12
  }
  for (const per of inspection.trainedPersonnel) {
    ensure(20)
    field('Nombre y cargo:', per.nameAndJobTitle)
    field('Licencia:', per.licenseNumber)
    if (per.specificTraining) field('Entrenamiento:', per.specificTraining)
    badge('Cumple / Complies:', per.compliance)
    await photos(per.photos)
    separator()
  }

  heading('7.2 PREGUNTAS DE VALIDACION')
  for (const q of inspection.personnelValidation) {
    ensure(16)
    const qLines = wrapText(sanitize(`${q.questionEs} / ${q.questionEn}`), CONTENT_W, ctx.bold, 6.5)
    qLines.forEach(line => {
      ensure(10)
      currentPage.page.drawText(line, { x: MARGIN, y, size: 6.5, font: ctx.bold, color: COLORS.black })
      y -= 9
    })
    badge('Respuesta:', q.answer)
    await photos(q.photos)
    y -= 3
  }
  separator()

  // ── SECTION 8 — Observations ──────────────────────────────────────────────
  if (inspection.observations) {
    heading('8. OBSERVACIONES / OBSERVATIONS')
    ensure(16)
    const obsLines = wrapText(sanitize(inspection.observations), CONTENT_W, ctx.regular, 7)
    obsLines.forEach(line => {
      ensure(10)
      currentPage.page.drawText(line, { x: MARGIN, y, size: 7, font: ctx.regular, color: COLORS.black })
      y -= 10
    })
    y -= 4
    separator()
  }

  // ── SECTION 9 — Contract Maintenance ─────────────────────────────────────
  heading('9. CONTRACT MAINTENANCE / MANTENIMIENTO CONTRATADO')
  if (inspection.contractMaintenance.services.length > 0) {
    // Table header
    ensure(14)
    currentPage.page.drawRectangle({ x: MARGIN, y: y - 10, width: CONTENT_W, height: 11, color: COLORS.lightGray })
    currentPage.page.drawText('TIPO DE SERVICIOS / SERVICE TYPE', { x: MARGIN + 2, y: y - 7, size: 5.5, font: ctx.bold, color: COLORS.black })
    currentPage.page.drawText('NORMA / STANDARD', { x: MARGIN + CONTENT_W * 0.5 + 2, y: y - 7, size: 5.5, font: ctx.bold, color: COLORS.black })
    y -= 12

    for (const svc of inspection.contractMaintenance.services) {
      ensure(10)
      currentPage.page.drawRectangle({ x: MARGIN, y: y - 9, width: CONTENT_W, height: 10, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
      currentPage.page.drawText(sanitize(svc.serviceType), { x: MARGIN + 2, y: y - 6.5, size: 6, font: ctx.regular, color: COLORS.black })
      currentPage.page.drawText(sanitize(svc.standard), { x: MARGIN + CONTENT_W * 0.5 + 2, y: y - 6.5, size: 6, font: ctx.regular, color: COLORS.black })
      y -= 10
    }
    y -= 4
  }

  // NDT Note
  ensure(28)
  currentPage.page.drawRectangle({ x: MARGIN, y: y - 26, width: CONTENT_W, height: 27, color: COLORS.lightGray, borderColor: COLORS.darkGray, borderWidth: 0.2 })
  currentPage.page.drawText('Mark / Note:', { x: MARGIN + 3, y: y - 7, size: 6, font: ctx.bold, color: COLORS.black })
  const ndtText = 'External companies performing NDT inspections must be certified by the Authority and subsequently accepted by the Quality Assurance Area / Las empresas externas que realizan la inspeccion NDT deberan estar certificadas ante la Autoridad y posteriormente aceptadas por el Area de Aseguramiento de la Calidad.'
  const ndtLines = wrapText(sanitize(ndtText), CONTENT_W - 10, ctx.regular, 5.5)
  ndtLines.slice(0, 3).forEach((line, i) => {
    currentPage.page.drawText(line, { x: MARGIN + 3, y: y - 14 - i * 6, size: 5.5, font: ctx.regular, color: COLORS.black })
  })
  y -= 30

  // Signatures — Maintenance + QC
  ensure(40)
  const sigW = (CONTENT_W - 6) / 2
  // Maintenance Responsible
  currentPage.page.drawRectangle({ x: MARGIN, y: y - 36, width: sigW, height: 37, borderColor: COLORS.darkGray, borderWidth: 0.3, color: COLORS.white })
  currentPage.page.drawText('MAINTENANCE RESPONSIBLE / RESPONSABLE DE MANTENIMIENTO', { x: MARGIN + 3, y: y - 7, size: 5, font: ctx.bold, color: COLORS.black })
  if (inspection.signatures.maintenanceResponsibleName) {
    currentPage.page.drawText(sanitize(inspection.signatures.maintenanceResponsibleName), { x: MARGIN + 3, y: y - 18, size: 6.5, font: ctx.regular, color: COLORS.black })
  }
  currentPage.page.drawText('APPROVED?', { x: MARGIN + 3, y: y - 28, size: 5, font: ctx.bold, color: COLORS.black })
  currentPage.page.drawText('YES', { x: MARGIN + 26, y: y - 28, size: 5, font: ctx.regular, color: COLORS.black })
  currentPage.page.drawRectangle({ x: MARGIN + 34, y: y - 32, width: 10, height: 8, borderColor: COLORS.darkGray, borderWidth: 0.3, color: COLORS.white })
  if (inspection.signatures.maintenanceApproved === 'yes') currentPage.page.drawText('X', { x: MARGIN + 36, y: y - 29, size: 6, font: ctx.bold, color: COLORS.black })
  currentPage.page.drawText('NO', { x: MARGIN + 48, y: y - 28, size: 5, font: ctx.regular, color: COLORS.black })
  currentPage.page.drawRectangle({ x: MARGIN + 56, y: y - 32, width: 10, height: 8, borderColor: COLORS.darkGray, borderWidth: 0.3, color: COLORS.white })
  if (inspection.signatures.maintenanceApproved === 'no') currentPage.page.drawText('X', { x: MARGIN + 58, y: y - 29, size: 6, font: ctx.bold, color: COLORS.black })

  // Quality Control
  const qcX = MARGIN + sigW + 6
  currentPage.page.drawRectangle({ x: qcX, y: y - 36, width: sigW, height: 37, borderColor: COLORS.darkGray, borderWidth: 0.3, color: COLORS.white })
  currentPage.page.drawText('QUALITY CONTROL RESPONSIBLE / RESPONSABLE CONTROL CALIDAD', { x: qcX + 3, y: y - 7, size: 5, font: ctx.bold, color: COLORS.black })
  if (inspection.signatures.qualityControlResponsibleName) {
    currentPage.page.drawText(sanitize(inspection.signatures.qualityControlResponsibleName), { x: qcX + 3, y: y - 18, size: 6.5, font: ctx.regular, color: COLORS.black })
  }
  currentPage.page.drawText('APPROVED?', { x: qcX + 3, y: y - 28, size: 5, font: ctx.bold, color: COLORS.black })
  currentPage.page.drawText('YES', { x: qcX + 26, y: y - 28, size: 5, font: ctx.regular, color: COLORS.black })
  currentPage.page.drawRectangle({ x: qcX + 34, y: y - 32, width: 10, height: 8, borderColor: COLORS.darkGray, borderWidth: 0.3, color: COLORS.white })
  if (inspection.signatures.qualityControlApproved === 'yes') currentPage.page.drawText('X', { x: qcX + 36, y: y - 29, size: 6, font: ctx.bold, color: COLORS.black })
  currentPage.page.drawText('NO', { x: qcX + 48, y: y - 28, size: 5, font: ctx.regular, color: COLORS.black })
  currentPage.page.drawRectangle({ x: qcX + 56, y: y - 32, width: 10, height: 8, borderColor: COLORS.darkGray, borderWidth: 0.3, color: COLORS.white })
  if (inspection.signatures.qualityControlApproved === 'no') currentPage.page.drawText('X', { x: qcX + 58, y: y - 29, size: 6, font: ctx.bold, color: COLORS.black })
  y -= 40

  // ── SECTION 9 — Audit ────────────────────────────────────────────────────
  ensure(50)
  y = drawSectionHeader(currentPage.page, ctx, y, '9. AUDIT / AUDITORIA')
  y -= 5

  const auditNoteText = 'DETAILS OF THE AUDIT IS FOUND IN THE ANNEX (SAT-F649) - DETALLE DE LA AUDITORIA SE ENCUENTRA EN EL ANEXO (SAT-F649)'
  currentPage.page.drawText(sanitize(auditNoteText), { x: MARGIN + CONTENT_W / 2 - 100, y, size: 5.5, font: ctx.bold, color: COLORS.black })
  y -= 10

  // QA signature box
  ensure(40)
  currentPage.page.drawRectangle({ x: MARGIN, y: y - 36, width: CONTENT_W * 0.5 - 3, height: 37, borderColor: COLORS.darkGray, borderWidth: 0.3, color: COLORS.white })
  currentPage.page.drawRectangle({ x: MARGIN, y: y - 36, width: 60, height: 37, color: COLORS.navyHeader })
  currentPage.page.drawText('QUALITY', { x: MARGIN + 5, y: y - 14, size: 6, font: ctx.bold, color: COLORS.white })
  currentPage.page.drawText('ASSURANCE', { x: MARGIN + 3, y: y - 22, size: 6, font: ctx.bold, color: COLORS.white })
  if (inspection.signatures.qualityAssuranceName) {
    currentPage.page.drawText(sanitize(inspection.signatures.qualityAssuranceName), { x: MARGIN + 65, y: y - 18, size: 6.5, font: ctx.regular, color: COLORS.black })
  }
  currentPage.page.drawText('APPROVED?', { x: MARGIN + 65, y: y - 28, size: 5, font: ctx.bold, color: COLORS.black })
  currentPage.page.drawText('YES', { x: MARGIN + 92, y: y - 28, size: 5, font: ctx.regular, color: COLORS.black })
  currentPage.page.drawRectangle({ x: MARGIN + 102, y: y - 32, width: 10, height: 8, borderColor: COLORS.darkGray, borderWidth: 0.3, color: COLORS.white })
  if (inspection.signatures.qualityAssuranceApproved === 'yes') currentPage.page.drawText('X', { x: MARGIN + 104, y: y - 29, size: 6, font: ctx.bold, color: COLORS.black })
  currentPage.page.drawText('NO', { x: MARGIN + 116, y: y - 28, size: 5, font: ctx.regular, color: COLORS.black })
  currentPage.page.drawRectangle({ x: MARGIN + 122, y: y - 32, width: 10, height: 8, borderColor: COLORS.darkGray, borderWidth: 0.3, color: COLORS.white })
  if (inspection.signatures.qualityAssuranceApproved === 'no') currentPage.page.drawText('X', { x: MARGIN + 124, y: y - 29, size: 6, font: ctx.bold, color: COLORS.black })
  y -= 44

  // ── Footers ───────────────────────────────────────────────────────────────
  const totalPages = ctx.doc.getPageCount()
  const ts = formatTs(new Date().toISOString())
  for (let i = 0; i < totalPages; i++) {
    const pg = ctx.doc.getPage(i)
    pg.drawText(`Generado ${sanitize(ts)} — Documento de evidencia objetiva | Pag. ${i + 1} / ${totalPages}`, {
      x: MARGIN, y: MARGIN - 10, size: 5.5, font: ctx.regular, color: COLORS.darkGray,
    })
    // Page border
    pg.drawRectangle({ x: MARGIN - 2, y: MARGIN - 14, width: CONTENT_W + 4, height: PAGE_H - MARGIN * 2 + 14, borderColor: COLORS.lightGray, borderWidth: 0.5 })
    if (draft) drawDraftWatermark(pg, ctx)
  }

  return ctx.doc.save()
}
