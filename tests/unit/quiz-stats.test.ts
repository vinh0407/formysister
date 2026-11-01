import { describe, expect, it } from 'vitest'

import { fromQuizDoc, toClientQuiz } from '@/lib/quiz/quiz-engine'
import { computeStats, emptyStats } from '@/lib/quiz/quiz-stats'
import type { InternalQuiz, QuizDoc } from '@/types/study'

const DAY_MS = 24 * 60 * 60 * 1000
const today = new Date().toISOString().slice(0, 10)
const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10)

describe('emptyStats', () => {
  it('returns zeroed seven-day and six-month buckets', () => {
    const stats = emptyStats()

    expect(stats.totalQuizzes).toBe(0)
    expect(stats.accuracy).toBe(0)
    expect(stats.weeklyActivity).toHaveLength(7)
    expect(stats.monthlyActivity).toHaveLength(6)
    expect(stats.weeklyActivity.every((day) => day.quizzes === 0 && day.questions === 0)).toBe(true)
    expect(stats.weeklyActivity.at(-1)?.date).toBe(today)
  })
})

describe('computeStats', () => {
  it('returns the empty shape for no attempts', () => {
    expect(computeStats([])).toEqual(emptyStats())
  })

  it('computes accuracy from objective questions only', () => {
    const stats = computeStats([
      {
        completedAt: `${today}T10:00:00.000Z`,
        quizTitle: 'Sinh học',
        objectiveQuestionCount: 4,
        essayQuestionCount: 1,
        correctCount: 3,
      },
    ])

    expect(stats.totalQuizzes).toBe(1)
    expect(stats.totalQuestions).toBe(5)
    expect(stats.totalCorrectAnswers).toBe(3)
    expect(stats.accuracy).toBe(75)
    expect(stats.materialPerformance[0]).toEqual({
      title: 'Sinh học',
      attempts: 1,
      accuracy: 75,
    })

    const todayBucket = stats.weeklyActivity.find((day) => day.date === today)
    expect(todayBucket).toEqual({ date: today, quizzes: 1, questions: 5, correct: 3 })

    const monthKey = today.slice(0, 7)
    const monthBucket = stats.monthlyActivity.find((month) => month.month === monthKey)
    expect(monthBucket?.quizzes).toBe(1)
    expect(monthBucket?.questions).toBe(5)
  })

  it('falls back to createdAt when completedAt is missing', () => {
    const stats = computeStats([
      { createdAt: `${today}T08:00:00.000Z`, objectiveQuestionCount: 2, correctCount: 2 },
    ])
    expect(stats.weeklyActivity.find((day) => day.date === today)?.quizzes).toBe(1)
  })

  it('tracks current and longest streaks across consecutive days', () => {
    const stats = computeStats([
      { completedAt: `${yesterday}T10:00:00.000Z`, objectiveQuestionCount: 1, correctCount: 1 },
      { completedAt: `${today}T10:00:00.000Z`, objectiveQuestionCount: 1, correctCount: 0 },
    ])

    expect(stats.currentStreak).toBe(2)
    expect(stats.longestStreak).toBe(2)
  })

  it('does not count a stale streak as current', () => {
    const old = new Date(Date.now() - 10 * DAY_MS).toISOString()
    const stats = computeStats([
      { completedAt: old, objectiveQuestionCount: 2, correctCount: 1 },
    ])

    expect(stats.currentStreak).toBe(0)
    expect(stats.longestStreak).toBe(1)
    expect(stats.accuracy).toBe(50)
  })

  it('groups performance by quiz title and caps the list at eight', () => {
    const attempts = Array.from({ length: 10 }, (_, index) => ({
      completedAt: `${today}T10:00:00.000Z`,
      quizTitle: `Bài ${index}`,
      objectiveQuestionCount: 2,
      correctCount: index < 5 ? 2 : 0,
    }))
    const stats = computeStats(attempts)

    expect(stats.materialPerformance).toHaveLength(8)
    expect(stats.materialPerformance[0].attempts).toBe(1)
    expect(stats.totalQuizzes).toBe(10)
  })

  it('ignores malformed counts instead of producing NaN', () => {
    const stats = computeStats([
      {
        completedAt: `${today}T10:00:00.000Z`,
        objectiveQuestionCount: 'abc',
        essayQuestionCount: null,
        correctCount: undefined,
      },
    ])

    expect(stats.totalQuestions).toBe(0)
    expect(stats.totalCorrectAnswers).toBe(0)
    expect(stats.accuracy).toBe(0)
    expect(Number.isNaN(stats.accuracy)).toBe(false)
  })
})

const internalQuiz: InternalQuiz = {
  title: 'Bài kiểm tra',
  summary: 'Tóm tắt',
  difficulty: 'easy',
  questions: [
    {
      id: 'q1',
      type: 'multiple-choice',
      question: 'Câu hỏi?',
      options: ['A', 'B'],
      answer: 'A',
      explanation: 'Vì A đúng.',
      difficulty: 'easy',
    },
    {
      id: 'q2',
      type: 'essay',
      question: 'Tự luận?',
      options: [],
      answer: 'Đáp án tham khảo',
      explanation: 'Rubric',
      difficulty: 'hard',
    },
  ],
}

describe('toClientQuiz', () => {
  it('strips answers and explanations when reveal is false', () => {
    const client = toClientQuiz(internalQuiz, { quizId: 'quiz-1', mode: 'exam', reveal: false })

    expect(client.mode).toBe('exam')
    expect(client.quizId).toBe('quiz-1')
    expect(client.questionCount).toBe(1)
    expect(client.essayCount).toBe(1)
    for (const question of client.questions) {
      expect(question.answer).toBeUndefined()
      expect(question.explanation).toBeUndefined()
    }
    expect(JSON.stringify(client)).not.toContain('Vì A đúng.')
    expect(JSON.stringify(client)).not.toContain('Đáp án tham khảo')
  })

  it('includes answers and explanations in learn mode', () => {
    const client = toClientQuiz(internalQuiz, { mode: 'learn', reveal: true })
    expect(client.questions[0].answer).toBe('A')
    expect(client.questions[0].explanation).toBe('Vì A đúng.')
    expect(client.questions[1].answer).toBe('Đáp án tham khảo')
  })

  it('omits options for essay questions', () => {
    const client = toClientQuiz(internalQuiz, { mode: 'learn', reveal: true })
    expect(client.questions[1].options).toBeUndefined()
  })
})

describe('fromQuizDoc', () => {
  it('maps stored option objects and falls back to generated ids', () => {
    const doc: QuizDoc = {
      id: 'quiz-1',
      title: 'Bài kiểm tra',
      summary: null,
      questions: [
        {
          questionId: 'q1',
          type: 'multiple-choice',
          prompt: 'Câu hỏi?',
          options: [{ text: 'A' }, { text: 'B' }],
          answer: 'A',
          explanation: null,
          difficulty: 'hard',
        },
      ],
      createdAt: '',
      updatedAt: '',
    }

    const quiz = fromQuizDoc(doc)
    expect(quiz.questions[0].id).toBe('q1')
    expect(quiz.questions[0].options).toEqual(['A', 'B'])
    expect(quiz.questions[0].explanation).toBe('')
    expect(quiz.summary).toBe('')
  })
})
