import { describe, expect, it } from 'vitest'

import { attemptAnswersFromResult, gradeQuiz } from '@/lib/quiz/quiz-grader'
import type { InternalQuiz } from '@/types/study'

const quiz: InternalQuiz = {
  title: 'Quang hợp',
  summary: 'Kiểm tra kiến thức cơ bản.',
  difficulty: 'medium',
  questions: [
    {
      id: 'q1',
      type: 'multiple-choice',
      question: 'Quang hợp tạo ra khí nào?',
      options: ['Oxy', 'Nitơ', 'Hydro'],
      answer: 'Oxy',
      explanation: 'Quang hợp thải oxy.',
      difficulty: 'easy',
    },
    {
      id: 'q2',
      type: 'multiple-choice',
      question: 'Diệp lục nằm ở đâu?',
      options: ['Lục lạp', 'Nhân', 'Không bào'],
      answer: 'Lục lạp',
      explanation: 'Diệp lục nằm trong lục lạp.',
      difficulty: 'medium',
    },
    {
      id: 'q3',
      type: 'essay',
      question: 'Nêu vai trò của ánh sáng.',
      options: [],
      answer: 'Ánh sáng cung cấp năng lượng cho phản ứng.',
      explanation: 'Chấm theo ý chính.',
      difficulty: 'hard',
    },
  ],
}

describe('gradeQuiz', () => {
  it('scores objective questions only and never auto-scores essays', () => {
    const result = gradeQuiz(
      quiz,
      { q1: 'A', q2: 'Sai rồi', q3: 'Ánh sáng cung cấp năng lượng.' },
      { quizId: 'quiz-1', mode: 'exam', durationSeconds: 90 },
    )

    expect(result.correctCount).toBe(1)
    expect(result.incorrectCount).toBe(1)
    expect(result.unansweredCount).toBe(0)
    expect(result.objectiveQuestionCount).toBe(2)
    expect(result.essayQuestionCount).toBe(1)
    expect(result.answeredObjectiveCount).toBe(2)
    expect(result.answeredEssayCount).toBe(1)
    expect(result.objectiveScore).toBe(50)
    expect(result.essayScore).toBe(0)
    expect(result.totalScore).toBe(50)
    expect(result.gradingStatus).toBe('not-graded')
    expect(result.mode).toBe('exam')
    expect(result.durationSeconds).toBe(90)
  })

  it('counts unanswered objective and essay questions separately', () => {
    const result = gradeQuiz(quiz, { q1: 'Oxy' }, { quizId: 'quiz-1' })

    expect(result.correctCount).toBe(1)
    expect(result.incorrectCount).toBe(0)
    expect(result.unansweredCount).toBe(2)
    expect(result.answeredObjectiveCount).toBe(1)
    expect(result.answeredEssayCount).toBe(0)
    expect(result.totalScore).toBe(50)
  })

  it('does not let an answered essay inflate a zero objective score', () => {
    const result = gradeQuiz(
      quiz,
      { q3: 'Một câu trả lời tự luận dài.' },
      { quizId: 'quiz-1', mode: 'learn' },
    )

    expect(result.correctCount).toBe(0)
    expect(result.objectiveScore).toBe(0)
    expect(result.totalScore).toBe(0)
    expect(result.answeredEssayCount).toBe(1)
    expect(result.unansweredCount).toBe(2)
  })

  it('marks essays with isCorrect null rather than false', () => {
    const result = gradeQuiz(quiz, { q3: 'Bài làm' }, { quizId: 'quiz-1' })
    const essay = result.questions.find((question) => question.id === 'q3')

    expect(essay?.isCorrect).toBeNull()
    expect(essay?.answered).toBe(true)
    expect(essay?.correctAnswer).toContain('Ánh sáng')
  })

  it('returns zero accuracy when there are no objective questions', () => {
    const essayOnly: InternalQuiz = {
      ...quiz,
      questions: quiz.questions.filter((question) => question.type === 'essay'),
    }
    const result = gradeQuiz(essayOnly, { q3: 'Bài làm' }, { quizId: 'quiz-2' })

    expect(result.objectiveQuestionCount).toBe(0)
    expect(result.totalScore).toBe(0)
    expect(result.essayQuestionCount).toBe(1)
  })

  it('trims whitespace-only answers as unanswered', () => {
    const result = gradeQuiz(quiz, { q1: '   ', q2: '\n' }, { quizId: 'quiz-1' })
    expect(result.unansweredCount).toBe(3)
    expect(result.answeredObjectiveCount).toBe(0)
  })
})

describe('attemptAnswersFromResult', () => {
  it('stores 100 points only for correct objective answers and null for essays', () => {
    const result = gradeQuiz(quiz, { q1: 'A', q2: 'Sai', q3: 'Bài làm' }, { quizId: 'quiz-1' })
    const answers = attemptAnswersFromResult(result)

    expect(answers).toEqual([
      { questionId: 'q1', questionType: 'multiple-choice', answer: 'A', isCorrect: true, points: 100 },
      {
        questionId: 'q2',
        questionType: 'multiple-choice',
        answer: 'Sai',
        isCorrect: false,
        points: 0,
      },
      { questionId: 'q3', questionType: 'essay', answer: 'Bài làm', isCorrect: null, points: null },
    ])
  })
})
