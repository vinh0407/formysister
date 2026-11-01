import mammoth from 'mammoth'

import { normalizeExtractedText } from './text-normalizer'

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/**
 * Extract paragraphs and table cells from DOCX.
 *
 * Mammoth's HTML conversion keeps table structure; we turn rows/cells into
 * newlines and tabs so the model sees readable structure without HTML noise.
 */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer })
  const text = decodeEntities(
    result.value
      .replace(/<\/(p|h[1-6]|li|tr)>/gi, '\n')
      .replace(/<\/t[dh]>/gi, '\t')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
  const normalized = normalizeExtractedText(text)

  if (normalized.length > 0) return normalized

  const fallback = await mammoth.extractRawText({ buffer })
  return normalizeExtractedText(fallback.value)
}
