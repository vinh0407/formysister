import { describe, expect, it } from 'vitest'

import {
  chunkText,
  normalizeExtractedText,
  truncateText,
} from '@/lib/documents/text-normalizer'

describe('normalizeExtractedText', () => {
  it('normalizes CRLF and whitespace runs', () => {
    expect(normalizeExtractedText('Dòng 1\r\nDòng 2\r\n\r\n\r\nDòng 3')).toBe(
      'Dòng 1\nDòng 2\n\nDòng 3',
    )
    expect(normalizeExtractedText('A\t\tB   C')).toBe('A B C')
  })

  it('removes control characters, zero-width characters and BOMs', () => {
    const input = '\uFEFFA\u0000B\u0001C\u00a0D\u200bE'
    expect(normalizeExtractedText(input)).toBe('AB C DE')
  })

  it('collapses three or more newlines into a paragraph break', () => {
    expect(normalizeExtractedText('A\n\n\n\nB')).toBe('A\n\nB')
  })

  it('trims leading and trailing whitespace', () => {
    expect(normalizeExtractedText('   \n  Nội dung  \n ')).toBe('Nội dung')
  })

  it('returns an empty string for whitespace-only input', () => {
    expect(normalizeExtractedText(' \n\t ')).toBe('')
  })
})

describe('truncateText', () => {
  it('returns short text unchanged', () => {
    expect(truncateText('Ngắn', 10)).toBe('Ngắn')
  })

  it('truncates and marks the removed tail', () => {
    const result = truncateText('a'.repeat(50), 20)
    expect(result.startsWith('a'.repeat(20))).toBe(true)
    expect(result).toContain('[Đã lược bớt phần còn lại.]')
  })

  it('returns an empty string for empty input', () => {
    expect(truncateText('', 10)).toBe('')
  })
})

describe('chunkText', () => {
  it('returns no chunks for empty text', () => {
    expect(chunkText('')).toEqual([])
  })

  it('returns a single chunk when the text fits', () => {
    expect(chunkText('Nội dung ngắn', 100)).toEqual(['Nội dung ngắn'])
  })

  it('splits long text into overlapping chunks under the limit', () => {
    const text = Array.from({ length: 200 }, (_, index) => `Câu số ${index}.`).join(' ')
    const chunks = chunkText(text, 300, 50)

    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(300)
      expect(chunk.length).toBeGreaterThan(0)
    }
    expect(chunks.join(' ')).toContain('Câu số 199')
  })

  it('does not loop forever with a small max size', () => {
    const chunks = chunkText('abcdefghij', 4, 1)
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks.every((chunk) => chunk.length <= 4)).toBe(true)
  })
})
