import type { Inspection } from '../types'
import { buildFigureMap } from '../utils/figureNumbering'
import {
  createPdfCtx, addPage, drawHeaderBox, drawSectionHeader, drawText, drawCompliance,
  drawVerifyRow, drawDraftWatermark, sanitize,
  MARGIN, CONTENT_W, PAGE_H, COLORS,
} from './pdfHelpers'
import { buildPhotoAnnex } from './photoAnnex'

function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}

// Two-pass: first build content pages, then inject page numbers
export async function exportFormatA(inspection: Inspection, draft: boolean): Promise<Uint8Array> {
  const ctx = await createPdfCtx()
  const figures = buildFigureMap(inspection)

  // ── PAGE 1 ──────────────────────────────────────────────────────────────
  const { page: p1, setY: sy1 } = addPage(ctx)
  let y = PAGE_H - MARGIN - 30

  // Section 0 — Administrative
  y = drawSectionHeader(p1, ctx, y, '0. ADMINISTRATIVE SECTION / SECCION ADMINISTRATIVA')
  y -= 4
  p1.drawText('NAME OF THE WORKSHOP LIDER / NOMBRE DEL ENCARGADO DEL TALLER', { x: MARGIN, y, size: 6, font: ctx.bold, color: COLORS.black })
  p1.drawText(sanitize(inspection.admin.workshopName), { x: MARGIN, y: y - 8, size: 7, font: ctx.regular, color: COLORS.black })
  p1.drawText('REQUEST DATE / FECHA DE REQUERIMIENTO', { x: MARGIN + CONTENT_W * 0.6, y, size: 6, font: ctx.bold, color: COLORS.black })
  p1.drawText(formatDate(inspection.admin.requestDate), { x: MARGIN + CONTENT_W * 0.6, y: y - 8, size: 7, font: ctx.regular, color: COLORS.black })
  y -= 18
  p1.drawText('RESPONSIBLE FOR THE REQUEST / RESPONSABLE DEL REQUERIMIENTO', { x: MARGIN, y, size: 6, font: ctx.bold, color: COLORS.black })
  p1.drawText(sanitize(inspection.admin.responsibleForRequest), { x: MARGIN, y: y - 8, size: 7, font: ctx.regular, color: COLORS.black })
  y -= 18
  p1.drawText('RATING / CAPACIDAD', { x: MARGIN, y, size: 6, font: ctx.bold, color: COLORS.black })
  p1.drawText(sanitize(inspection.admin.rating), { x: MARGIN, y: y - 8, size: 7, font: ctx.regular, color: COLORS.black })
  p1.drawText('VERIFY / VERIFICADO', { x: MARGIN + CONTENT_W * 0.6, y, size: 6, font: ctx.bold, color: COLORS.black })
  drawCompliance(p1, ctx, inspection.admin.ratingVerify, MARGIN + CONTENT_W * 0.6, y - 6)
  y -= 20

  // Section 1 — Component Identification
  y = drawSectionHeader(p1, ctx, y, '1. COMPONENT IDENTIFICATION / IDENTIFICACION DEL COMPONENTE')
  y -= 4
  const c = inspection.componentId
  const col2x = MARGIN + CONTENT_W * 0.45
  p1.drawText('DESCRIPTION / DESCRIPCION', { x: MARGIN, y, size: 6, font: ctx.bold, color: COLORS.black })
  p1.drawText(sanitize(c.description), { x: MARGIN, y: y - 7, size: 7, font: ctx.regular, color: COLORS.black })
  p1.drawText('MANUFACTURER / FABRICANTE', { x: col2x, y, size: 6, font: ctx.bold, color: COLORS.black })
  p1.drawText(sanitize(c.manufacturer), { x: col2x, y: y - 7, size: 7, font: ctx.regular, color: COLORS.black })
  y -= 16
  p1.drawText('PART NUMBER / PARTE NUMERO', { x: MARGIN, y, size: 6, font: ctx.bold, color: COLORS.black })
  p1.drawText(sanitize(c.partNumber), { x: MARGIN, y: y - 7, size: 7, font: ctx.regular, color: COLORS.black })
  p1.drawText('SCOPE / ALCANCE', { x: col2x, y, size: 6, font: ctx.bold, color: COLORS.black })
  p1.drawText(sanitize(c.scope), { x: col2x, y: y - 7, size: 7, font: ctx.regular, color: COLORS.black })
  y -= 16
  p1.drawText('ATA / ATA', { x: MARGIN, y, size: 6, font: ctx.bold, color: COLORS.black })
  p1.drawText(sanitize(c.ata), { x: MARGIN, y: y - 7, size: 7, font: ctx.regular, color: COLORS.black })
  p1.drawText('APPLICABLE EQUIPMENT / EQUIPO APLICABLE', { x: col2x, y, size: 6, font: ctx.bold, color: COLORS.black })
  p1.drawText(sanitize(c.applicableEquipment), { x: col2x, y: y - 7, size: 7, font: ctx.regular, color: COLORS.black })
  y -= 14
  y = drawVerifyRow(p1, ctx, y, c.verify)

  // Section 2.1 — Housing
  y = drawSectionHeader(p1, ctx, y, '2. HOUSING & FACILITIES / EDIFICIOS E INSTALACIONES')
  y = drawSectionHeader(p1, ctx, y, '2.1 HOUSING / EDIFICIOS')
  y -= 2

  // Table header
  const colReq = MARGIN
  const colEvid = MARGIN + CONTENT_W * 0.55
  const colYes = MARGIN + CONTENT_W * 0.82
  const colNo = MARGIN + CONTENT_W * 0.9

  p1.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  p1.drawText('REQUIREMENTS / REQUERIMIENTOS', { x: colReq + 2, y: y - 8, size: 5.5, font: ctx.bold, color: COLORS.black })
  p1.drawText('EVIDENCE / EVIDENCIA', { x: colEvid, y: y - 8, size: 5.5, font: ctx.bold, color: COLORS.black })
  p1.drawText('CUMPLE / COMPLIES', { x: colYes, y: y - 5, size: 5, font: ctx.bold, color: COLORS.black })
  p1.drawText('YES / SI', { x: colYes, y: y - 10, size: 4.5, font: ctx.regular, color: COLORS.black })
  p1.drawText('NO / NO', { x: colNo, y: y - 10, size: 4.5, font: ctx.regular, color: COLORS.black })
  y -= 13

  for (let i = 0; i < inspection.housing.length; i++) {
    const item = inspection.housing[i]
    const rowH = 18
    p1.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    const reqText = `${item.labelEn} / ${item.labelEs}`
    drawText(p1, reqText, colReq + 2, y - 5, 5.5, ctx.regular, COLORS.black, colEvid - colReq - 8)
    drawText(p1, sanitize(item.evidence), colEvid, y - 5, 5.5, ctx.regular, COLORS.black, colYes - colEvid - 4)
    if (item.compliance === 'yes') p1.drawText('X', { x: colYes + 3, y: y - 9, size: 7, font: ctx.bold, color: COLORS.black })
    if (item.compliance === 'no') p1.drawText('X', { x: colNo + 3, y: y - 9, size: 7, font: ctx.bold, color: COLORS.black })
    y -= rowH
  }
  y = drawVerifyRow(p1, ctx, y, inspection.sectionVerify.housing)

  // Section 2.2 — Facilities
  y = drawSectionHeader(p1, ctx, y, '2.2 FACILITIES / INSTALACIONES')
  y -= 2
  p1.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  p1.drawText('REQUIREMENTS / REQUERIMIENTOS', { x: colReq + 2, y: y - 8, size: 5.5, font: ctx.bold, color: COLORS.black })
  p1.drawText('EVIDENCE / EVIDENCIA', { x: colEvid, y: y - 8, size: 5.5, font: ctx.bold, color: COLORS.black })
  p1.drawText('CUMPLE / COMPLIES', { x: colYes, y: y - 5, size: 5, font: ctx.bold, color: COLORS.black })
  p1.drawText('YES / SI', { x: colYes, y: y - 10, size: 4.5, font: ctx.regular, color: COLORS.black })
  p1.drawText('NO / NO', { x: colNo, y: y - 10, size: 4.5, font: ctx.regular, color: COLORS.black })
  y -= 13

  for (const item of inspection.facilities) {
    const rowH = 22
    if (y - rowH < MARGIN + 60) {
      // Overflow protection — truncate for now (format A is dense)
      break
    }
    p1.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    const reqText = `${item.labelEn} / ${item.labelEs}`
    drawText(p1, reqText, colReq + 2, y - 5, 5.5, ctx.regular, COLORS.black, colEvid - colReq - 8)
    drawText(p1, sanitize(item.evidence), colEvid, y - 5, 5.5, ctx.regular, COLORS.black, colYes - colEvid - 4)
    if (item.compliance === 'yes') p1.drawText('X', { x: colYes + 3, y: y - 11, size: 7, font: ctx.bold, color: COLORS.black })
    if (item.compliance === 'no') p1.drawText('X', { x: colNo + 3, y: y - 11, size: 7, font: ctx.bold, color: COLORS.black })
    if (item.compliance === 'na') { p1.drawText('N/A', { x: colYes + 1, y: y - 11, size: 5.5, font: ctx.bold, color: COLORS.black }) }
    y -= rowH
  }
  y = drawVerifyRow(p1, ctx, y, inspection.sectionVerify.facilities)
  sy1(y)

  // ── PAGE 2 ──────────────────────────────────────────────────────────────
  const { page: p2, setY: sy2 } = addPage(ctx)
  y = PAGE_H - MARGIN - 30

  // Section 3 — Equipment
  y = drawSectionHeader(p2, ctx, y, '3. EQUIPMENT (TOOLS, SPECIAL TOOLS AND EQUIVALENT TOOLS) / EQUIPOS')
  y -= 2

  const tDesc = MARGIN, tPn = MARGIN + CONTENT_W * 0.28, tSn = MARGIN + CONTENT_W * 0.46
  const tCal = MARGIN + CONTENT_W * 0.60, tKind = MARGIN + CONTENT_W * 0.82

  p2.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  p2.drawText('DESCRIPTION / DESCRIPCION', { x: tDesc + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  p2.drawText('PART NUMBER / PARTE NUMERO', { x: tPn + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  p2.drawText('S/N', { x: tSn + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  p2.drawText('CALIBRATION EXPIRATION DATE', { x: tCal + 1, y: y - 6, size: 4.5, font: ctx.bold, color: COLORS.black })
  p2.drawText('FECHA DE VENCIMIENTO DE CALIBRACION', { x: tCal + 1, y: y - 10.5, size: 4, font: ctx.regular, color: COLORS.black })
  p2.drawText('KIND OF TOOL / TIPO', { x: tKind + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  y -= 13

  for (const tool of inspection.tools) {
    const rowH = 9
    if (y - rowH < MARGIN + 40) break
    p2.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    p2.drawText(sanitize(tool.description.slice(0, 38)), { x: tDesc + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    p2.drawText(sanitize(tool.partNumber.slice(0, 20)), { x: tPn + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    p2.drawText(sanitize((tool.serialNumber || 'N/A').slice(0, 10)), { x: tSn + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    p2.drawText(sanitize(tool.calibrationExpiry ? formatDate(tool.calibrationExpiry) : 'N/A'), { x: tCal + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    p2.drawText(sanitize((tool.toolKind || '').toUpperCase()), { x: tKind + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    y -= rowH
  }
  y = drawVerifyRow(p2, ctx, y, inspection.sectionVerify.tools)

  // 3.1 Validation
  y = drawSectionHeader(p2, ctx, y, '3.1 PREGUNTAS DE VALIDACION / VALIDATION QUESTION')
  y -= 2
  p2.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  p2.drawText('CUMPLE / COMPLIES', { x: MARGIN + CONTENT_W - 55, y: y - 5, size: 5, font: ctx.bold, color: COLORS.black })
  p2.drawText('YES / SI', { x: MARGIN + CONTENT_W - 52, y: y - 10, size: 4.5, font: ctx.regular, color: COLORS.black })
  p2.drawText('NO / NO', { x: MARGIN + CONTENT_W - 30, y: y - 10, size: 4.5, font: ctx.regular, color: COLORS.black })
  y -= 13
  inspection.toolsValidation.forEach((q, i) => {
    p2.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    p2.drawText(`${i + 1}-`, { x: MARGIN + 2, y: y - 8, size: 6, font: ctx.bold, color: COLORS.black })
    drawText(p2, `${q.questionEn} / ${q.questionEs}`, MARGIN + 12, y - 5, 5.5, ctx.regular, COLORS.black, CONTENT_W - 70)
    if (q.answer === 'yes') p2.drawText('X', { x: MARGIN + CONTENT_W - 47, y: y - 8, size: 7, font: ctx.bold, color: COLORS.black })
    if (q.answer === 'no') p2.drawText('X', { x: MARGIN + CONTENT_W - 25, y: y - 8, size: 7, font: ctx.bold, color: COLORS.black })
    y -= 13
  })

  // Section 4 — Material
  y = drawSectionHeader(p2, ctx, y, '4. MATERIAL / MATERIAL')
  y -= 2
  const mDesc = MARGIN, mPn = MARGIN + CONTENT_W * 0.40, mEq = MARGIN + CONTENT_W * 0.70
  p2.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  p2.drawText('DESCRIPTION / DESCRIPCION', { x: mDesc + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  p2.drawText('PART NUMBER / REFERENCE', { x: mPn + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  p2.drawText('EQUIVALENT / EQUIVALENTE', { x: mEq + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  y -= 13
  for (const mat of inspection.materials) {
    const rowH = 9
    if (y - rowH < MARGIN + 30) break
    p2.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    p2.drawText(sanitize(mat.description.slice(0, 35)), { x: mDesc + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    p2.drawText(sanitize(mat.partNumberOrReference.slice(0, 25)), { x: mPn + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    p2.drawText(sanitize((mat.equivalent || '').slice(0, 20)), { x: mEq + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    y -= rowH
  }
  y = drawVerifyRow(p2, ctx, y, inspection.sectionVerify.materials)
  sy2(y)

  // ── PAGE 3 ──────────────────────────────────────────────────────────────
  const { page: p3, setY: sy3 } = addPage(ctx)
  y = PAGE_H - MARGIN - 30

  // Section 5 — Technical Data
  y = drawSectionHeader(p3, ctx, y, '5. TECHNICAL DATA / DATOS TECNICOS')
  y -= 2
  const tdType = MARGIN, tdRef = MARGIN + CONTENT_W * 0.42, tdRev = MARGIN + CONTENT_W * 0.68, tdDate = MARGIN + CONTENT_W * 0.82
  p3.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  p3.drawText('PUBLICATION TYPE / TIPO DE PUBLICACION', { x: tdType + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  p3.drawText('REFERENCE No. / No. DE REFERENCIA', { x: tdRef + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  p3.drawText('REV. No.', { x: tdRev + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  p3.drawText('REV. DATE / FECHA', { x: tdDate + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  y -= 13
  for (const td of inspection.technicalData) {
    const rowH = 9
    if (y - rowH < MARGIN + 30) break
    p3.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    p3.drawText(sanitize(td.publicationDescription.slice(0, 30)), { x: tdType + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    p3.drawText(sanitize(td.reference.slice(0, 20)), { x: tdRef + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    p3.drawText(sanitize(td.revNumber || ''), { x: tdRev + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    p3.drawText(sanitize(td.revDate ? formatDate(td.revDate) : ''), { x: tdDate + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    y -= rowH
  }
  y = drawVerifyRow(p3, ctx, y, inspection.sectionVerify.technicalData)

  // Section 6 — Processes
  y = drawSectionHeader(p3, ctx, y, '6. PROCESSES / PROCESO')
  y -= 2
  const prName = MARGIN, prId = MARGIN + CONTENT_W * 0.38, prRev = MARGIN + CONTENT_W * 0.68, prDate = MARGIN + CONTENT_W * 0.82
  p3.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  p3.drawText('NAME OF PROCESSES / NOMBRE DEL PROCESO', { x: prName + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  p3.drawText('FORMAT IDENTIFICATION / IDENTIFICACION', { x: prId + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  p3.drawText('REV. No.', { x: prRev + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  p3.drawText('REV. DATE', { x: prDate + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  y -= 13
  for (const pr of inspection.processes) {
    const rowH = 9
    if (y - rowH < MARGIN + 30) break
    p3.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    p3.drawText(sanitize(pr.processName.slice(0, 30)), { x: prName + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    p3.drawText(sanitize(pr.reference.slice(0, 20)), { x: prId + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    p3.drawText(sanitize(pr.revNumber || ''), { x: prRev + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    p3.drawText(sanitize(pr.revDate ? formatDate(pr.revDate) : ''), { x: prDate + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    y -= rowH
  }
  y = drawVerifyRow(p3, ctx, y, inspection.sectionVerify.processes)

  // Section 7 — Personnel
  y = drawSectionHeader(p3, ctx, y, '7. TRAINED PERSONNEL / ENTRENAMIENTO DE PERSONAL')
  y -= 2
  const pName = MARGIN, pLic = MARGIN + CONTENT_W * 0.38, pTrain = MARGIN + CONTENT_W * 0.58, pYes = MARGIN + CONTENT_W * 0.82, pNo = MARGIN + CONTENT_W * 0.91
  p3.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  p3.drawText('7.1 REQUERIMIENTO / REQUIREMENT', { x: MARGIN + CONTENT_W / 2 - 30, y: y - 8, size: 5.5, font: ctx.bold, color: COLORS.black })
  y -= 13
  p3.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  p3.drawText('NAME / JOB TITLE / NOMBRE Y CARGO', { x: pName + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  p3.drawText('LICENSES / LICENCIA', { x: pLic + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  p3.drawText('SPECIFIC TRAINING/ ENTRENAMIENTO ESPECIAL', { x: pTrain + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  p3.drawText('CUMPLE/COMPLIES', { x: pYes + 1, y: y - 5, size: 4.5, font: ctx.bold, color: COLORS.black })
  p3.drawText('YES / SI', { x: pYes + 1, y: y - 10, size: 4, font: ctx.regular, color: COLORS.black })
  p3.drawText('NO / NO', { x: pNo + 1, y: y - 10, size: 4, font: ctx.regular, color: COLORS.black })
  y -= 13
  for (const per of inspection.trainedPersonnel) {
    const rowH = 9
    if (y - rowH < MARGIN + 30) break
    p3.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    p3.drawText(sanitize(per.nameAndJobTitle.slice(0, 30)), { x: pName + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    p3.drawText(sanitize(per.licenseNumber.slice(0, 15)), { x: pLic + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    p3.drawText(sanitize((per.specificTraining || '').slice(0, 30)), { x: pTrain + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    if (per.compliance === 'yes') p3.drawText('X', { x: pYes + 3, y: y - 6.5, size: 7, font: ctx.bold, color: COLORS.black })
    if (per.compliance === 'no') p3.drawText('X', { x: pNo + 3, y: y - 6.5, size: 7, font: ctx.bold, color: COLORS.black })
    y -= rowH
  }
  y = drawVerifyRow(p3, ctx, y, inspection.sectionVerify.personnel)

  // 7.2 Validation
  y = drawSectionHeader(p3, ctx, y, '7.2. PREGUNTAS DE VALIDACION / VALIDATION QUESTION')
  y -= 2
  p3.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  p3.drawText('CUMPLE / COMPLIES', { x: MARGIN + CONTENT_W - 55, y: y - 5, size: 5, font: ctx.bold, color: COLORS.black })
  p3.drawText('YES / SI', { x: MARGIN + CONTENT_W - 52, y: y - 10, size: 4.5, font: ctx.regular, color: COLORS.black })
  p3.drawText('NO / NO', { x: MARGIN + CONTENT_W - 30, y: y - 10, size: 4.5, font: ctx.regular, color: COLORS.black })
  y -= 13
  inspection.personnelValidation.forEach((q, i) => {
    p3.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    p3.drawText(`${i + 1}-`, { x: MARGIN + 2, y: y - 8, size: 6, font: ctx.bold, color: COLORS.black })
    drawText(p3, `${q.questionEn} / ${q.questionEs}`, MARGIN + 12, y - 5, 5.5, ctx.regular, COLORS.black, CONTENT_W - 70)
    if (q.answer === 'yes') p3.drawText('X', { x: MARGIN + CONTENT_W - 47, y: y - 8, size: 7, font: ctx.bold, color: COLORS.black })
    if (q.answer === 'no') p3.drawText('X', { x: MARGIN + CONTENT_W - 25, y: y - 8, size: 7, font: ctx.bold, color: COLORS.black })
    y -= 13
  })

  // Section 8 — Observations
  y = drawSectionHeader(p3, ctx, y, '8. OBSERVATIONS / OBSERVACIONES')
  y -= 4
  if (inspection.observations) {
    drawText(p3, sanitize(inspection.observations), MARGIN, y, 6.5, ctx.regular, COLORS.black, CONTENT_W)
    y -= 30
  } else {
    y -= 40
  }

  sy3(y)

  // ── PAGE 4 ──────────────────────────────────────────────────────────────
  const { page: p4, setY: sy4 } = addPage(ctx)
  y = PAGE_H - MARGIN - 30

  // Section 9 — Contract Maintenance
  y = drawSectionHeader(p4, ctx, y, '9. CONTRACT MAINTENANCE / MANTENIMIENTO CONTRATADO')
  y -= 2

  const ctSvc = MARGIN
  const ctStd = MARGIN + CONTENT_W * 0.55

  p4.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  p4.drawText('SERVICE TYPE / TIPO DE SERVICIO', { x: ctSvc + 2, y: y - 8, size: 5.5, font: ctx.bold, color: COLORS.black })
  p4.drawText('STANDARD / ESTANDAR', { x: ctStd + 2, y: y - 8, size: 5.5, font: ctx.bold, color: COLORS.black })
  y -= 13

  const services = inspection.contractMaintenance?.services ?? []
  if (services.length === 0) {
    p4.drawRectangle({ x: MARGIN, y: y - 9, width: CONTENT_W, height: 9, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    p4.drawText('N/A', { x: MARGIN + 3, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    y -= 9
  } else {
    for (const svc of services) {
      const rowH = 9
      if (y - rowH < MARGIN + 40) break
      p4.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
      p4.drawText(sanitize(svc.serviceType.slice(0, 45)), { x: ctSvc + 2, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
      p4.drawText(sanitize(svc.standard.slice(0, 35)), { x: ctStd + 2, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
      y -= rowH
    }
  }
  y -= 4

  // NDT note box
  const ndtNote = 'NOTE: If the company has NDT capabilities these must be included in the scope of the SAT-F743 evaluation. / NOTA: Si la empresa tiene capacidades de NDT estas deben ser incluidas en el alcance de la evaluacion SAT-F743.'
  p4.drawRectangle({ x: MARGIN, y: y - 22, width: CONTENT_W, height: 23, color: COLORS.lightGray, borderColor: COLORS.darkGray, borderWidth: 0.3 })
  drawText(p4, ndtNote, MARGIN + 3, y - 4, 5, ctx.regular, COLORS.black, CONTENT_W - 6)
  y -= 28

  // Signature boxes — row 1: Maintenance Responsible + Quality Control
  y -= 4
  const sigW = (CONTENT_W - 8) / 2
  const sig2x = MARGIN + sigW + 8

  // Box 1: Maintenance Responsible
  p4.drawRectangle({ x: MARGIN, y: y - 60, width: sigW, height: 61, borderColor: COLORS.darkGray, borderWidth: 0.4, color: COLORS.white })
  p4.drawRectangle({ x: MARGIN, y: y - 12, width: sigW, height: 13, color: COLORS.navy })
  p4.drawText('MAINTENANCE RESPONSIBLE / RESPONSABLE DE MANTENIMIENTO', { x: MARGIN + 2, y: y - 9, size: 4.5, font: ctx.bold, color: COLORS.white })
  p4.drawText('NAME / NOMBRE:', { x: MARGIN + 2, y: y - 18, size: 5, font: ctx.bold, color: COLORS.black })
  p4.drawText(sanitize(inspection.signatures?.maintenanceResponsibleName ?? ''), { x: MARGIN + 2, y: y - 25, size: 6, font: ctx.regular, color: COLORS.black })
  p4.drawText('APPROVED / APROBADO:', { x: MARGIN + 2, y: y - 34, size: 5, font: ctx.bold, color: COLORS.black })
  // YES checkbox
  p4.drawRectangle({ x: MARGIN + 2, y: y - 48, width: 8, height: 8, borderColor: COLORS.darkGray, borderWidth: 0.5, color: COLORS.white })
  if (inspection.signatures?.maintenanceApproved === 'yes') p4.drawText('X', { x: MARGIN + 4, y: y - 46, size: 7, font: ctx.bold, color: COLORS.black })
  p4.drawText('YES / SI', { x: MARGIN + 12, y: y - 46, size: 5.5, font: ctx.regular, color: COLORS.black })
  // NO checkbox
  p4.drawRectangle({ x: MARGIN + 35, y: y - 48, width: 8, height: 8, borderColor: COLORS.darkGray, borderWidth: 0.5, color: COLORS.white })
  if (inspection.signatures?.maintenanceApproved === 'no') p4.drawText('X', { x: MARGIN + 37, y: y - 46, size: 7, font: ctx.bold, color: COLORS.black })
  p4.drawText('NO / NO', { x: MARGIN + 45, y: y - 46, size: 5.5, font: ctx.regular, color: COLORS.black })
  p4.drawText('SIGNATURE / FIRMA:', { x: MARGIN + 2, y: y - 56, size: 5, font: ctx.bold, color: COLORS.black })

  // Box 2: Quality Control Responsible
  p4.drawRectangle({ x: sig2x, y: y - 60, width: sigW, height: 61, borderColor: COLORS.darkGray, borderWidth: 0.4, color: COLORS.white })
  p4.drawRectangle({ x: sig2x, y: y - 12, width: sigW, height: 13, color: COLORS.navy })
  p4.drawText('QUALITY CONTROL RESPONSIBLE / RESPONSABLE DE CALIDAD', { x: sig2x + 2, y: y - 9, size: 4.5, font: ctx.bold, color: COLORS.white })
  p4.drawText('NAME / NOMBRE:', { x: sig2x + 2, y: y - 18, size: 5, font: ctx.bold, color: COLORS.black })
  p4.drawText(sanitize(inspection.signatures?.qualityControlResponsibleName ?? ''), { x: sig2x + 2, y: y - 25, size: 6, font: ctx.regular, color: COLORS.black })
  p4.drawText('APPROVED / APROBADO:', { x: sig2x + 2, y: y - 34, size: 5, font: ctx.bold, color: COLORS.black })
  p4.drawRectangle({ x: sig2x + 2, y: y - 48, width: 8, height: 8, borderColor: COLORS.darkGray, borderWidth: 0.5, color: COLORS.white })
  if (inspection.signatures?.qualityControlApproved === 'yes') p4.drawText('X', { x: sig2x + 4, y: y - 46, size: 7, font: ctx.bold, color: COLORS.black })
  p4.drawText('YES / SI', { x: sig2x + 12, y: y - 46, size: 5.5, font: ctx.regular, color: COLORS.black })
  p4.drawRectangle({ x: sig2x + 35, y: y - 48, width: 8, height: 8, borderColor: COLORS.darkGray, borderWidth: 0.5, color: COLORS.white })
  if (inspection.signatures?.qualityControlApproved === 'no') p4.drawText('X', { x: sig2x + 37, y: y - 46, size: 7, font: ctx.bold, color: COLORS.black })
  p4.drawText('NO / NO', { x: sig2x + 45, y: y - 46, size: 5.5, font: ctx.regular, color: COLORS.black })
  p4.drawText('SIGNATURE / FIRMA:', { x: sig2x + 2, y: y - 56, size: 5, font: ctx.bold, color: COLORS.black })

  y -= 68

  // Quality Assurance audit box (full width)
  y -= 4
  p4.drawRectangle({ x: MARGIN, y: y - 80, width: CONTENT_W, height: 81, borderColor: COLORS.darkGray, borderWidth: 0.4, color: COLORS.white })
  p4.drawRectangle({ x: MARGIN, y: y - 14, width: CONTENT_W, height: 15, color: COLORS.navy })
  p4.drawText('9. AUDIT BY QUALITY ASSURANCE / AUDITORIA POR ASEGURAMIENTO DE CALIDAD', { x: MARGIN + 3, y: y - 10, size: 5.5, font: ctx.bold, color: COLORS.white })
  p4.drawText('NAME / NOMBRE:', { x: MARGIN + 3, y: y - 22, size: 5.5, font: ctx.bold, color: COLORS.black })
  p4.drawText(sanitize(inspection.signatures?.qualityAssuranceName ?? ''), { x: MARGIN + 70, y: y - 22, size: 6, font: ctx.regular, color: COLORS.black })
  p4.drawText('APPROVED / APROBADO:', { x: MARGIN + 3, y: y - 35, size: 5.5, font: ctx.bold, color: COLORS.black })
  // YES
  p4.drawRectangle({ x: MARGIN + 3, y: y - 50, width: 10, height: 10, borderColor: COLORS.darkGray, borderWidth: 0.5, color: COLORS.white })
  if (inspection.signatures?.qualityAssuranceApproved === 'yes') p4.drawText('X', { x: MARGIN + 5, y: y - 48, size: 8, font: ctx.bold, color: COLORS.black })
  p4.drawText('YES / SI', { x: MARGIN + 16, y: y - 47, size: 6, font: ctx.regular, color: COLORS.black })
  // NO
  p4.drawRectangle({ x: MARGIN + 50, y: y - 50, width: 10, height: 10, borderColor: COLORS.darkGray, borderWidth: 0.5, color: COLORS.white })
  if (inspection.signatures?.qualityAssuranceApproved === 'no') p4.drawText('X', { x: MARGIN + 52, y: y - 48, size: 8, font: ctx.bold, color: COLORS.black })
  p4.drawText('NO / NO', { x: MARGIN + 63, y: y - 47, size: 6, font: ctx.regular, color: COLORS.black })
  p4.drawText('DATE / FECHA:', { x: MARGIN + 3, y: y - 62, size: 5.5, font: ctx.bold, color: COLORS.black })
  p4.drawText(formatDate(new Date().toISOString()), { x: MARGIN + 50, y: y - 62, size: 6, font: ctx.regular, color: COLORS.black })
  p4.drawText('SIGNATURE / FIRMA:', { x: MARGIN + 3, y: y - 75, size: 5.5, font: ctx.bold, color: COLORS.black })
  y -= 88

  sy4(y)

  // Add headers to all pages (two-pass for page numbers)
  const totalBodyPages = ctx.doc.getPageCount()
  const totalPhotos = figures.length
  const annexPages = Math.ceil(totalPhotos / 2)
  const totalPages = totalBodyPages + annexPages

  // Draw headers now that we know total
  ;[p1, p2, p3, p4].forEach((pg, i) => {
    drawHeaderBox(pg, ctx, i + 1, totalPages)
    if (draft) drawDraftWatermark(pg, ctx)
  })

  // Photo annex
  if (figures.length > 0) {
    await buildPhotoAnnex(ctx, figures, draft, totalBodyPages, totalPages)
  }

  return ctx.doc.save()
}
