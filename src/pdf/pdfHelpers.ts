import { PDFDocument, PDFPage, PDFImage, rgb, degrees, StandardFonts, type PDFFont, type RGB } from 'pdf-lib'
import type { ComplianceStatus } from '../types'

export const COLORS = {
  navyHeader: rgb(0.071, 0.145, 0.298) as RGB,
  white: rgb(1, 1, 1) as RGB,
  black: rgb(0, 0, 0) as RGB,
  lightGray: rgb(0.9, 0.9, 0.9) as RGB,
  red: rgb(0.8, 0, 0) as RGB,
  darkGray: rgb(0.3, 0.3, 0.3) as RGB,
}

export const PAGE_W = 612   // Letter 8.5"
export const PAGE_H = 792   // Letter 11"
export const MARGIN = 28
export const CONTENT_W = PAGE_W - MARGIN * 2

export interface PdfCtx {
  doc: PDFDocument
  bold: PDFFont
  regular: PDFFont
}

export async function createPdfCtx(): Promise<PdfCtx> {
  const doc = await PDFDocument.create()
  const [bold, regular] = await Promise.all([
    doc.embedFont(StandardFonts.HelveticaBold),
    doc.embedFont(StandardFonts.Helvetica),
  ])
  return { doc, bold, regular }
}

export function addPage(ctx: PdfCtx): { page: PDFPage; y: () => number; setY: (v: number) => void } {
  const page = ctx.doc.addPage([PAGE_W, PAGE_H])
  let _y = PAGE_H - MARGIN
  return {
    page,
    y: () => _y,
    setY: (v: number) => { _y = v },
  }
}

const LOGO_COL_W = 72  // width of the logo column when a logo is present
const CODE_COL_W = 110 // width of the document-control column (right)
const HEADER_H = 32    // header height (slightly taller to fit logo proportionally)

export function drawHeaderBox(
  page: PDFPage,
  ctx: PdfCtx,
  pageNum: number,
  totalPages: number,
  logoImage?: PDFImage,
) {
  const { bold, regular } = ctx
  const headerY = PAGE_H - MARGIN - HEADER_H
  const codeX = PAGE_W - MARGIN - CODE_COL_W

  if (logoImage) {
    // ── 3-column layout: [logo | title | code] ──────────────────────────────
    const titleW = CONTENT_W - LOGO_COL_W - CODE_COL_W

    // Column 1 — logo (white background, bordered)
    page.drawRectangle({ x: MARGIN, y: headerY, width: LOGO_COL_W, height: HEADER_H, color: COLORS.white, borderColor: COLORS.navyHeader, borderWidth: 0.5 })
    // Scale logo to fit within the column keeping aspect ratio, with 3pt padding
    const { width: imgW, height: imgH } = logoImage.size()
    const scaleW = (LOGO_COL_W - 6) / imgW
    const scaleH = (HEADER_H - 6) / imgH
    const scale = Math.min(scaleW, scaleH)
    const drawW = imgW * scale
    const drawH = imgH * scale
    const logoX = MARGIN + (LOGO_COL_W - drawW) / 2
    const logoY = headerY + (HEADER_H - drawH) / 2
    page.drawImage(logoImage, { x: logoX, y: logoY, width: drawW, height: drawH })

    // Column 2 — title (white bg, centered text; ES in black, EN in gray)
    const titleX = MARGIN + LOGO_COL_W
    page.drawRectangle({ x: titleX, y: headerY, width: titleW, height: HEADER_H, color: COLORS.white, borderColor: COLORS.navyHeader, borderWidth: 0.5 })

    const enLine = 'MAINTENANCE CAPABILITIES EVALUATION FORMAT FOR SATENA SUPPORT WORKSHOPS'
    const esLine = 'FORMATO EVALUACION DE CAPACIDADES DE MANTENIMIENTO PARA TALLERES SATENA'
    const codeLine = ''
    const titleSize = 5.5
    const codeSize = 7
    const grayText = rgb(0.45, 0.45, 0.45) as RGB

    const enW = bold.widthOfTextAtSize(enLine, titleSize)
    const esW = bold.widthOfTextAtSize(esLine, titleSize)
    const codeW = bold.widthOfTextAtSize(codeLine, codeSize)

    page.drawText(enLine, {
      x: titleX + (titleW - enW) / 2,
      y: headerY + HEADER_H - 10,
      size: titleSize, font: bold, color: grayText,
    })
    page.drawText(esLine, {
      x: titleX + (titleW - esW) / 2,
      y: headerY + HEADER_H - 18,
      size: titleSize, font: bold, color: COLORS.black,
    })
    page.drawText(codeLine, {
      x: titleX + (titleW - codeW) / 2,
      y: headerY + HEADER_H - 28,
      size: codeSize, font: bold, color: COLORS.black,
    })
  } else {
    // ── 2-column fallback (no logo) — same white/gray/black centered style ──
    const fbW = CONTENT_W - CODE_COL_W
    page.drawRectangle({ x: MARGIN, y: headerY, width: fbW, height: HEADER_H, color: COLORS.white, borderColor: COLORS.navyHeader, borderWidth: 0.5 })
    const enFb = 'MAINTENANCE CAPABILITIES EVALUATION FORMAT FOR SATENA SUPPORT WORKSHOPS'
    const esFb = 'FORMATO EVALUACION DE CAPACIDADES DE MANTENIMIENTO PARA TALLERES SATENA'
    const codeFb = 'SAT-F743'
    const tsz = 5.5, csz = 7
    const gray2 = rgb(0.45, 0.45, 0.45) as RGB
    page.drawText(enFb, { x: MARGIN + (fbW - bold.widthOfTextAtSize(enFb, tsz)) / 2, y: headerY + HEADER_H - 10, size: tsz, font: bold, color: gray2 })
    page.drawText(esFb, { x: MARGIN + (fbW - bold.widthOfTextAtSize(esFb, tsz)) / 2, y: headerY + HEADER_H - 18, size: tsz, font: bold, color: COLORS.black })
    page.drawText(codeFb, { x: MARGIN + (fbW - bold.widthOfTextAtSize(codeFb, csz)) / 2, y: headerY + HEADER_H - 28, size: csz, font: bold, color: COLORS.black })
  }

  // Column 3 — document control (light gray, always present)
  page.drawRectangle({ x: codeX, y: headerY, width: CODE_COL_W, height: HEADER_H, color: COLORS.lightGray, borderColor: COLORS.navyHeader, borderWidth: 0.5 })
  const codeLines = [
    'CODE: SAT-F743',
    'FROM: 01/04/2025',
    'VERSION: 1',
    `PAGE: ${pageNum} OF ${totalPages}`,
  ]
  codeLines.forEach((line, i) => {
    page.drawText(line, { x: codeX + 4, y: headerY + HEADER_H - 9 - i * 6, size: 5.5, font: regular, color: COLORS.black })
  })
}

export function drawSectionHeader(page: PDFPage, ctx: PdfCtx, y: number, label: string): number {
  page.drawRectangle({ x: MARGIN, y: y - 12, width: CONTENT_W, height: 13, color: COLORS.navyHeader })
  page.drawText(label, { x: MARGIN + 3, y: y - 9, size: 6.5, font: ctx.bold, color: COLORS.white })
  return y - 14
}

export function drawRowLine(page: PDFPage, y: number, height = 10) {
  page.drawRectangle({ x: MARGIN, y: y - height, width: CONTENT_W, height, borderColor: COLORS.darkGray, borderWidth: 0.3, color: COLORS.white })
}

export function drawText(page: PDFPage, text: string, x: number, y: number, size: number, font: PDFFont, color: RGB = COLORS.black, maxWidth?: number) {
  const cleaned = sanitize(text)
  if (maxWidth) {
    const words = cleaned.split(' ')
    let line = ''
    let lineY = y
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        page.drawText(line, { x, y: lineY, size, font, color })
        line = word
        lineY -= size + 1.5
      } else {
        line = test
      }
    }
    if (line) page.drawText(line, { x, y: lineY, size, font, color })
    return y - lineY + size
  }
  page.drawText(cleaned, { x, y, size, font, color })
  return size
}

export function drawCompliance(page: PDFPage, ctx: PdfCtx, value: ComplianceStatus, x: number, y: number, boxW = 20) {
  const yesX = x, noX = x + boxW
  // YES box
  page.drawRectangle({ x: yesX, y: y - 8, width: boxW - 2, height: 9, borderColor: COLORS.darkGray, borderWidth: 0.3, color: COLORS.white })
  page.drawText('YES / SI', { x: yesX + 1, y: y - 6, size: 4.5, font: ctx.regular, color: COLORS.black })
  if (value === 'yes') page.drawText('X', { x: yesX + 7, y: y - 4, size: 6, font: ctx.bold, color: COLORS.black })

  // NO box
  page.drawRectangle({ x: noX, y: y - 8, width: boxW - 2, height: 9, borderColor: COLORS.darkGray, borderWidth: 0.3, color: COLORS.white })
  page.drawText('NO / NO', { x: noX + 1, y: y - 6, size: 4.5, font: ctx.regular, color: COLORS.black })
  if (value === 'no') page.drawText('X', { x: noX + 7, y: y - 4, size: 6, font: ctx.bold, color: COLORS.black })
}

export function drawVerifyRow(page: PDFPage, ctx: PdfCtx, y: number, value: ComplianceStatus): number {
  page.drawRectangle({ x: MARGIN, y: y - 11, width: CONTENT_W, height: 12, borderColor: COLORS.darkGray, borderWidth: 0.3, color: COLORS.lightGray })
  page.drawText('VERIFY / VERIFICADO', { x: MARGIN + CONTENT_W / 2 - 30, y: y - 8, size: 6, font: ctx.bold, color: COLORS.black })
  drawCompliance(page, ctx, value, MARGIN + CONTENT_W - 50, y)
  return y - 13
}

export function sanitize(text: string): string {
  return (text ?? '')
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u')
    .replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I').replace(/Ó/g, 'O').replace(/Ú/g, 'U')
    .replace(/ñ/g, 'n').replace(/Ñ/g, 'N').replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/¿/g, '').replace(/¡/g, '')
    .replace(/[–—]/g, '-')   // en-dash / em-dash → hyphen
    .replace(/[‘’]/g, "'")   // curly single quotes → straight
    .replace(/[“”]/g, '"')   // curly double quotes → straight
    .replace(/°/g, ' ')           // degree symbol → space (in calibration dates)
    .replace(/[^\x00-\xFF]/g, '?')
}

export function drawDraftWatermark(page: PDFPage, ctx: PdfCtx) {
  page.drawText('BORRADOR / DRAFT', {
    x: 120, y: PAGE_H / 2,
    size: 60, font: ctx.bold,
    color: rgb(0.85, 0.85, 0.85),
    rotate: degrees(45),
    opacity: 0.25,
  })
}

export async function embedPhoto(ctx: PdfCtx, blob: Blob, maxW: number, maxH: number): Promise<{ image: Awaited<ReturnType<PDFDocument['embedJpg']>>; w: number; h: number } | null> {
  try {
    const buf = await blob.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let image
    try {
      image = await ctx.doc.embedJpg(bytes)
    } catch {
      image = await ctx.doc.embedPng(bytes)
    }
    const { width, height } = image.scale(1)
    const scaleW = Math.min(1, maxW / width)
    const scaleH = Math.min(1, maxH / height)
    const scale = Math.min(scaleW, scaleH)
    return { image, w: width * scale, h: height * scale }
  } catch {
    return null
  }
}
