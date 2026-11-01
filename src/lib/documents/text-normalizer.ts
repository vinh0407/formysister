/**
 * Normalize text extracted from PDF/DOCX/TXT before storage or prompting.
 *
 * Removes control characters, normalizes Unicode whitespace and caps repeated
 * blank lines while preserving paragraph boundaries.
 */
export function normalizeExtractedText(input: string): string {
  return input
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars).trimEnd()}\n\n[Đã lược bớt phần còn lại.]`
}

export function chunkText(text: string, maxChars = 6000, overlap = 200): string[] {
  if (text.length <= maxChars) return text ? [text] : []
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length)
    let slice = text.slice(start, end)
    if (end < text.length) {
      const breakpoint = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('. '))
      if (breakpoint > maxChars * 0.5) {
        slice = slice.slice(0, breakpoint + 1)
      }
    }
    chunks.push(slice.trim())
    start += Math.max(1, slice.length - overlap)
  }
  return chunks.filter(Boolean)
}
