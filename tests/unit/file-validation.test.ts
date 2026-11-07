import { afterEach, describe, expect, it } from 'vitest'

import {
  FileValidationError,
  maxDocumentBytes,
  maxImageBytes,
  maxTextBytes,
  sanitizeFilename,
  validateSourceText,
  validateUpload,
} from '@/lib/security/file-validation'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('sanitizeFilename', () => {
  it('removes path traversal segments', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd')
    expect(sanitizeFilename('..\\..\\windows\\system32\\cmd.exe')).toBe('cmd.exe')
  })

  it('replaces unsafe filename characters', () => {
    expect(sanitizeFilename('a<b>c:d"e|f?g*h.txt')).toBe('a-b-c-d-e-f-g-h.txt')
    expect(sanitizeFilename('bai\u0000tap.txt')).toBe('baitap.txt')
  })

  it('falls back for dot-only and empty names', () => {
    expect(sanitizeFilename('..')).toBe('tai-lieu')
    expect(sanitizeFilename('.')).toBe('tai-lieu')
    expect(sanitizeFilename('')).toBe('tai-lieu')
  })

  it('caps length at 180 characters', () => {
    expect(sanitizeFilename(`${'a'.repeat(300)}.txt`)).toHaveLength(180)
  })
})

describe('upload size limits', () => {
  it('reads limits from the environment', () => {
    process.env.MAX_IMAGE_SIZE_MB = '2'
    process.env.MAX_DOCUMENT_SIZE_MB = '7'
    process.env.MAX_TEXT_SIZE_MB = '0.5'

    expect(maxImageBytes()).toBe(2 * 1024 * 1024)
    expect(maxDocumentBytes()).toBe(7 * 1024 * 1024)
    expect(maxTextBytes()).toBe(0.5 * 1024 * 1024)
  })

  it('ignores invalid environment values', () => {
    process.env.MAX_IMAGE_SIZE_MB = 'not-a-number'
    expect(maxImageBytes()).toBe(5 * 1024 * 1024)
  })
})

describe('validateUpload', () => {
  it('accepts a UTF-8 text file and normalizes the MIME type', async () => {
    const file = new File([Buffer.from('Nội dung bài học', 'utf8')], 'bai-hoc.txt', {
      type: 'text/plain',
    })
    const validated = await validateUpload(file)

    expect(validated.category).toBe('txt')
    expect(validated.mimeType).toBe('text/plain')
    expect(validated.filename).toBe('bai-hoc.txt')
    expect(validated.size).toBe(file.size)
    expect(validated.buffer.toString('utf8')).toBe('Nội dung bài học')
  })

  it('rejects legacy .doc files', async () => {
    const file = new File([Buffer.from('legacy')], 'bai-hoc.doc', {
      type: 'application/msword',
    })
    await expect(validateUpload(file)).rejects.toThrow(/không được hỗ trợ/)
  })

  it('rejects unsupported extensions', async () => {
    const file = new File([Buffer.from('data')], 'script.exe')
    await expect(validateUpload(file)).rejects.toBeInstanceOf(FileValidationError)
  })

  it('rejects an empty file', async () => {
    const file = new File([], 'empty.txt', { type: 'text/plain' })
    await expect(validateUpload(file)).rejects.toThrow(/Tệp rỗng/)
  })

  it('rejects a text file over the configured limit', async () => {
    process.env.MAX_TEXT_SIZE_MB = '0.001'
    const file = new File([Buffer.alloc(4000, 0x61)], 'big.txt', { type: 'text/plain' })
    await expect(validateUpload(file)).rejects.toThrow(/vượt quá giới hạn/)
  })

  it('rejects NUL bytes in a text file', async () => {
    const file = new File([Buffer.from([0x61, 0x00, 0x62])], 'binary.txt', {
      type: 'text/plain',
    })
    await expect(validateUpload(file)).rejects.toThrow(/nhị phân/)
  })

  it('rejects non-UTF-8 text', async () => {
    const file = new File([Buffer.from([0xff, 0xfe, 0x61])], 'invalid.txt', {
      type: 'text/plain',
    })
    await expect(validateUpload(file)).rejects.toThrow(/UTF-8/)
  })

  it('rejects a file that claims to be an image but is not', async () => {
    const file = new File([Buffer.from('not really a png')], 'fake.png', { type: 'image/png' })
    await expect(validateUpload(file)).rejects.toThrow(/không phải ảnh/)
  })

  it('rejects a mismatched image MIME type', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    const file = new File([png], 'fake.png', { type: 'image/jpeg' })
    await expect(validateUpload(file)).rejects.toThrow(/không khớp/)
  })

  it('rejects a file that claims to be DOCX but is not a zip', async () => {
    const file = new File([Buffer.from('not a zip')], 'fake.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    await expect(validateUpload(file)).rejects.toThrow(/DOCX/)
  })

  it('rejects a PDF with the wrong magic bytes', async () => {
    const file = new File([Buffer.from('not a pdf')], 'fake.pdf', { type: 'application/pdf' })
    await expect(validateUpload(file)).rejects.toThrow(/PDF/)
  })

  it('accepts a valid PDF with leading newline or alternate mime', async () => {
    const validPdf = Buffer.from('\r\n%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\nxref\n0 2\ntrailer<</Root 1 0 R>>\nstartxref\n50\n%%EOF')
    const file = new File([validPdf], 'doc.pdf', { type: 'application/octet-stream' })
    const validated = await validateUpload(file)
    expect(validated.category).toBe('pdf')
    expect(validated.mimeType).toBe('application/pdf')
  })
})

describe('validateSourceText', () => {
  it('trims valid text', () => {
    expect(validateSourceText('  Nội dung  ')).toBe('Nội dung')
  })

  it('returns an empty string for blank input', () => {
    expect(validateSourceText('   \n ')).toBe('')
  })

  it('rejects text over 80,000 characters', () => {
    expect(() => validateSourceText('a'.repeat(80_001))).toThrow(/80\.000/)
  })

  it('rejects NUL characters', () => {
    expect(() => validateSourceText('a\u0000b')).toThrow(/không hợp lệ/)
  })
})
