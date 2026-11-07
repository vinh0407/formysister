import { extractText } from 'unpdf'

import { normalizeExtractedText } from './text-normalizer'

const MAX_OCR_PAGES = 2

export async function extractPdfText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  // Pass correct buffer slice to Uint8Array
  const u8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const result = await extractText(u8, { mergePages: false })
  const pages = Array.isArray(result.text) ? result.text : [result.text || '']
  const text = normalizeExtractedText(
    pages
      .map((page, index) => `--- Trang ${index + 1} ---\n${page}`)
      .join('\n\n')
      .replace(/--- Trang \d+ ---\n\s*(?=--- Trang|$)/g, ''),
  )
  return { text, pageCount: result.totalPages || pages.length }
}

/**
 * Render only the first pages of a scanned PDF for OCR.
 * pdf-to-img is lazily imported so environments without native canvas (e.g. Vercel)
 * don't crash when normal text PDFs are processed.
 */
export async function renderPdfPages(buffer: Buffer): Promise<Buffer[]> {
  try {
    const { pdf } = await import('pdf-to-img')
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
  } catch (err) {
    console.warn('pdf-to-img is not supported or failed to load in this environment:', err)
    return []
  }
}
