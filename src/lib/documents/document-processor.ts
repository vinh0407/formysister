import type { AIProvider } from '@/lib/ai/ai-provider'
import type { ValidatedFile } from '@/lib/security/file-validation'
import { extractDocxText } from './docx-processor'
import { prepareImageForVision, imageToDataUrl } from './image-processor'
import { extractPdfText, renderPdfPages } from './pdf-processor'
import { normalizeExtractedText, truncateText } from './text-normalizer'

export class DocumentProcessingError extends Error {
  readonly status = 422

  constructor(message: string) {
    super(message)
    this.name = 'DocumentProcessingError'
  }
}

export type ProcessedDocument = {
  text: string
  sourceType: 'image' | 'pdf' | 'docx' | 'txt'
  pageCount?: number
  usedOcr: boolean
}

const STORE_LIMIT = 120_000

export async function processDocument(
  file: ValidatedFile,
  provider: AIProvider,
  signal?: AbortSignal,
): Promise<ProcessedDocument> {
  if (file.category === 'image') {
    const prepared = await prepareImageForVision(file.buffer)
    const result = await provider.analyzeImage({
      dataUrl: imageToDataUrl(prepared),
      signal,
    })
    const text = normalizeExtractedText(result.raw)
    if (text.length < 20) {
      throw new DocumentProcessingError(
        'Không trích xuất được đủ nội dung từ ảnh. Hãy dùng ảnh rõ nét hơn hoặc nhập văn bản.',
      )
    }
    return { text: truncateText(text, STORE_LIMIT), sourceType: 'image', pageCount: 1, usedOcr: true }
  }

  if (file.category === 'docx') {
    let text: string
    try {
      text = await extractDocxText(file.buffer)
    } catch {
      throw new DocumentProcessingError('Không đọc được DOCX. Tệp có thể bị hỏng hoặc được bảo vệ.')
    }
    if (text.length < 20) {
      throw new DocumentProcessingError('DOCX không có đủ nội dung văn bản để tạo câu hỏi.')
    }
    return { text: truncateText(text, STORE_LIMIT), sourceType: 'docx', usedOcr: false }
  }

  if (file.category === 'txt') {
    const text = normalizeExtractedText(file.buffer.toString('utf8'))
    if (text.length < 20) {
      throw new DocumentProcessingError('Tệp văn bản quá ngắn để tạo câu hỏi.')
    }
    return { text: truncateText(text, STORE_LIMIT), sourceType: 'txt', usedOcr: false }
  }

  let extracted: { text: string; pageCount: number }
  try {
    extracted = await extractPdfText(file.buffer)
  } catch {
    throw new DocumentProcessingError('Không đọc được PDF. Tệp có thể bị hỏng hoặc được mã hoá.')
  }

  const textLength = extracted.text.replace(/--- Trang \d+ ---/g, '').trim().length
  if (textLength >= 200) {
    return {
      text: truncateText(extracted.text, STORE_LIMIT),
      sourceType: 'pdf',
      pageCount: extracted.pageCount,
      usedOcr: false,
    }
  }

  // Scanned PDF: OCR a bounded number of pages instead of sending the file to
  // the model. If rendering is unavailable, keep any embedded text.
  try {
    const pages = await renderPdfPages(file.buffer)
    const ocrParts: string[] = []
    for (const page of pages) {
      const prepared = await prepareImageForVision(page)
      const result = await provider.analyzeImage({
        dataUrl: imageToDataUrl(prepared),
        signal,
      })
      const text = normalizeExtractedText(result.raw)
      if (text) ocrParts.push(text)
    }
    const combined = normalizeExtractedText(`${extracted.text}\n\n${ocrParts.join('\n\n')}`)
    if (combined.replace(/--- Trang \d+ ---/g, '').trim().length < 20) {
      throw new DocumentProcessingError(
        'PDF có thể là bản scan nhưng không trích xuất được chữ. Hãy tải ảnh trang hoặc bản PDF có lớp văn bản.',
      )
    }
    return {
      text: truncateText(combined, STORE_LIMIT),
      sourceType: 'pdf',
      pageCount: extracted.pageCount,
      usedOcr: true,
    }
  } catch (error) {
    if (error instanceof DocumentProcessingError) throw error
    if (extracted.text.trim().length >= 20) {
      return {
        text: truncateText(extracted.text, STORE_LIMIT),
        sourceType: 'pdf',
        pageCount: extracted.pageCount,
        usedOcr: false,
      }
    }
    throw new DocumentProcessingError(
      'Không thể OCR PDF scan trên máy chủ này. Hãy tải ảnh trang hoặc PDF có lớp văn bản.',
    )
  }
}
