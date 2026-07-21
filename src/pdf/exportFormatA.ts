import type { Inspection } from '../types'
import type { PDFPage } from 'pdf-lib'
import { buildFigureMap } from '../utils/figureNumbering'
import {
  createPdfCtx, addPage, drawHeaderBox, drawSectionHeader, drawText, drawCompliance,
  drawVerifyRow, drawDraftWatermark, sanitize,
  MARGIN, CONTENT_W, PAGE_H, HEADER_H, COLORS,
} from './pdfHelpers'
import { buildPhotoAnnex } from './photoAnnex'
import logoSrc from '../assets/satena-logo.png'

function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}

async function loadLogoImage(ctx: import('./pdfHelpers').PdfCtx) {
  try {
    const res = await fetch(logoSrc)
    if (!res.ok) return undefined
    return await ctx.doc.embedPng(new Uint8Array(await res.arrayBuffer()))
  } catch {
    return undefined
  }
}

const MIN_Y = MARGIN + 30

export async function exportFormatA(inspection: Inspection, draft: boolean): Promise<Uint8Array> {
  const ctx = await createPdfCtx()
  const figures = buildFigureMap(inspection)
  const logoImage = await loadLogoImage(ctx)

  // Track every body page so we can stamp headers at the end
  const bodyPages: PDFPage[] = []

  function newPage(): PDFPage {
    const { page } = addPage(ctx)
    bodyPages.push(page)
    return page
  }

  // Current page and y cursor — used for all flowing sections
  let cur: PDFPage
  let y: number

  function ensure(needed: number): void {
    if (y - needed < MIN_Y) {
      cur = newPage()
      y = PAGE_H - MARGIN - HEADER_H - 3
    }
  }

  // ── PAGE 1 ──────────────────────────────────────────────────────────────
  cur = newPage()
  y = PAGE_H - MARGIN - HEADER_H - 3

  // Section 0 — Administrative
  y = drawSectionHeader(cur, ctx, y, '0. ADMINISTRATIVE SECTION / SECCION ADMINISTRATIVA')
  y -= 4
  cur.drawText('NAME OF THE WORKSHOP LIDER / NOMBRE DEL ENCARGADO DEL TALLER', { x: MARGIN, y, size: 6, font: ctx.bold, color: COLORS.black })
  cur.drawText(sanitize(inspection.admin.workshopName), { x: MARGIN, y: y - 8, size: 7, font: ctx.regular, color: COLORS.black })
  cur.drawText('REQUEST DATE / FECHA DE REQUERIMIENTO', { x: MARGIN + CONTENT_W * 0.6, y, size: 6, font: ctx.bold, color: COLORS.black })
  cur.drawText(formatDate(inspection.admin.requestDate), { x: MARGIN + CONTENT_W * 0.6, y: y - 8, size: 7, font: ctx.regular, color: COLORS.black })
  y -= 18
  cur.drawText('RESPONSIBLE FOR THE REQUEST / RESPONSABLE DEL REQUERIMIENTO', { x: MARGIN, y, size: 6, font: ctx.bold, color: COLORS.black })
  cur.drawText(sanitize(inspection.admin.responsibleForRequest), { x: MARGIN, y: y - 8, size: 7, font: ctx.regular, color: COLORS.black })
  y -= 18
  cur.drawText('RATING / CAPACIDAD', { x: MARGIN, y, size: 6, font: ctx.bold, color: COLORS.black })
  cur.drawText(sanitize(inspection.admin.rating), { x: MARGIN, y: y - 8, size: 7, font: ctx.regular, color: COLORS.black })
  cur.drawText('VERIFY / VERIFICADO', { x: MARGIN + CONTENT_W * 0.6, y, size: 6, font: ctx.bold, color: COLORS.black })
  drawCompliance(cur, ctx, inspection.admin.ratingVerify, MARGIN + CONTENT_W * 0.6, y - 6)
  y -= 20

  // Section 1 — Component Identification
  y = drawSectionHeader(cur, ctx, y, '1. COMPONENT IDENTIFICATION / IDENTIFICACION DEL COMPONENTE')
  y -= 4
  const c = inspection.componentId
  const col2x = MARGIN + CONTENT_W * 0.45
  const colW1 = CONTENT_W * 0.45 - 4
  const colW2 = CONTENT_W * 0.55 - 4

  cur.drawText('DESCRIPTION / DESCRIPCION', { x: MARGIN, y, size: 6, font: ctx.bold, color: COLORS.black })
  const descH = drawText(cur, sanitize(c.description), MARGIN, y - 7, 7, ctx.regular, COLORS.black, colW1)
  cur.drawText('MANUFACTURER / FABRICANTE', { x: col2x, y, size: 6, font: ctx.bold, color: COLORS.black })
  const mfgH = drawText(cur, sanitize(c.manufacturer), col2x, y - 7, 7, ctx.regular, COLORS.black, colW2)
  y -= 7 + Math.max(descH, mfgH) + 4

  cur.drawText('PART NUMBER / PARTE NUMERO', { x: MARGIN, y, size: 6, font: ctx.bold, color: COLORS.black })
  const pnH = drawText(cur, sanitize(c.partNumber), MARGIN, y - 7, 7, ctx.regular, COLORS.black, colW1)
  cur.drawText('SCOPE / ALCANCE', { x: col2x, y, size: 6, font: ctx.bold, color: COLORS.black })
  const scopeH = drawText(cur, sanitize(c.scope), col2x, y - 7, 7, ctx.regular, COLORS.black, colW2)
  y -= 7 + Math.max(pnH, scopeH) + 4

  cur.drawText('ATA / ATA', { x: MARGIN, y, size: 6, font: ctx.bold, color: COLORS.black })
  const ataH = drawText(cur, sanitize(c.ata), MARGIN, y - 7, 7, ctx.regular, COLORS.black, colW1)
  cur.drawText('APPLICABLE EQUIPMENT / EQUIPO APLICABLE', { x: col2x, y, size: 6, font: ctx.bold, color: COLORS.black })
  const aeH = drawText(cur, sanitize(c.applicableEquipment), col2x, y - 7, 7, ctx.regular, COLORS.black, colW2)
  y -= 7 + Math.max(ataH, aeH) + 2
  y = drawVerifyRow(cur, ctx, y, c.verify)

  // Section 2.1 — Housing
  y = drawSectionHeader(cur, ctx, y, '2. HOUSING & FACILITIES / EDIFICIOS E INSTALACIONES')
  y = drawSectionHeader(cur, ctx, y, '2.1 HOUSING / EDIFICIOS')
  y -= 2

  const colReq = MARGIN
  const colEvid = MARGIN + CONTENT_W * 0.55
  const colYes = MARGIN + CONTENT_W * 0.82
  const colNo = MARGIN + CONTENT_W * 0.9

  cur.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  cur.drawText('REQUIREMENTS / REQUERIMIENTOS', { x: colReq + 2, y: y - 8, size: 5.5, font: ctx.bold, color: COLORS.black })
  cur.drawText('EVIDENCE / EVIDENCIA', { x: colEvid, y: y - 8, size: 5.5, font: ctx.bold, color: COLORS.black })
  cur.drawText('CUMPLE / COMPLIES', { x: colYes, y: y - 5, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawText('YES / SI', { x: colYes, y: y - 10, size: 4.5, font: ctx.regular, color: COLORS.black })
  cur.drawText('NO / NO', { x: colNo, y: y - 10, size: 4.5, font: ctx.regular, color: COLORS.black })
  y -= 13

  for (const item of inspection.housing) {
    const rowH = 18
    cur.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    drawText(cur, `${item.labelEn} / ${item.labelEs}`, colReq + 2, y - 5, 5.5, ctx.regular, COLORS.black, colEvid - colReq - 8)
    drawText(cur, sanitize(item.evidence), colEvid, y - 5, 5.5, ctx.regular, COLORS.black, colYes - colEvid - 4)
    if (item.compliance === 'yes') cur.drawText('X', { x: colYes + 3, y: y - 9, size: 7, font: ctx.bold, color: COLORS.black })
    if (item.compliance === 'no') cur.drawText('X', { x: colNo + 3, y: y - 9, size: 7, font: ctx.bold, color: COLORS.black })
    y -= rowH
  }
  y = drawVerifyRow(cur, ctx, y, inspection.sectionVerify.housing)

  // Section 2.2 — Facilities
  y = drawSectionHeader(cur, ctx, y, '2.2 FACILITIES / INSTALACIONES')
  y -= 2
  cur.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  cur.drawText('REQUIREMENTS / REQUERIMIENTOS', { x: colReq + 2, y: y - 8, size: 5.5, font: ctx.bold, color: COLORS.black })
  cur.drawText('EVIDENCE / EVIDENCIA', { x: colEvid, y: y - 8, size: 5.5, font: ctx.bold, color: COLORS.black })
  cur.drawText('CUMPLE / COMPLIES', { x: colYes, y: y - 5, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawText('YES / SI', { x: colYes, y: y - 10, size: 4.5, font: ctx.regular, color: COLORS.black })
  cur.drawText('NO / NO', { x: colNo, y: y - 10, size: 4.5, font: ctx.regular, color: COLORS.black })
  y -= 13

  for (const item of inspection.facilities) {
    const rowH = 22
    if (y - rowH < MIN_Y) break
    cur.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    drawText(cur, `${item.labelEn} / ${item.labelEs}`, colReq + 2, y - 5, 5.5, ctx.regular, COLORS.black, colEvid - colReq - 8)
    drawText(cur, sanitize(item.evidence), colEvid, y - 5, 5.5, ctx.regular, COLORS.black, colYes - colEvid - 4)
    if (item.compliance === 'yes') cur.drawText('X', { x: colYes + 3, y: y - 11, size: 7, font: ctx.bold, color: COLORS.black })
    if (item.compliance === 'no') cur.drawText('X', { x: colNo + 3, y: y - 11, size: 7, font: ctx.bold, color: COLORS.black })
    if (item.compliance === 'na') cur.drawText('N/A', { x: colYes + 1, y: y - 11, size: 5.5, font: ctx.bold, color: COLORS.black })
    y -= rowH
  }
  y = drawVerifyRow(cur, ctx, y, inspection.sectionVerify.facilities)

  // ── Section 3 — Equipment (Tools) — FLOWING across pages ────────────────
  cur = newPage()
  y = PAGE_H - MARGIN - HEADER_H - 3

  const tDesc = MARGIN
  const tPn   = MARGIN + CONTENT_W * 0.28
  const tSn   = MARGIN + CONTENT_W * 0.46
  const tCal  = MARGIN + CONTENT_W * 0.60
  const tKind = MARGIN + CONTENT_W * 0.82

  function drawToolsTableHeader(page: PDFPage, yPos: number): number {
    page.drawRectangle({ x: MARGIN, y: yPos - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
    page.drawText('DESCRIPTION / DESCRIPCION',    { x: tDesc + 1, y: yPos - 8, size: 5, font: ctx.bold, color: COLORS.black })
    page.drawText('PART NUMBER / PARTE NUMERO',   { x: tPn + 1,   y: yPos - 8, size: 5, font: ctx.bold, color: COLORS.black })
    page.drawText('S/N',                          { x: tSn + 1,   y: yPos - 8, size: 5, font: ctx.bold, color: COLORS.black })
    page.drawText('CALIBRATION EXPIRATION DATE',  { x: tCal + 1,  y: yPos - 6, size: 4.5, font: ctx.bold, color: COLORS.black })
    page.drawText('FECHA DE VENCIMIENTO DE CALIBRACION', { x: tCal + 1, y: yPos - 10.5, size: 4, font: ctx.regular, color: COLORS.black })
    page.drawText('KIND OF TOOL / TIPO',          { x: tKind + 1, y: yPos - 8, size: 5, font: ctx.bold, color: COLORS.black })
    return yPos - 13
  }

  y = drawSectionHeader(cur, ctx, y, '3. EQUIPMENT (TOOLS, SPECIAL TOOLS AND EQUIVALENT TOOLS) / EQUIPOS')
  y -= 2
  y = drawToolsTableHeader(cur, y)

  for (const tool of inspection.tools) {
    const rowH = 9
    if (y - rowH < MIN_Y) {
      cur = newPage()
      y = PAGE_H - MARGIN - HEADER_H - 3
      y = drawSectionHeader(cur, ctx, y, '3. EQUIPMENT (CONT.) / EQUIPOS (CONT.)')
      y -= 2
      y = drawToolsTableHeader(cur, y)
    }
    cur.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    cur.drawText(sanitize(tool.description.slice(0, 38)),                              { x: tDesc + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    cur.drawText(sanitize(tool.partNumber.slice(0, 20)),                               { x: tPn + 1,   y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    cur.drawText(sanitize((tool.serialNumber || 'N/A').slice(0, 10)),                  { x: tSn + 1,   y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    cur.drawText(sanitize(tool.calibrationExpiry ? formatDate(tool.calibrationExpiry) : 'N/A'), { x: tCal + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    cur.drawText(sanitize((tool.toolKind || '').toUpperCase()),                        { x: tKind + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    y -= rowH
  }
  ensure(13)
  y = drawVerifyRow(cur, ctx, y, inspection.sectionVerify.tools)

  // 3.1 Validation
  ensure(13 + 13 * inspection.toolsValidation.length + 20)
  y = drawSectionHeader(cur, ctx, y, '3.1 PREGUNTAS DE VALIDACION / VALIDATION QUESTION')
  y -= 2
  cur.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  cur.drawText('CUMPLE / COMPLIES', { x: MARGIN + CONTENT_W - 55, y: y - 5, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawText('YES / SI', { x: MARGIN + CONTENT_W - 52, y: y - 10, size: 4.5, font: ctx.regular, color: COLORS.black })
  cur.drawText('NO / NO', { x: MARGIN + CONTENT_W - 30, y: y - 10, size: 4.5, font: ctx.regular, color: COLORS.black })
  y -= 13
  inspection.toolsValidation.forEach((q, i) => {
    cur.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    cur.drawText(`${i + 1}-`, { x: MARGIN + 2, y: y - 8, size: 6, font: ctx.bold, color: COLORS.black })
    drawText(cur, `${q.questionEn} / ${q.questionEs}`, MARGIN + 12, y - 5, 5.5, ctx.regular, COLORS.black, CONTENT_W - 70)
    if (q.answer === 'yes') cur.drawText('X', { x: MARGIN + CONTENT_W - 47, y: y - 8, size: 7, font: ctx.bold, color: COLORS.black })
    if (q.answer === 'no')  cur.drawText('X', { x: MARGIN + CONTENT_W - 25, y: y - 8, size: 7, font: ctx.bold, color: COLORS.black })
    y -= 13
  })

  // ── Section 4 — Material — FLOWING across pages ──────────────────────────
  ensure(26)
  y = drawSectionHeader(cur, ctx, y, '4. MATERIAL / MATERIAL')
  y -= 2

  const mDesc = MARGIN
  const mPn   = MARGIN + CONTENT_W * 0.40
  const mEq   = MARGIN + CONTENT_W * 0.70

  function drawMaterialsTableHeader(page: PDFPage, yPos: number): number {
    page.drawRectangle({ x: MARGIN, y: yPos - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
    page.drawText('DESCRIPTION / DESCRIPCION',  { x: mDesc + 1, y: yPos - 8, size: 5, font: ctx.bold, color: COLORS.black })
    page.drawText('PART NUMBER / REFERENCE',    { x: mPn + 1,   y: yPos - 8, size: 5, font: ctx.bold, color: COLORS.black })
    page.drawText('EQUIVALENT / EQUIVALENTE',   { x: mEq + 1,   y: yPos - 8, size: 5, font: ctx.bold, color: COLORS.black })
    return yPos - 13
  }

  y = drawMaterialsTableHeader(cur, y)

  for (const mat of inspection.materials) {
    const rowH = 9
    if (y - rowH < MIN_Y) {
      cur = newPage()
      y = PAGE_H - MARGIN - HEADER_H - 3
      y = drawSectionHeader(cur, ctx, y, '4. MATERIAL (CONT.) / MATERIAL (CONT.)')
      y -= 2
      y = drawMaterialsTableHeader(cur, y)
    }
    cur.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    cur.drawText(sanitize(mat.description.slice(0, 35)),              { x: mDesc + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    cur.drawText(sanitize(mat.partNumberOrReference.slice(0, 25)),    { x: mPn + 1,   y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    cur.drawText(sanitize((mat.equivalent || '').slice(0, 20)),       { x: mEq + 1,   y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    y -= rowH
  }
  ensure(13)
  y = drawVerifyRow(cur, ctx, y, inspection.sectionVerify.materials)

  // ── Section 5 — Technical Data ───────────────────────────────────────────
  ensure(26)
  y = drawSectionHeader(cur, ctx, y, '5. TECHNICAL DATA / DATOS TECNICOS')
  y -= 2

  const tdType = MARGIN
  const tdRef  = MARGIN + CONTENT_W * 0.42
  const tdRev  = MARGIN + CONTENT_W * 0.68
  const tdDate = MARGIN + CONTENT_W * 0.82

  cur.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  cur.drawText('PUBLICATION TYPE / TIPO DE PUBLICACION',  { x: tdType + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawText('REFERENCE No. / No. DE REFERENCIA',       { x: tdRef + 1,  y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawText('REV. No.',                                { x: tdRev + 1,  y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawText('REV. DATE / FECHA',                       { x: tdDate + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  y -= 13

  for (const td of inspection.technicalData) {
    const rowH = 9
    ensure(rowH)
    cur.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    cur.drawText(sanitize(td.publicationDescription.slice(0, 30)), { x: tdType + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    cur.drawText(sanitize(td.reference.slice(0, 20)),              { x: tdRef + 1,  y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    cur.drawText(sanitize(td.revNumber || ''),                     { x: tdRev + 1,  y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    cur.drawText(sanitize(td.revDate ? formatDate(td.revDate) : ''), { x: tdDate + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    y -= rowH
  }
  ensure(13)
  y = drawVerifyRow(cur, ctx, y, inspection.sectionVerify.technicalData)

  // ── Section 6 — Processes ────────────────────────────────────────────────
  ensure(26)
  y = drawSectionHeader(cur, ctx, y, '6. PROCESSES / PROCESO')
  y -= 2

  const prName = MARGIN
  const prId   = MARGIN + CONTENT_W * 0.38
  const prRev  = MARGIN + CONTENT_W * 0.68
  const prDate = MARGIN + CONTENT_W * 0.82

  cur.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  cur.drawText('NAME OF PROCESSES / NOMBRE DEL PROCESO',     { x: prName + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawText('FORMAT IDENTIFICATION / IDENTIFICACION',     { x: prId + 1,   y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawText('REV. No.',                                   { x: prRev + 1,  y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawText('REV. DATE',                                  { x: prDate + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  y -= 13

  for (const pr of inspection.processes) {
    const rowH = 9
    ensure(rowH)
    cur.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    cur.drawText(sanitize(pr.processName.slice(0, 30)), { x: prName + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    cur.drawText(sanitize(pr.reference.slice(0, 20)),   { x: prId + 1,   y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    cur.drawText(sanitize(pr.revNumber || ''),          { x: prRev + 1,  y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    cur.drawText(sanitize(pr.revDate ? formatDate(pr.revDate) : ''), { x: prDate + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    y -= rowH
  }
  ensure(13)
  y = drawVerifyRow(cur, ctx, y, inspection.sectionVerify.processes)

  // ── Section 7 — Personnel ────────────────────────────────────────────────
  ensure(26)
  y = drawSectionHeader(cur, ctx, y, '7. TRAINED PERSONNEL / ENTRENAMIENTO DE PERSONAL')
  y -= 2

  const pName  = MARGIN
  const pLic   = MARGIN + CONTENT_W * 0.43
  const pTrain = MARGIN + CONTENT_W * 0.58
  const pYes   = MARGIN + CONTENT_W * 0.82
  const pNo    = MARGIN + CONTENT_W * 0.91

  cur.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  cur.drawText('7.1 REQUERIMIENTO / REQUIREMENT', { x: MARGIN + CONTENT_W / 2 - 30, y: y - 8, size: 5.5, font: ctx.bold, color: COLORS.black })
  y -= 13
  cur.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  cur.drawText('NAME / JOB TITLE / NOMBRE Y CARGO',               { x: pName + 1,  y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawText('LICENSES / LICENCIA',                             { x: pLic + 1,   y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawText('SPECIFIC TRAINING/ ENTRENAMIENTO ESPECIAL',       { x: pTrain + 1, y: y - 8, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawText('CUMPLE/COMPLIES', { x: pYes + 1, y: y - 5, size: 4.5, font: ctx.bold, color: COLORS.black })
  cur.drawText('YES / SI', { x: pYes + 1, y: y - 10, size: 4, font: ctx.regular, color: COLORS.black })
  cur.drawText('NO / NO',  { x: pNo + 1,  y: y - 10, size: 4, font: ctx.regular, color: COLORS.black })
  y -= 13

  for (const per of inspection.trainedPersonnel) {
    const rowH = 9
    ensure(rowH)
    cur.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    cur.drawText(sanitize(per.nameAndJobTitle),                      { x: pName + 1,  y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    cur.drawText(sanitize(per.licenseNumber.slice(0, 15)),           { x: pLic + 1,   y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    cur.drawText(sanitize((per.specificTraining || '').slice(0, 30)), { x: pTrain + 1, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    if (per.compliance === 'yes') cur.drawText('X', { x: pYes + 3, y: y - 6.5, size: 7, font: ctx.bold, color: COLORS.black })
    if (per.compliance === 'no')  cur.drawText('X', { x: pNo + 3,  y: y - 6.5, size: 7, font: ctx.bold, color: COLORS.black })
    y -= rowH
  }
  ensure(13)
  y = drawVerifyRow(cur, ctx, y, inspection.sectionVerify.personnel)

  // 7.2 Validation
  ensure(26)
  y = drawSectionHeader(cur, ctx, y, '7.2. PREGUNTAS DE VALIDACION / VALIDATION QUESTION')
  y -= 2
  cur.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  cur.drawText('CUMPLE / COMPLIES', { x: MARGIN + CONTENT_W - 55, y: y - 5, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawText('YES / SI', { x: MARGIN + CONTENT_W - 52, y: y - 10, size: 4.5, font: ctx.regular, color: COLORS.black })
  cur.drawText('NO / NO',  { x: MARGIN + CONTENT_W - 30, y: y - 10, size: 4.5, font: ctx.regular, color: COLORS.black })
  y -= 13
  inspection.personnelValidation.forEach((q, i) => {
    ensure(13)
    cur.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    cur.drawText(`${i + 1}-`, { x: MARGIN + 2, y: y - 8, size: 6, font: ctx.bold, color: COLORS.black })
    drawText(cur, `${q.questionEn} / ${q.questionEs}`, MARGIN + 12, y - 5, 5.5, ctx.regular, COLORS.black, CONTENT_W - 70)
    if (q.answer === 'yes') cur.drawText('X', { x: MARGIN + CONTENT_W - 47, y: y - 8, size: 7, font: ctx.bold, color: COLORS.black })
    if (q.answer === 'no')  cur.drawText('X', { x: MARGIN + CONTENT_W - 25, y: y - 8, size: 7, font: ctx.bold, color: COLORS.black })
    y -= 13
  })

  // Section 8 — Observations
  ensure(26)
  y = drawSectionHeader(cur, ctx, y, '8. OBSERVATIONS / OBSERVACIONES')
  y -= 4
  if (inspection.observations) {
    drawText(cur, sanitize(inspection.observations), MARGIN, y, 6.5, ctx.regular, COLORS.black, CONTENT_W)
    y -= 30
  } else {
    y -= 40
  }

  // ── Contract + Signatures — always start on a new page ──────────────────
  cur = newPage()
  y = PAGE_H - MARGIN - HEADER_H - 3

  // Section 9 — Contract Maintenance
  y = drawSectionHeader(cur, ctx, y, '9. CONTRACT MAINTENANCE / MANTENIMIENTO CONTRATADO')
  y -= 2

  const ctSvc = MARGIN
  const ctStd = MARGIN + CONTENT_W * 0.55

  cur.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, color: COLORS.lightGray })
  cur.drawText('SERVICE TYPE / TIPO DE SERVICIO', { x: ctSvc + 2, y: y - 8, size: 5.5, font: ctx.bold, color: COLORS.black })
  cur.drawText('STANDARD / ESTANDAR',             { x: ctStd + 2, y: y - 8, size: 5.5, font: ctx.bold, color: COLORS.black })
  y -= 13

  const services = inspection.contractMaintenance?.services ?? []
  if (services.length === 0) {
    cur.drawRectangle({ x: MARGIN, y: y - 9, width: CONTENT_W, height: 9, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
    cur.drawText('N/A', { x: MARGIN + 3, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
    y -= 9
  } else {
    for (const svc of services) {
      const rowH = 9
      ensure(rowH)
      cur.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, borderColor: COLORS.darkGray, borderWidth: 0.2, color: COLORS.white })
      cur.drawText(sanitize(svc.serviceType.slice(0, 45)), { x: ctSvc + 2, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
      cur.drawText(sanitize(svc.standard.slice(0, 35)),    { x: ctStd + 2, y: y - 6.5, size: 5.5, font: ctx.regular, color: COLORS.black })
      y -= rowH
    }
  }
  y -= 4

  // NDT note box
  const ndtNote = 'NOTE: If the company has NDT capabilities these must be included in the scope of the SAT-F743 evaluation. / NOTA: Si la empresa tiene capacidades de NDT estas deben ser incluidas en el alcance de la evaluacion SAT-F743.'
  cur.drawRectangle({ x: MARGIN, y: y - 22, width: CONTENT_W, height: 23, color: COLORS.lightGray, borderColor: COLORS.darkGray, borderWidth: 0.3 })
  drawText(cur, ndtNote, MARGIN + 3, y - 4, 5, ctx.regular, COLORS.black, CONTENT_W - 6)
  y -= 28

  // Signature boxes
  y -= 4
  const sigW = (CONTENT_W - 8) / 2
  const sig2x = MARGIN + sigW + 8

  // Box 1: Maintenance Responsible
  cur.drawRectangle({ x: MARGIN, y: y - 60, width: sigW, height: 61, borderColor: COLORS.darkGray, borderWidth: 0.4, color: COLORS.white })
  cur.drawRectangle({ x: MARGIN, y: y - 12, width: sigW, height: 13, color: COLORS.navyHeader })
  cur.drawText('MAINTENANCE RESPONSIBLE / RESPONSABLE DE MANTENIMIENTO', { x: MARGIN + 2, y: y - 9, size: 4.5, font: ctx.bold, color: COLORS.white })
  cur.drawText('NAME / NOMBRE:', { x: MARGIN + 2, y: y - 18, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawText(sanitize(inspection.signatures?.maintenanceResponsibleName ?? ''), { x: MARGIN + 2, y: y - 25, size: 6, font: ctx.regular, color: COLORS.black })
  cur.drawText('APPROVED / APROBADO:', { x: MARGIN + 2, y: y - 34, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawRectangle({ x: MARGIN + 2, y: y - 48, width: 8, height: 8, borderColor: COLORS.darkGray, borderWidth: 0.5, color: COLORS.white })
  if (inspection.signatures?.maintenanceApproved === 'yes') cur.drawText('X', { x: MARGIN + 4, y: y - 46, size: 7, font: ctx.bold, color: COLORS.black })
  cur.drawText('YES / SI', { x: MARGIN + 12, y: y - 46, size: 5.5, font: ctx.regular, color: COLORS.black })
  cur.drawRectangle({ x: MARGIN + 35, y: y - 48, width: 8, height: 8, borderColor: COLORS.darkGray, borderWidth: 0.5, color: COLORS.white })
  if (inspection.signatures?.maintenanceApproved === 'no') cur.drawText('X', { x: MARGIN + 37, y: y - 46, size: 7, font: ctx.bold, color: COLORS.black })
  cur.drawText('NO / NO', { x: MARGIN + 45, y: y - 46, size: 5.5, font: ctx.regular, color: COLORS.black })
  cur.drawText('SIGNATURE / FIRMA:', { x: MARGIN + 2, y: y - 56, size: 5, font: ctx.bold, color: COLORS.black })

  // Box 2: Quality Control Responsible
  cur.drawRectangle({ x: sig2x, y: y - 60, width: sigW, height: 61, borderColor: COLORS.darkGray, borderWidth: 0.4, color: COLORS.white })
  cur.drawRectangle({ x: sig2x, y: y - 12, width: sigW, height: 13, color: COLORS.navyHeader })
  cur.drawText('QUALITY CONTROL RESPONSIBLE / RESPONSABLE DE CALIDAD', { x: sig2x + 2, y: y - 9, size: 4.5, font: ctx.bold, color: COLORS.white })
  cur.drawText('NAME / NOMBRE:', { x: sig2x + 2, y: y - 18, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawText(sanitize(inspection.signatures?.qualityControlResponsibleName ?? ''), { x: sig2x + 2, y: y - 25, size: 6, font: ctx.regular, color: COLORS.black })
  cur.drawText('APPROVED / APROBADO:', { x: sig2x + 2, y: y - 34, size: 5, font: ctx.bold, color: COLORS.black })
  cur.drawRectangle({ x: sig2x + 2, y: y - 48, width: 8, height: 8, borderColor: COLORS.darkGray, borderWidth: 0.5, color: COLORS.white })
  if (inspection.signatures?.qualityControlApproved === 'yes') cur.drawText('X', { x: sig2x + 4, y: y - 46, size: 7, font: ctx.bold, color: COLORS.black })
  cur.drawText('YES / SI', { x: sig2x + 12, y: y - 46, size: 5.5, font: ctx.regular, color: COLORS.black })
  cur.drawRectangle({ x: sig2x + 35, y: y - 48, width: 8, height: 8, borderColor: COLORS.darkGray, borderWidth: 0.5, color: COLORS.white })
  if (inspection.signatures?.qualityControlApproved === 'no') cur.drawText('X', { x: sig2x + 37, y: y - 46, size: 7, font: ctx.bold, color: COLORS.black })
  cur.drawText('NO / NO', { x: sig2x + 45, y: y - 46, size: 5.5, font: ctx.regular, color: COLORS.black })
  cur.drawText('SIGNATURE / FIRMA:', { x: sig2x + 2, y: y - 56, size: 5, font: ctx.bold, color: COLORS.black })
  y -= 68

  // Quality Assurance audit box (full width)
  y -= 4
  cur.drawRectangle({ x: MARGIN, y: y - 80, width: CONTENT_W, height: 81, borderColor: COLORS.darkGray, borderWidth: 0.4, color: COLORS.white })
  cur.drawRectangle({ x: MARGIN, y: y - 14, width: CONTENT_W, height: 15, color: COLORS.navyHeader })
  cur.drawText('9. AUDIT BY QUALITY ASSURANCE / AUDITORIA POR ASEGURAMIENTO DE CALIDAD', { x: MARGIN + 3, y: y - 10, size: 5.5, font: ctx.bold, color: COLORS.white })
  cur.drawText('NAME / NOMBRE:', { x: MARGIN + 3, y: y - 22, size: 5.5, font: ctx.bold, color: COLORS.black })
  cur.drawText(sanitize(inspection.signatures?.qualityAssuranceName ?? ''), { x: MARGIN + 70, y: y - 22, size: 6, font: ctx.regular, color: COLORS.black })
  cur.drawText('APPROVED / APROBADO:', { x: MARGIN + 3, y: y - 35, size: 5.5, font: ctx.bold, color: COLORS.black })
  cur.drawRectangle({ x: MARGIN + 3, y: y - 50, width: 10, height: 10, borderColor: COLORS.darkGray, borderWidth: 0.5, color: COLORS.white })
  if (inspection.signatures?.qualityAssuranceApproved === 'yes') cur.drawText('X', { x: MARGIN + 5, y: y - 48, size: 8, font: ctx.bold, color: COLORS.black })
  cur.drawText('YES / SI', { x: MARGIN + 16, y: y - 47, size: 6, font: ctx.regular, color: COLORS.black })
  cur.drawRectangle({ x: MARGIN + 50, y: y - 50, width: 10, height: 10, borderColor: COLORS.darkGray, borderWidth: 0.5, color: COLORS.white })
  if (inspection.signatures?.qualityAssuranceApproved === 'no') cur.drawText('X', { x: MARGIN + 52, y: y - 48, size: 8, font: ctx.bold, color: COLORS.black })
  cur.drawText('NO / NO', { x: MARGIN + 63, y: y - 47, size: 6, font: ctx.regular, color: COLORS.black })
  cur.drawText('DATE / FECHA:', { x: MARGIN + 3, y: y - 62, size: 5.5, font: ctx.bold, color: COLORS.black })
  cur.drawText(formatDate(new Date().toISOString()), { x: MARGIN + 50, y: y - 62, size: 6, font: ctx.regular, color: COLORS.black })
  cur.drawText('SIGNATURE / FIRMA:', { x: MARGIN + 3, y: y - 75, size: 5.5, font: ctx.bold, color: COLORS.black })

  // ── Stamp headers on all body pages (two-pass) ───────────────────────────
  const totalBodyPages = bodyPages.length
  const annexPages = Math.ceil(figures.length / 2)
  const totalPages = totalBodyPages + annexPages

  bodyPages.forEach((pg, i) => {
    drawHeaderBox(pg, ctx, i + 1, totalPages, logoImage)
    if (draft) drawDraftWatermark(pg, ctx)
  })

  // Photo annex
  if (figures.length > 0) {
    await buildPhotoAnnex(ctx, figures, draft, totalBodyPages, totalPages, logoImage)
  }

  return ctx.doc.save()
}
