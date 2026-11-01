import { pdf } from 'pdf-to-img'
import { extractText } from 'unpdf'

import { normalizeExtractedText } from './text-normalizer'

const MAX_OCR_PAGES = 2

export async function extractPdfText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const result = await extractText(new Uint8Array(buffer), { mergePages: false })
  const pages = Array.isArray(result.text) ? result.text : [result.text]
  const text = normalizeExtractedText(
    pages
      .map((page, index) => `--- Trang ${index + 1} ---\n${page}`)
      .join('\n\n')
      .replace(/--- Trang \d+ ---\n\s*(?=--- Trang|$)/g, ''),
  )
  return { text, pageCount: result.totalPages || pages.length }
}

/**
 * Render only the first pages of a scanned PDF for OCR. We deliberately never
 * render a whole large PDF: vision calls consume the shared free allowance.
 */
export async function renderPdfPages(buffer: Buffer): Promise<Buffer[]> {
  const images: Buffer[] = []
  const document = await pdf(buffer, { scale: 1.4 })
  try {
    let index = 0
    for await (const page of document) {
      images.push(page)
      index += 1
      if (index >= MAX_OCR_PAGES) break
    }
  } finally {
    await document.destroy().catch(() => undefined)
  }
  return images
}
