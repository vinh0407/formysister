import { describe, expect, it } from 'vitest'

import {
  extractJsonObject,
  matchOptionAnswer,
  normalizeQuiz,
  parseQuizResponse,
  parseRegeneratedQuestion,
  QuizValidationError,
} from '@/lib/quiz/quiz-validator'

const objectiveQuestion = {
  id: 'model-id-1',
  type: 'multiple-choice',
  question: 'Quá trình quang hợp tạo ra khí nào?',
  options: ['Oxy', 'Nitơ', 'Hydro', 'Cacbon dioxit'],
  answer: 'A',
  explanation: 'Quang hợp thải ra oxy.',
}

const essayQuestion = {
  id: 'model-id-1',
  type: 'essay',
  question: 'Trình bày vai trò của diệp lục trong quang hợp.',
  answer: 'Diệp lục hấp thụ ánh sáng để chuyển hoá năng lượng.',
  explanation: 'Cần nêu được vai trò hấp thụ ánh sáng.',
}

describe('matchOptionAnswer', () => {
  const options = ['Oxy', 'Nitơ', 'Hydro', 'Cacbon dioxit']

  it('maps an option letter to the canonical text', () => {
    expect(matchOptionAnswer('B', options)).toBe('Nitơ')
    expect(matchOptionAnswer('c', options)).toBe('Hydro')
  })

  it('maps a 1-based index to the canonical text', () => {
    expect(matchOptionAnswer('1', options)).toBe('Oxy')
    expect(matchOptionAnswer('4.', options)).toBe('Cacbon dioxit')
  })

  it('matches exact and prefixed option text case-insensitively', () => {
    expect(matchOptionAnswer('  oxy ', options)).toBe('Oxy')
    expect(matchOptionAnswer('C. Hydro', options)).toBe('Hydro')
    expect(matchOptionAnswer('D) Cacbon dioxit', options)).toBe('Cacbon dioxit')
  })

  it('returns null when the answer does not match', () => {
    expect(matchOptionAnswer('Ánh sáng', options)).toBeNull()
    expect(matchOptionAnswer('', options)).toBeNull()
    expect(matchOptionAnswer('E', options)).toBeNull()
  })
})

describe('normalizeQuiz', () => {
  it('renumbers question IDs so they are unique', () => {
    const quiz = normalizeQuiz(
      { title: 'Sinh học', questions: [objectiveQuestion, essayQuestion] },
      { objectiveCount: 1, essayCount: 1 },
    )

    expect(quiz.questions.map((question) => question.id)).toEqual(['q1', 'q2'])
    expect(new Set(quiz.questions.map((question) => question.id)).size).toBe(2)
  })

  it('keeps only the requested number of each question type', () => {
    const secondObjective = {
      ...objectiveQuestion,
      question: 'Khí nào cần cho quang hợp?',
      answer: 'Cacbon dioxit',
    }

    const quiz = normalizeQuiz(
      { questions: [objectiveQuestion, secondObjective, essayQuestion] },
      { objectiveCount: 1, essayCount: 1 },
    )

    expect(quiz.questions).toHaveLength(2)
    expect(quiz.questions.filter((question) => question.type === 'multiple-choice')).toHaveLength(1)
    expect(quiz.questions[1].type).toBe('essay')
  })

  it('rejects a multiple-choice answer that is not one of the options', () => {
    expect(() =>
      normalizeQuiz(
        { questions: [{ ...objectiveQuestion, answer: 'Ánh sáng' }] },
        { objectiveCount: 1, essayCount: 0 },
      ),
    ).toThrow(QuizValidationError)
  })

  it('rejects too few valid questions of a requested type', () => {
    expect(() =>
      normalizeQuiz({ questions: [objectiveQuestion] }, { objectiveCount: 2, essayCount: 0 }),
    ).toThrow(/1\/2/)
  })

  it('rejects empty or malformed question lists', () => {
    expect(() => normalizeQuiz({ questions: [] }, { objectiveCount: 1, essayCount: 0 })).toThrow(
      QuizValidationError,
    )
    expect(() => normalizeQuiz({ notQuestions: true }, { objectiveCount: 1, essayCount: 0 })).toThrow(
      QuizValidationError,
    )
  })

  it('normalizes object-shaped options and defaults difficulty', () => {
    const quiz = normalizeQuiz(
      {
        questions: [
          {
            type: 'mcq',
            prompt: 'Thủ đô của Việt Nam là gì?',
            options: [{ text: 'Hà Nội' }, { text: 'Huế' }],
            answer: 'Hà Nội',
          },
        ],
      },
      { objectiveCount: 1, essayCount: 0 },
    )

    expect(quiz.questions[0].options).toEqual(['Hà Nội', 'Huế'])
    expect(quiz.questions[0].difficulty).toBe('medium')
    expect(quiz.title).toBe('Bài kiểm tra tổng hợp')
  })

  it('caps stored title, summary and essay answers', () => {
    const quiz = normalizeQuiz(
      {
        title: 'T'.repeat(400),
        summary: 'S'.repeat(2000),
        questions: [{ ...essayQuestion, answer: 'A'.repeat(5000) }],
      },
      { objectiveCount: 0, essayCount: 1 },
    )

    expect(quiz.title).toHaveLength(200)
    expect(quiz.summary).toHaveLength(1000)
    expect(quiz.questions[0].answer).toHaveLength(3000)
  })
})

describe('extractJsonObject', () => {
  it('extracts JSON from a fenced block with surrounding prose', () => {
    const raw = 'Đây là kết quả:\n```json\n{"questions":[]}\n```\nHết.'
    expect(extractJsonObject(raw)).toEqual({ questions: [] })
  })

  it('strips a byte-order mark', () => {
    expect(extractJsonObject('\uFEFF{"ok":true}')).toEqual({ ok: true })
  })

  it('rejects text without a JSON object', () => {
    expect(() => extractJsonObject('Không có JSON')).toThrow(QuizValidationError)
    expect(() => extractJsonObject('{invalid}')).toThrow(QuizValidationError)
  })
})

describe('parseQuizResponse', () => {
  it('parses a fenced model response', () => {
    const raw = `\`\`\`json\n${JSON.stringify({ questions: [objectiveQuestion] })}\n\`\`\``
    const quiz = parseQuizResponse(raw, { objectiveCount: 1, essayCount: 0 })
    expect(quiz.questions[0].question).toContain('quang hợp')
  })
})

describe('parseRegeneratedQuestion', () => {
  it('accepts a matching question type', () => {
    const question = parseRegeneratedQuestion(JSON.stringify(objectiveQuestion), 'multiple-choice')
    expect(question.type).toBe('multiple-choice')
    expect(question.id).toBe('q1')
  })

  it('rejects a mismatched question type', () => {
    expect(() => parseRegeneratedQuestion(JSON.stringify(essayQuestion), 'multiple-choice')).toThrow(
      /sai loại câu hỏi/,
    )
  })
})
