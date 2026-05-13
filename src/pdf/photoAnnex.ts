import { loadBlob } from '../db/indexeddb'
import type { PDFImage } from 'pdf-lib'
import type { PdfCtx } from './pdfHelpers'
import {
  addPage, drawHeaderBox, drawSectionHeader, drawText, embedPhoto,
  MARGIN, CONTENT_W, PAGE_H, COLORS, sanitize,
} from './pdfHelpers'
import type { FigureEntry } from '../utils/figureNumbering'

const COL_GAP  = 10   // horizontal gap between the two photo columns
const TEXT_PAD = 5    // vertical gap from photo bottom to first text line
const ROW_GAP  = 14   // vertical gap between consecutive photo rows

export async function buildPhotoAnnex(
  ctx: PdfCtx,
  figures: FigureEntry[],
  draft: boolean,
  pageOffset: number,
  totalPages: number,
  logoImage?: PDFImage,
) {
  if (figures.length === 0) return

  let pageIndex = pageOffset
  const { drawDraftWatermark } = await import('./pdfHelpers')
  const maxPhotoW = (CONTENT_W - COL_GAP) / 2

  const drawAnnexPage = () => {
    const p = addPage(ctx)
    pageIndex++
    drawHeaderBox(p.page, ctx, pageIndex, totalPages, logoImage)
    const sectionBottom = drawSectionHeader(
      p.page, ctx,
      PAGE_H - MARGIN - 30,
      'ANEXO FOTOGRAFICO / PHOTOGRAPHIC ANNEX',
    )
    if (draft) drawDraftWatermark(p.page, ctx)
    p.setY(sectionBottom)
    return p
  }

  let current   = drawAnnexPage()
  let colIndex  = 0
  let rowStartY = current.y()        // Y at the top of the current row
  let leftBlockBottom = 0            // bottom of the left-column text block

  for (const entry of figures) {
    const blob = await loadBlob(entry.photo.blobKey)
    if (!blob) continue

    const embedded = await embedPhoto(ctx, blob, maxPhotoW, 180)
    if (!embedded) continue

    const col = colIndex % 2

    // ── Start of a new row (left column) ─────────────────────────────────────
    if (col === 0) {
      rowStartY = current.y()
      // Conservative check: photo + at least 40 pt for text labels
      if (rowStartY - embedded.h - 40 < MARGIN) {
        current   = drawAnnexPage()
        rowStartY = current.y()
      }
    }

    // ── Draw photo ────────────────────────────────────────────────────────────
    const photoX = MARGIN + col * (maxPhotoW + COL_GAP)
    const photoY = rowStartY - embedded.h   // bottom edge of the photo

    current.page.drawImage(embedded.image, {
      x: photoX, y: photoY, width: embedded.w, height: embedded.h,
    })

    // ── Draw text labels sequentially below the photo ─────────────────────────
    let textY = photoY - TEXT_PAD

    // 1. Figure ID  (7 pt bold — never wraps)
    drawText(current.page, sanitize(entry.figureId), photoX, textY, 7, ctx.bold)
    textY -= 9

    // 2. Caption  (5.5 pt, wrappable)
    const caption = sanitize(entry.photo.caption || '')
    if (caption) {
      const capH = drawText(
        current.page, caption, photoX, textY, 5.5, ctx.regular, COLORS.darkGray, maxPhotoW,
      )
      textY -= (capH + 2)
    }

    // 3. Timestamp  (5 pt)
    const ts = new Date(entry.photo.timestamp).toLocaleString('es-CO')
    drawText(current.page, ts, photoX, textY, 5, ctx.regular, COLORS.darkGray)
    textY -= 7

    // 4. Section — item label  (5 pt, wrappable; use hyphen, not em-dash)
    const sectionLabel = sanitize(entry.sectionLabel + ' - ' + entry.itemLabel)
    const secH = drawText(
      current.page, sectionLabel, photoX, textY, 5, ctx.regular, COLORS.darkGray, maxPhotoW,
    )
    textY -= secH

    const blockBottom = textY   // lowest Y point of this column's content

    if (col === 0) {
      // Remember left-column bottom; don't advance Y yet
      leftBlockBottom = blockBottom
    } else {
      // Both columns drawn — advance Y past the taller block
      const rowBottom = Math.min(leftBlockBottom, blockBottom)  // lower on page = smaller Y
      current.setY(rowBottom - ROW_GAP)
    }

    colIndex++
  }

  // Odd number of photos: advance Y after the unpaired left block
  if (colIndex % 2 === 1) {
    current.setY(leftBlockBottom - ROW_GAP)
  }
}
