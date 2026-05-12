import { loadBlob } from '../db/indexeddb'
import type { PdfCtx } from './pdfHelpers'
import {
  addPage, drawHeaderBox, drawSectionHeader, drawText, embedPhoto,
  MARGIN, CONTENT_W, PAGE_H, COLORS, sanitize,
} from './pdfHelpers'
import type { FigureEntry } from '../utils/figureNumbering'

export async function buildPhotoAnnex(ctx: PdfCtx, figures: FigureEntry[], draft: boolean, pageOffset: number, totalPages: number) {
  if (figures.length === 0) return

  let pageIndex = pageOffset
  const { drawDraftWatermark } = await import('./pdfHelpers')

  const drawAnnexPage = () => {
    const { page, y, setY } = addPage(ctx)
    pageIndex++
    drawHeaderBox(page, ctx, pageIndex, totalPages)
    let curY = PAGE_H - MARGIN - 30
    curY = drawSectionHeader(page, ctx, curY, 'ANEXO FOTOGRAFICO / PHOTOGRAPHIC ANNEX')
    if (draft) drawDraftWatermark(page, ctx)
    setY(curY)
    return { page, y, setY }
  }

  let current = drawAnnexPage()
  let colIndex = 0

  for (const entry of figures) {
    const blob = await loadBlob(entry.photo.blobKey)
    if (!blob) continue

    const maxPhotoW = (CONTENT_W - 10) / 2
    const maxPhotoH = 180

    const embedded = await embedPhoto(ctx, blob, maxPhotoW, maxPhotoH)
    if (!embedded) continue

    const col = colIndex % 2
    const rowStart = current.y()

    if (col === 0 && rowStart < MARGIN + 60) {
      current = drawAnnexPage()
      colIndex = 0
    }

    const photoX = MARGIN + col * (maxPhotoW + 10)
    const photoY = current.y() - embedded.h

    current.page.drawImage(embedded.image, { x: photoX, y: photoY, width: embedded.w, height: embedded.h })

    const labelY = photoY - 5
    drawText(current.page, sanitize(entry.figureId), photoX, labelY, 7, ctx.bold)
    drawText(current.page, sanitize(entry.photo.caption || ''), photoX, labelY - 8, 5.5, ctx.regular, COLORS.darkGray, maxPhotoW)
    const ts = new Date(entry.photo.timestamp).toLocaleString('es-CO')
    drawText(current.page, ts, photoX, labelY - 15, 5, ctx.regular, COLORS.darkGray)
    drawText(current.page, sanitize(entry.sectionLabel + ' — ' + entry.itemLabel), photoX, labelY - 21, 5, ctx.regular, COLORS.darkGray, maxPhotoW)

    colIndex++

    if (col === 1) {
      const used = current.y() - photoY - 30
      current.setY(current.y() - used - 10)
    }
  }
}
