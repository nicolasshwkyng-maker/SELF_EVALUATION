import type { Inspection } from '../types'
import { loadBlob } from '../db/indexeddb'
import {
  createPdfCtx, addPage, drawSectionHeader, drawText, drawDraftWatermark, sanitize,
  embedPhoto, MARGIN, CONTENT_W, PAGE_H, COLORS,
} from './pdfHelpers'

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

  const pages: ReturnType<typeof addPage>[] = []
  let currentPage = addPage(ctx)
  pages.push(currentPage)
  let y = PAGE_H - MARGIN

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN + 20) {
      currentPage = addPage(ctx)
      pages.push(currentPage)
      y = PAGE_H - MARGIN
    }
  }

  const heading = (text: string) => {
    ensureSpace(20)
    y = drawSectionHeader(currentPage.page, ctx, y, text)
    y -= 4
  }

  const field = (label: string, value: string) => {
    ensureSpace(18)
    currentPage.page.drawText(sanitize(label), { x: MARGIN, y, size: 6, font: ctx.bold, color: COLORS.darkGray })
    drawText(currentPage.page, sanitize(value || '—'), MARGIN + 90, y, 7, ctx.regular, COLORS.black, CONTENT_W - 90)
    y -= 10
  }

  const badge = (label: string, value: 'yes' | 'no' | 'na' | null) => {
    const map = { yes: 'SI / YES', no: 'NO / NO', na: 'N/A', null: '—' } as const
    const colors: Record<string, import('pdf-lib').RGB> = {
      yes: COLORS.white, no: COLORS.white, na: COLORS.lightGray,
    }
    const textColor: Record<string, import('pdf-lib').RGB> = {
      yes: COLORS.black, no: COLORS.black, na: COLORS.darkGray,
    }
    ensureSpace(12)
    currentPage.page.drawText(sanitize(label), { x: MARGIN, y, size: 6, font: ctx.bold, color: COLORS.darkGray })
    const bx = MARGIN + 100, bw = 28
    currentPage.page.drawRectangle({ x: bx, y: y - 8, width: bw, height: 10, color: colors[String(value)] ?? COLORS.lightGray, borderColor: COLORS.darkGray, borderWidth: 0.5 })
    currentPage.page.drawText(map[String(value) as keyof typeof map] ?? '—', { x: bx + 2, y: y - 5, size: 5, font: ctx.bold, color: textColor[String(value)] ?? COLORS.darkGray })
    y -= 12
  }

  const photos = async (photoList: typeof inspection.housing[0]['photos']) => {
    if (photoList.length === 0) return
    const maxW = (CONTENT_W - 6) / 2
    const maxH = 110
    let col = 0
    for (const photo of photoList) {
      const blob = await loadBlob(photo.blobKey)
      if (!blob) continue
      const emb = await embedPhoto(ctx, blob, maxW, maxH)
      if (!emb) continue
      ensureSpace(maxH + 20)
      const px = MARGIN + col * (maxW + 6)
      currentPage.page.drawImage(emb.image, { x: px, y: y - emb.h, width: emb.w, height: emb.h })
      currentPage.page.drawText(sanitize(photo.caption || ''), { x: px, y: y - emb.h - 4, size: 5.5, font: ctx.regular, color: COLORS.darkGray })
      currentPage.page.drawText(formatTs(photo.timestamp), { x: px, y: y - emb.h - 10, size: 5, font: ctx.regular, color: COLORS.darkGray })
      col++
      if (col === 2) { col = 0; y -= maxH + 16 }
    }
    if (col !== 0) y -= maxH + 16
  }

  // ── COVER ────────────────────────────────────────────────────────────────
  drawText(currentPage.page, 'Reporte de Evidencia — Evaluacion de Capacidades de Mantenimiento', MARGIN, y, 13, ctx.bold, COLORS.navyHeader, CONTENT_W)
  y -= 18
  drawText(currentPage.page, 'Evidence Report — Maintenance Capabilities Evaluation', MARGIN, y, 9, ctx.regular, COLORS.darkGray, CONTENT_W)
  y -= 18
  field('Taller / Workshop:', inspection.admin.workshopName)
  field('Fecha / Date:', formatDate(inspection.admin.requestDate))
  field('Responsable / Responsible:', inspection.admin.responsibleForRequest)
  field('Generado / Generated:', formatTs(new Date().toISOString()))
  y -= 10

  // ── SECTION 0 ─────────────────────────────────────────────────────────────
  heading('0. SECCION ADMINISTRATIVA / ADMINISTRATIVE SECTION')
  field('Encargado del taller:', inspection.admin.workshopName)
  field('Fecha:', formatDate(inspection.admin.requestDate))
  field('Responsable:', inspection.admin.responsibleForRequest)
  field('Capacidad / Rating:', inspection.admin.rating)
  badge('Verificado / Verify:', inspection.admin.ratingVerify)

  // ── SECTION 1 ─────────────────────────────────────────────────────────────
  heading('1. IDENTIFICACION DEL COMPONENTE / COMPONENT IDENTIFICATION')
  field('Descripcion / Description:', inspection.componentId.description)
  field('Fabricante / Manufacturer:', inspection.componentId.manufacturer)
  field('Part Number:', inspection.componentId.partNumber)
  field('Alcance / Scope:', inspection.componentId.scope)
  field('ATA:', inspection.componentId.ata)
  field('Equipo / Equipment:', inspection.componentId.applicableEquipment)

  // ── SECTION 2.1 ───────────────────────────────────────────────────────────
  heading('2.1 EDIFICIOS / HOUSING')
  for (const item of inspection.housing) {
    ensureSpace(20)
    const label = `${item.labelEn} / ${item.labelEs}`
    drawText(currentPage.page, sanitize(label), MARGIN, y, 6.5, ctx.bold, COLORS.black, CONTENT_W - 80)
    y -= 9
    field('Evidencia:', item.evidence)
    badge('Cumple / Complies:', item.compliance)
    await photos(item.photos)
    y -= 4
  }

  // ── SECTION 2.2 ───────────────────────────────────────────────────────────
  heading('2.2 INSTALACIONES / FACILITIES')
  for (const item of inspection.facilities) {
    ensureSpace(20)
    const label = `${item.labelEn} / ${item.labelEs}`
    drawText(currentPage.page, sanitize(label), MARGIN, y, 6.5, ctx.bold, COLORS.black, CONTENT_W - 80)
    y -= 9
    field('Evidencia:', item.evidence)
    badge('Cumple / Complies:', item.compliance)
    await photos(item.photos)
    y -= 4
  }

  // ── SECTION 3 ─────────────────────────────────────────────────────────────
  heading('3. EQUIPOS / EQUIPMENT')
  if (inspection.tools.length === 0) { ensureSpace(12); drawText(currentPage.page, 'Sin registros.', MARGIN, y, 7, ctx.regular, COLORS.darkGray); y -= 10 }
  for (const tool of inspection.tools) {
    ensureSpace(40)
    field('Descripcion:', tool.description)
    field('Part Number:', tool.partNumber)
    field('S/N:', tool.serialNumber || 'N/A')
    field('Venc. Calibracion:', tool.calibrationExpiry ? formatDate(tool.calibrationExpiry) : 'N/A')
    field('Tipo:', tool.toolKind || '—')
    await photos(tool.photos)
    y -= 4
  }

  heading('3.1 PREGUNTAS DE VALIDACION')
  for (const q of inspection.toolsValidation) {
    ensureSpace(16)
    drawText(currentPage.page, sanitize(`${q.questionEs} / ${q.questionEn}`), MARGIN, y, 6.5, ctx.bold, COLORS.black, CONTENT_W - 80)
    y -= 9
    badge('Respuesta:', q.answer)
    await photos(q.photos)
    y -= 4
  }

  // ── SECTION 4 ─────────────────────────────────────────────────────────────
  heading('4. MATERIAL')
  if (inspection.materials.length === 0) { ensureSpace(12); drawText(currentPage.page, 'Sin registros.', MARGIN, y, 7, ctx.regular, COLORS.darkGray); y -= 10 }
  for (const mat of inspection.materials) {
    ensureSpace(30)
    field('Descripcion:', mat.description)
    field('Part Number / Ref.:', mat.partNumberOrReference)
    field('Equivalente:', mat.equivalent || '—')
    await photos(mat.photos)
    y -= 4
  }

  // ── SECTION 5 ─────────────────────────────────────────────────────────────
  heading('5. DATOS TECNICOS / TECHNICAL DATA')
  if (inspection.technicalData.length === 0) { ensureSpace(12); drawText(currentPage.page, 'Sin registros.', MARGIN, y, 7, ctx.regular, COLORS.darkGray); y -= 10 }
  for (const td of inspection.technicalData) {
    ensureSpace(30)
    field('Tipo de publicacion:', td.publicationDescription)
    field('No. Referencia:', td.reference)
    field('Rev. No.:', td.revNumber || '—')
    field('Fecha Rev.:', td.revDate ? formatDate(td.revDate) : '—')
    await photos(td.photos)
    y -= 4
  }

  // ── SECTION 6 ─────────────────────────────────────────────────────────────
  heading('6. PROCESOS / PROCESSES')
  if (inspection.processes.length === 0) { ensureSpace(12); drawText(currentPage.page, 'Sin registros.', MARGIN, y, 7, ctx.regular, COLORS.darkGray); y -= 10 }
  for (const pr of inspection.processes) {
    ensureSpace(30)
    field('Proceso:', pr.processName)
    field('Identificacion:', pr.reference)
    field('Rev. No.:', pr.revNumber || '—')
    field('Fecha Rev.:', pr.revDate ? formatDate(pr.revDate) : '—')
    await photos(pr.photos)
    y -= 4
  }

  // ── SECTION 7 ─────────────────────────────────────────────────────────────
  heading('7. PERSONAL ENTRENADO / TRAINED PERSONNEL')
  if (inspection.trainedPersonnel.length === 0) { ensureSpace(12); drawText(currentPage.page, 'Sin registros.', MARGIN, y, 7, ctx.regular, COLORS.darkGray); y -= 10 }
  for (const per of inspection.trainedPersonnel) {
    ensureSpace(30)
    field('Nombre y cargo:', per.nameAndJobTitle)
    field('Licencia:', per.licenseNumber)
    field('Entrenamiento:', per.specificTraining || '—')
    badge('Cumple / Complies:', per.compliance)
    await photos(per.photos)
    y -= 4
  }

  heading('7.2 PREGUNTAS DE VALIDACION')
  for (const q of inspection.personnelValidation) {
    ensureSpace(16)
    drawText(currentPage.page, sanitize(`${q.questionEs} / ${q.questionEn}`), MARGIN, y, 6.5, ctx.bold, COLORS.black, CONTENT_W - 80)
    y -= 9
    badge('Respuesta:', q.answer)
    await photos(q.photos)
    y -= 4
  }

  // ── SECTION 8 ─────────────────────────────────────────────────────────────
  if (inspection.observations) {
    heading('8. OBSERVACIONES / OBSERVATIONS')
    drawText(currentPage.page, sanitize(inspection.observations), MARGIN, y, 7, ctx.regular, COLORS.black, CONTENT_W)
    y -= 30
  }

  // Footer on every page
  const totalPagesCount = ctx.doc.getPageCount()
  const ts = formatTs(new Date().toISOString())
  for (let i = 0; i < totalPagesCount; i++) {
    const pg = ctx.doc.getPage(i)
    pg.drawText(`Generado ${sanitize(ts)} — Documento de evidencia objetiva | Pag. ${i + 1} / ${totalPagesCount}`, {
      x: MARGIN, y: MARGIN - 8, size: 5.5, font: ctx.regular, color: COLORS.darkGray,
    })
    if (draft) drawDraftWatermark(pg, ctx)
  }

  return ctx.doc.save()
}
