import { fileTypeFromBuffer } from 'file-type'

export type FileCategory = 'image' | 'pdf' | 'docx' | 'txt'

export type ValidatedFile = {
  buffer: Buffer
  filename: string
  mimeType: string
  size: number
  category: FileCategory
}

const MB = 1024 * 1024
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp'])
const DOCUMENT_EXTENSIONS = new Set(['pdf', 'docx', 'txt', 'md'])
const LEGACY_EXTENSIONS = new Set(['doc', 'rtf', 'odt'])

const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])
const PDF_MIME = 'application/pdf'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const TEXT_MIMES = new Set(['text/plain', 'text/markdown', 'text/x-markdown', 'application/octet-stream'])

export class FileValidationError extends Error {
  readonly status = 400

  constructor(message: string) {
    super(message)
    this.name = 'FileValidationError'
  }
}

function envMb(name: string, fallback: number): number {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function maxImageBytes(): number {
  return envMb('MAX_IMAGE_SIZE_MB', 5) * MB
}

export function maxDocumentBytes(): number {
  return envMb('MAX_DOCUMENT_SIZE_MB', 10) * MB
}

export function maxTextBytes(): number {
  return envMb('MAX_TEXT_SIZE_MB', 1) * MB
}

export function sanitizeFilename(name: string): string {
  const base = name
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>:"|?*]/g, '-')
    .trim()
  const safe = (base || 'tai-lieu').slice(0, 180)
  return safe === '.' || safe === '..' ? 'tai-lieu' : safe
}

function extensionOf(filename: string): string {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? (parts.pop() ?? '') : ''
}

/**
 * Validate a user upload before any parsing or AI call.
 *
 * Checks extension, declared MIME, size and, where the format has one, magic
 * bytes. Legacy .doc files are rejected because no reliable parser is bundled.
 */
export async function validateUpload(file: File): Promise<ValidatedFile> {
  const filename = sanitizeFilename(file.name)
  const extension = extensionOf(filename)
  const declaredMime = (file.type || '').toLowerCase()

  if (LEGACY_EXTENSIONS.has(extension)) {
    throw new FileValidationError(
      'Định dạng .doc/.rtf/.odt không được hỗ trợ. Vui lòng lưu lại thành .docx, PDF hoặc TXT.',
    )
  }
  if (!IMAGE_EXTENSIONS.has(extension) && !DOCUMENT_EXTENSIONS.has(extension)) {
    throw new FileValidationError(
      'Định dạng chưa được hỗ trợ. Hãy dùng ảnh PNG/JPG/WEBP, PDF, DOCX hoặc TXT.',
    )
  }

  const isImage = IMAGE_EXTENSIONS.has(extension)
  const limit = isImage ? maxImageBytes() : extension === 'txt' || extension === 'md' ? maxTextBytes() : maxDocumentBytes()
  if (file.size <= 0) throw new FileValidationError('Tệp rỗng hoặc không đọc được.')
  if (file.size > limit) {
    throw new FileValidationError(
      `Tệp vượt quá giới hạn ${Math.round(limit / MB)} MB cho định dạng này.`,
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const detected = await fileTypeFromBuffer(buffer).catch(() => undefined)

  let category: FileCategory
  let mimeType: string

  if (isImage) {
    if (!IMAGE_MIME.has(declaredMime) && declaredMime !== '') {
      throw new FileValidationError('Kiểu MIME của ảnh không hợp lệ.')
    }
    if (!detected || !IMAGE_MIME.has(detected.mime)) {
      throw new FileValidationError('Nội dung tệp không phải ảnh PNG/JPG/WEBP hợp lệ.')
    }
    if (detected.mime !== declaredMime && declaredMime !== '') {
      throw new FileValidationError('Phần mở rộng và nội dung ảnh không khớp nhau.')
    }
    category = 'image'
    mimeType = detected.mime
  } else if (extension === 'pdf') {
    const isDeclaredPdf =
      declaredMime === '' ||
      declaredMime === PDF_MIME ||
      declaredMime === 'application/x-pdf' ||
      declaredMime === 'application/octet-stream' ||
      declaredMime.includes('pdf')
    if (!isDeclaredPdf) {
      throw new FileValidationError('Kiểu MIME của PDF không hợp lệ.')
    }
    const hasPdfMagic = buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))
    const isDetectedPdf = detected?.mime === PDF_MIME || hasPdfMagic
    if (!isDetectedPdf) {
      throw new FileValidationError('Tệp không phải PDF hợp lệ.')
    }
    category = 'pdf'
    mimeType = PDF_MIME
  } else if (extension === 'docx') {
    if (declaredMime !== '' && declaredMime !== DOCX_MIME) {
      throw new FileValidationError('Kiểu MIME của DOCX không hợp lệ.')
    }
    const looksLikeZip = buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
    const detectedDocx =
      detected?.mime === DOCX_MIME ||
      detected?.ext === 'docx' ||
      detected?.mime === 'application/zip' ||
      detected?.ext === 'zip'
    if (!looksLikeZip || !detectedDocx) {
      throw new FileValidationError('Tệp không phải DOCX hợp lệ.')
    }
    category = 'docx'
    mimeType = DOCX_MIME
  } else {
    if (declaredMime !== '' && !TEXT_MIMES.has(declaredMime)) {
      throw new FileValidationError('Kiểu MIME của tệp văn bản không hợp lệ.')
    }
    if (buffer.includes(0)) {
      throw new FileValidationError('Tệp văn bản chứa dữ liệu nhị phân không hợp lệ.')
    }
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    } catch {
      throw new FileValidationError('Tệp văn bản phải được mã hoá UTF-8.')
    }
    category = 'txt'
    mimeType = extension === 'md' ? 'text/markdown' : 'text/plain'
  }

  return { buffer, filename, mimeType, size: file.size, category }
}

export function validateSourceText(value: string): string {
  const text = value.trim()
  if (!text) return ''
  if (text.length > 80_000) {
    throw new FileValidationError('Nội dung nhập trực tiếp vượt quá giới hạn 80.000 ký tự.')
  }
  if (text.includes('\u0000')) {
    throw new FileValidationError('Nội dung văn bản chứa ký tự không hợp lệ.')
  }
  return text
}
