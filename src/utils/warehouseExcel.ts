import type { Workbook, Worksheet, Cell, Fill } from 'exceljs'
import type { Inspection } from '../types'
import { safeFilename } from './jsonExport'

const NAVY = 'FF12254C'
const WH_HEAD = 'FF2F75B5'
const WH_FILL = 'FFDDEBF7'
const GRAY = 'FFF2F2F2'
const FONT = 'Arial'
const DATE_FMT = 'dd/mm/yyyy'
const BORDER = {
  top: { style: 'thin' as const, color: { argb: 'FFA6A6A6' } },
  left: { style: 'thin' as const, color: { argb: 'FFA6A6A6' } },
  bottom: { style: 'thin' as const, color: { argb: 'FFA6A6A6' } },
  right: { style: 'thin' as const, color: { argb: 'FFA6A6A6' } },
}
const KIND: Record<string, string> = {
  standard: 'Estándar', calibration: 'Calibración', special: 'Especial', equivalent: 'Equivalente', '': '',
}

const solid = (argb: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const colLetter = (n: number) => String.fromCharCode(64 + n)

/** ISO "YYYY-MM-DD" → UTC midnight so Excel shows the same calendar day in any timezone. */
function toDate(iso: string | null | undefined): Date | null {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null
}

function styleCell(cell: Cell, opts: { bold?: boolean; size?: number; color?: string; italic?: boolean } = {}) {
  cell.font = { name: FONT, size: opts.size ?? 10, bold: opts.bold, italic: opts.italic, color: opts.color ? { argb: opts.color } : undefined }
}

type Col = { header: string; width: number }

function headerBlock(ws: Worksheet, insp: Inspection, title: string, ncols: number): number {
  const { admin, componentId: comp } = insp
  ws.mergeCells(1, 1, 1, ncols)
  const t = ws.getCell(1, 1)
  t.value = title
  styleCell(t, { bold: true, size: 14, color: 'FFFFFFFF' })
  t.fill = solid(NAVY)
  t.alignment = { vertical: 'middle', indent: 1 }
  ws.getRow(1).height = 26
  ws.mergeCells(2, 1, 2, ncols)
  const s = ws.getCell(2, 1)
  s.value = 'SATENA M.R.O. — Verificación de disponibilidad / equivalencia en almacén · Referencia: autoevaluación SAT-F743'
  styleCell(s, { italic: true, size: 9, color: 'FF595959' })

  const lastInfoCol = Math.min(ncols, 9)
  const info: [string, string, string, string | Date | null, boolean][] = [
    ['Componente', comp.description, 'Taller / encargado', admin.workshopName, false],
    ['P/N', comp.partNumber, 'Fecha de solicitud', toDate(admin.requestDate), false],
    ['ATA / Equipo', `${comp.ata} / ${comp.applicableEquipment}`, 'Responsable de la solicitud', admin.responsibleForRequest, false],
    ['Alcance', comp.scope, 'Fecha de respuesta almacén', null, true],
    ['', '', 'Respondido por (almacén)', null, true],
  ]
  info.forEach(([a, b, c, d, toFill], i) => {
    const r = 4 + i
    ws.mergeCells(r, 2, r, 4)
    ws.mergeCells(r, 5, r, 6)
    ws.mergeCells(r, 7, r, lastInfoCol)
    const cells: [number, string | Date | null, boolean][] = [[1, a, true], [2, b, false], [5, c, true], [7, d, false]]
    for (const [col, val, bold] of cells) {
      const cell = ws.getCell(r, col)
      cell.value = val
      styleCell(cell, { bold })
      if (val instanceof Date) { cell.numFmt = DATE_FMT; cell.alignment = { horizontal: 'left' } }
    }
    if (toFill) {
      for (let col = 7; col <= lastInfoCol; col++) {
        ws.getCell(r, col).fill = solid(WH_FILL)
        ws.getCell(r, col).border = BORDER
      }
      if (c.startsWith('Fecha')) ws.getCell(r, 7).numFmt = DATE_FMT
    }
  })
  const note = ws.getCell(9, 1)
  note.value = 'Las columnas en azul claro las diligencia el almacén.'
  styleCell(note, { italic: true, size: 9, color: WH_HEAD })
  return 11
}

interface TableRange { first: number; last: number; availCol: string }

function table(
  ws: Worksheet,
  start: number,
  cols: Col[],
  rows: (string | Date | null)[][],
  whFrom: number,
  availCol: number,
  availOptions: string,
): TableRange {
  const n = cols.length
  ws.mergeCells(start, 1, start, whFrom - 1)
  ws.mergeCells(start, whFrom, start, n)
  for (const [col, text, color] of [[1, 'SOLICITADO POR CALIDAD (según SAT-F743)', NAVY], [whFrom, 'RESPUESTA DEL ALMACÉN', WH_HEAD]] as const) {
    const c = ws.getCell(start, col)
    c.value = text
    styleCell(c, { bold: true, color: 'FFFFFFFF' })
    c.alignment = { horizontal: 'center' }
    c.fill = solid(color)
  }

  const h = start + 1
  cols.forEach((col, i) => {
    const c = ws.getCell(h, i + 1)
    c.value = col.header
    styleCell(c, { bold: true, color: 'FFFFFFFF' })
    c.fill = solid(i + 1 < whFrom ? NAVY : WH_HEAD)
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    c.border = BORDER
    ws.getColumn(i + 1).width = col.width
  })
  ws.getRow(h).height = 32

  rows.forEach((row, ri) => {
    const r = h + 1 + ri
    for (let i = 1; i <= n; i++) {
      const val = row[i - 1] ?? null
      const c = ws.getCell(r, i)
      c.value = val
      c.border = BORDER
      styleCell(c)
      c.alignment = { vertical: 'top', wrapText: true, horizontal: i === 1 ? 'center' : 'left' }
      if (val instanceof Date) { c.numFmt = DATE_FMT; c.alignment = { vertical: 'top', horizontal: 'center' } }
      if (i >= whFrom) c.fill = solid(WH_FILL)
      if (i === availCol) {
        c.dataValidation = {
          type: 'list', allowBlank: true, formulae: [`"${availOptions}"`],
          showErrorMessage: true, errorTitle: 'Valor no válido', error: `Seleccione: ${availOptions.replace(/,/g, ' / ')}`,
        }
      }
    }
  })

  const first = h + 1
  const last = h + rows.length
  const L = colLetter(availCol)
  ws.addConditionalFormatting({
    ref: `${L}${first}:${L}${last}`,
    rules: ([['Sí', 'FFC6EFCE'], ['No', 'FFFFC7CE'], ['Equivalente', 'FFFFEB9C']] as const).map(([val, color], p) => ({
      type: 'expression' as const,
      priority: p + 1,
      formulae: [`$${L}${first}="${val}"`],
      style: { fill: { type: 'pattern' as const, pattern: 'solid' as const, bgColor: { argb: color } } },
    })),
  })
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: h }]
  ws.autoFilter = `A${h}:${colLetter(n)}${last}`
  ws.pageSetup = {
    orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    printTitlesRow: `${h}:${h}`, margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
  }
  ws.headerFooter = { oddFooter: '&C&8Página &P de &N' }

  const sig = last + 3
  ws.getCell(sig, 2).value = 'Firma almacén: ______________________________'
  ws.getCell(sig, 6).value = 'Firma calidad: ______________________________'
  styleCell(ws.getCell(sig, 2))
  styleCell(ws.getCell(sig, 6))
  return { first, last, availCol: L }
}

function buildTools(wb: Workbook, insp: Inspection): TableRange {
  const ws = wb.addWorksheet('Herramientas')
  const cols: Col[] = [
    { header: 'Ref. SAT-F743', width: 14 }, { header: 'Descripción', width: 34 }, { header: 'P/N', width: 20 },
    { header: 'S/N', width: 16 }, { header: 'Tipo', width: 13 }, { header: 'Venc. calibración', width: 13 },
    { header: 'Disponible\n(Sí / No / Equivalente)', width: 16 }, { header: 'Cantidad disponible', width: 11 },
    { header: 'Ubicación', width: 16 }, { header: 'P/N equivalente ofrecido', width: 20 },
    { header: 'Calibración vigente\n(Sí / No / N.A.)', width: 15 }, { header: 'Observaciones almacén', width: 32 },
  ]
  const rows = insp.tools.map((t, i) => [
    `3-${i + 1}`, t.description, t.partNumber, t.serialNumber, KIND[t.toolKind] ?? t.toolKind, toDate(t.calibrationExpiry),
  ])
  const start = headerBlock(ws, insp, 'HERRAMIENTAS / EQUIPOS — Verificación de disponibilidad', cols.length)
  const range = table(ws, start, cols, rows, 7, 7, 'Sí,No,Equivalente')
  for (let r = range.first; r <= range.last; r++) {
    ws.getCell(r, 11).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Sí,No,N.A."'] }
  }
  return range
}

function buildMaterials(wb: Workbook, insp: Inspection): TableRange {
  const ws = wb.addWorksheet('Materiales')
  const cols: Col[] = [
    { header: 'Ref. SAT-F743', width: 14 }, { header: 'Descripción', width: 30 }, { header: 'P/N / Referencia', width: 30 },
    { header: 'Equivalente indicado', width: 30 }, { header: 'Nota', width: 18 },
    { header: 'Disponible\n(Sí / No / Equivalente)', width: 16 }, { header: 'Cantidad disponible', width: 11 },
    { header: 'U/M', width: 8 }, { header: 'Lote / Batch', width: 14 }, { header: 'Fecha venc.\n(shelf life)', width: 13 },
    { header: 'Ubicación', width: 14 }, { header: 'P/N equivalente ofrecido', width: 20 }, { header: 'Observaciones almacén', width: 30 },
  ]
  const firstSeen = new Map<string, string>()
  const rows = insp.materials.map((m, i) => {
    const pn = (m.partNumberOrReference ?? '').trim()
    const key = pn.toUpperCase().replace(/^(MAT\. NO\.|P\/N)\s*/, '')
    let note = ''
    if (pn && pn.toUpperCase() !== 'N/A') {
      const seen = firstSeen.get(key)
      if (seen) note = `Repetido — ver ${seen}`
      else firstSeen.set(key, `4-${i + 1}`)
    }
    const eq = m.equivalent && m.equivalent.toUpperCase() !== 'N/A' ? m.equivalent : ''
    return [`4-${i + 1}`, m.description, pn, eq, note]
  })
  const start = headerBlock(ws, insp, 'MATERIALES — Verificación de disponibilidad / equivalencia', cols.length)
  const range = table(ws, start, cols, rows, 6, 6, 'Sí,No,Equivalente')
  for (let r = range.first; r <= range.last; r++) {
    ws.getCell(r, 10).numFmt = DATE_FMT
    styleCell(ws.getCell(r, 5), { size: 9, italic: true, color: 'FF7F7F7F' })
  }
  return range
}

function buildSummary(ws: Worksheet, insp: Inspection, tools: TableRange, mats: TableRange) {
  ws.getColumn(1).width = 30
  for (let c = 2; c <= 6; c++) ws.getColumn(c).width = 15
  ws.mergeCells('A1:F1')
  const t = ws.getCell('A1')
  t.value = 'RESUMEN — Verificación de almacén'
  styleCell(t, { bold: true, size: 14, color: 'FFFFFFFF' })
  t.fill = solid(NAVY)
  t.alignment = { vertical: 'middle', indent: 1 }
  ws.getRow(1).height = 26
  const req = toDate(insp.admin.requestDate)
  ws.getCell('A2').value = `${insp.componentId.description} · P/N ${insp.componentId.partNumber}${req ? ` · Solicitud ${req.toISOString().slice(0, 10).split('-').reverse().join('/')}` : ''}`
  styleCell(ws.getCell('A2'), { italic: true, size: 9, color: 'FF595959' })

  ;['Sección', 'Total ítems', 'Disponible', 'Equivalente', 'No disponible', 'Pendiente'].forEach((h, i) => {
    const c = ws.getCell(4, i + 1)
    c.value = h
    styleCell(c, { bold: true, color: 'FFFFFFFF' })
    c.fill = solid(NAVY)
    c.alignment = { horizontal: 'center', wrapText: true }
    c.border = BORDER
  })
  const sections: [string, string, TableRange][] = [['Herramientas', 'Herramientas', tools], ['Materiales', 'Materiales', mats]]
  sections.forEach(([name, sheet, rg], i) => {
    const r = 5 + i
    const total = rg.last - rg.first + 1
    const range = `'${sheet}'!$${rg.availCol}$${rg.first}:$${rg.availCol}$${rg.last}`
    const vals = [
      name,
      total,
      { formula: `COUNTIF(${range},"Sí")`, result: 0 },
      { formula: `COUNTIF(${range},"Equivalente")`, result: 0 },
      { formula: `COUNTIF(${range},"No")`, result: 0 },
      { formula: `B${r}-C${r}-D${r}-E${r}`, result: total },
    ]
    vals.forEach((v, ci) => {
      const c = ws.getCell(r, ci + 1)
      c.value = v
      c.border = BORDER
      styleCell(c, { bold: ci === 0 })
      if (ci > 0) c.alignment = { horizontal: 'center' }
    })
  })
  const totalItems = tools.last - tools.first + 1 + mats.last - mats.first + 1
  ws.getCell(7, 1).value = 'TOTAL'
  for (let ci = 2; ci <= 6; ci++) {
    const L = colLetter(ci)
    ws.getCell(7, ci).value = { formula: `SUM(${L}5:${L}6)`, result: ci === 2 || ci === 6 ? totalItems : 0 }
    ws.getCell(7, ci).alignment = { horizontal: 'center' }
  }
  for (let ci = 1; ci <= 6; ci++) {
    styleCell(ws.getCell(7, ci), { bold: true })
    ws.getCell(7, ci).border = BORDER
    ws.getCell(7, ci).fill = solid(GRAY)
  }
  ws.getCell(9, 1).value = '% respondido'
  styleCell(ws.getCell(9, 1), { bold: true })
  ws.getCell(9, 2).value = { formula: 'IF(B7=0,0,(B7-F7)/B7)', result: 0 }
  ws.getCell(9, 2).numFmt = '0%'
  styleCell(ws.getCell(9, 2), { bold: true })

  const notes = [
    'Instrucciones para el almacén:',
    '1. En las hojas "Herramientas" y "Materiales", diligencie solo las columnas en azul claro.',
    '2. "Disponible": Sí = existe en almacén; Equivalente = se ofrece un P/N alterno (indíquelo en "P/N equivalente ofrecido"); No = no hay existencia.',
    '3. Para materiales con vida útil (adhesivos, sellantes, compuestos, tejidos), registre lote y fecha de vencimiento.',
    '4. Para herramientas calibrables, confirme si la calibración está vigente.',
    '5. La columna "Ref. SAT-F743" corresponde al numeral del ítem en la autoevaluación (3-x herramientas, 4-x materiales).',
    'Nota: todo equivalente debe estar soportado por documentación técnica aprobada antes de su uso.',
  ]
  notes.forEach((n, i) => {
    const r = 11 + i
    ws.mergeCells(r, 1, r, 6)
    const c = ws.getCell(r, 1)
    c.value = n
    styleCell(c, { size: 9, bold: i === 0 })
    c.alignment = { wrapText: true, vertical: 'top' }
    ws.getRow(r).height = n.length > 95 ? 26 : 14
  })
  ws.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
}

/** Tools & materials availability request for the warehouse, as .xlsx bytes. */
export async function buildWarehouseWorkbook(insp: Inspection): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SAT-F743'
  wb.created = new Date()
  wb.calcProperties.fullCalcOnLoad = true

  const summary = wb.addWorksheet('Resumen')
  const tools = buildTools(wb, insp)
  const mats = buildMaterials(wb, insp)
  buildSummary(summary, insp, tools, mats)

  return wb.xlsx.writeBuffer()
}

export async function exportWarehouseExcel(insp: Inspection): Promise<void> {
  const buffer = await buildWarehouseWorkbook(insp)
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `SAT-F743 - ${safeFilename(insp.componentId.partNumber.trim())} - Verificacion Almacen.xlsx`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
