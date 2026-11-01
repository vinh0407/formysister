import { z } from 'zod'

import type {
  InternalQuiz,
  InternalQuizQuestion,
  QuestionDifficulty,
  QuestionType,
} from '@/types/study'

export class QuizValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuizValidationError'
  }
}

const topLevelSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  difficulty: z.string().optional(),
  questions: z.array(z.unknown()).min(1).max(70),
})

const rawQuestionSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  type: z.string().optional(),
  question: z.string().optional(),
  prompt: z.string().optional(),
  options: z.array(z.unknown()).optional(),
  answer: z.union([z.string(), z.number()]).optional(),
  explanation: z.string().optional(),
  difficulty: z.string().optional(),
})

const LETTERS: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 }

function normalizeText(value: string): string {
  return value.normalize('NFC').replace(/\s+/g, ' ').trim()
}

function comparisonKey(value: string): string {
  return normalizeText(value)
    .toLocaleLowerCase('vi')
    .replace(/^[a-d]\s*[.)\-:]\s*/i, '')
    .replace(/[.。,;:]+$/g, '')
    .trim()
}

/**
 * Match a model/user answer to an option.
 *
 * Accepts the exact option text, the option letter (A-D), or a 1-based number.
 * Returns the canonical option text, or null when nothing matches.
 */
export function matchOptionAnswer(answer: string, options: string[]): string | null {
  const cleaned = normalizeText(answer)
  if (!cleaned) return null

  const letterIndex = LETTERS[cleaned.toLocaleLowerCase('en')]
  if (letterIndex !== undefined && options[letterIndex]) return options[letterIndex]

  const numberIndex = /^(\d+)[.)]?$/.exec(cleaned)
  if (numberIndex) {
    const index = Number(numberIndex[1]) - 1
    if (index >= 0 && index < options.length) return options[index]
  }

  const key = comparisonKey(cleaned)
  for (const option of options) {
    if (comparisonKey(option) === key) return option
  }

  return null
}

function normalizeType(value: string | undefined): QuestionType | null {
  if (!value) return null
  const key = value.toLowerCase().replace(/[\s_-]/g, '')
  if (key.includes('multiple') || key.includes('mcq') || key.includes('tracnghiem')) {
    return 'multiple-choice'
  }
  if (key.includes('essay') || key.includes('tuluan') || key.includes('tựluận')) {
    return 'essay'
  }
  return null
}

function normalizeDifficulty(value: string | undefined): QuestionDifficulty {
  const key = (value ?? '').toLowerCase()
  if (key === 'easy' || key === 'dễ' || key === 'de') return 'easy'
  if (key === 'hard' || key === 'khó' || key === 'kho') return 'hard'
  return 'medium'
}

function normalizeOptions(value: unknown[] | undefined): string[] {
  if (!value) return []
  const options: string[] = []
  for (const item of value) {
    if (typeof item === 'string') {
      const text = normalizeText(item)
      if (text) options.push(text)
      continue
    }
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      const candidate = record.text ?? record.label ?? record.value ?? record.option
      if (typeof candidate === 'string' && normalizeText(candidate)) {
        options.push(normalizeText(candidate))
      }
    }
  }
  return Array.from(new Set(options))
}

function invalidQuestion(index: number, message: string): never {
  throw new QuizValidationError(`Câu ${index + 1}: ${message}`)
}

function normalizeQuestion(value: unknown, index: number): InternalQuizQuestion {
  const parsed = rawQuestionSchema.safeParse(value)
  if (!parsed.success) invalidQuestion(index, 'cấu trúc không hợp lệ.')

  const raw = parsed.data
  const questionText = normalizeText(raw.question ?? raw.prompt ?? '')
  if (questionText.length < 5) invalidQuestion(index, 'thiếu nội dung câu hỏi.')
  if (questionText.length > 2000) invalidQuestion(index, 'nội dung câu hỏi quá dài.')

  const type = normalizeType(raw.type)
  if (!type) invalidQuestion(index, 'loại câu hỏi không hợp lệ.')

  const answerText = normalizeText(String(raw.answer ?? ''))
  if (!answerText) invalidQuestion(index, 'thiếu đáp án hoặc đáp án tham khảo.')

  if (type === 'multiple-choice') {
    const options = normalizeOptions(raw.options)
    if (options.length < 2 || options.length > 4) {
      invalidQuestion(index, 'câu trắc nghiệm phải có từ 2 đến 4 lựa chọn.')
    }
    const canonical = matchOptionAnswer(answerText, options)
    if (!canonical) {
      invalidQuestion(index, 'đáp án đúng không khớp với bất kỳ lựa chọn nào.')
    }
    return {
      id: `q${index + 1}`,
      type,
      question: questionText,
      options,
      answer: canonical,
      explanation:
        normalizeText(raw.explanation ?? '') || `Đáp án đúng là: ${canonical}.`,
      difficulty: normalizeDifficulty(raw.difficulty),
    }
  }

  return {
    id: `q${index + 1}`,
    type,
    question: questionText,
    options: [],
    answer: answerText.slice(0, 3000),
    explanation:
      normalizeText(raw.explanation ?? '') ||
      'Giáo viên chấm theo các ý chính trong đáp án tham khảo.',
    difficulty: normalizeDifficulty(raw.difficulty),
  }
}

export function extractJsonObject(raw: string): unknown {
  let text = raw.trim()
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  text = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new QuizValidationError('AI không trả về đối tượng JSON.')
  }

  const candidate = text.slice(start, end + 1)
  try {
    return JSON.parse(candidate)
  } catch {
    throw new QuizValidationError('JSON do AI trả về bị lỗi cú pháp.')
  }
}

export function normalizeQuiz(
  raw: unknown,
  expected: { objectiveCount: number; essayCount: number; exactCount?: boolean },
): InternalQuiz {
  const parsed = topLevelSchema.safeParse(raw)
  if (!parsed.success) {
    throw new QuizValidationError('Cấu trúc bài kiểm tra không hợp lệ.')
  }

  const questions = parsed.data.questions.map((question, index) => normalizeQuestion(question, index))

  if (expected.exactCount === false) {
    if (questions.length === 0) {
      throw new QuizValidationError('Không tìm thấy câu hỏi hợp lệ nào trong danh sách.')
    }
    const renumbered = questions.map((question, index) => ({ ...question, id: `q${index + 1}` }))
    return {
      title: normalizeText(parsed.data.title ?? '').slice(0, 200) || 'Bộ câu hỏi trắc nghiệm',
      summary:
        normalizeText(parsed.data.summary ?? '').slice(0, 1000) ||
        'Bộ câu hỏi trắc nghiệm kèm đáp án và giải thích chi tiết.',
      difficulty: normalizeDifficulty(parsed.data.difficulty),
      questions: renumbered,
    }
  }

  const kept: InternalQuizQuestion[] = []
  let objective = 0
  let essay = 0
  for (const question of questions) {
    if (question.type === 'multiple-choice') {
      if (objective >= expected.objectiveCount) continue
      objective += 1
      kept.push(question)
    } else {
      if (essay >= expected.essayCount) continue
      essay += 1
      kept.push(question)
    }
  }

  if (objective < expected.objectiveCount) {
    throw new QuizValidationError(
      `AI chỉ tạo ${objective}/${expected.objectiveCount} câu trắc nghiệm hợp lệ.`,
    )
  }
  if (essay < expected.essayCount) {
    throw new QuizValidationError(`AI chỉ tạo ${essay}/${expected.essayCount} câu tự luận hợp lệ.`)
  }
  if (kept.length === 0) throw new QuizValidationError('Bài kiểm tra không có câu hỏi hợp lệ.')

  const renumbered = kept.map((question, index) => ({ ...question, id: `q${index + 1}` }))

  return {
    title: normalizeText(parsed.data.title ?? '').slice(0, 200) || 'Bài kiểm tra tổng hợp',
    summary:
      normalizeText(parsed.data.summary ?? '').slice(0, 1000) ||
      'Bài kiểm tra được tạo từ tài liệu bạn cung cấp.',
    difficulty: normalizeDifficulty(parsed.data.difficulty),
    questions: renumbered,
  }
}

export function parseQuizResponse(
  raw: string,
  expected: { objectiveCount: number; essayCount: number; exactCount?: boolean },
): InternalQuiz {
  return normalizeQuiz(extractJsonObject(raw), expected)
}

export function parseRegeneratedQuestion(
  raw: string,
  type: QuestionType,
): InternalQuizQuestion {
  const parsed = extractJsonObject(raw) as Record<string, unknown>
  const candidate =
    parsed && typeof parsed === 'object' && parsed.question && typeof parsed.question === 'object'
      ? parsed.question
      : parsed
  const normalized = normalizeQuestion(candidate, 0)
  if (normalized.type !== type) {
    throw new QuizValidationError('AI trả về sai loại câu hỏi được yêu cầu.')
  }
  return normalized
}
