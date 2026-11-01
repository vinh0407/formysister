import type { GradedQuestion, GradedResult, InternalQuiz, StudyMode } from '@/types/study'
import { matchOptionAnswer } from './quiz-validator'

export type GradeQuizOptions = {
  quizId: string
  mode?: StudyMode
  attemptId?: string
  durationSeconds?: number | null
  completedAt?: string | null
}

function cleanAnswer(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Grade objective questions only. Essays are recorded with their reference
 * answer and an explicit "not graded" status; they never inflate the score.
 */
export function gradeQuiz(
  quiz: InternalQuiz,
  answers: Record<string, string>,
  options: GradeQuizOptions,
): GradedResult {
  let correctCount = 0
  let incorrectCount = 0
  let unansweredCount = 0
  let objectiveQuestionCount = 0
  let essayQuestionCount = 0
  let answeredObjectiveCount = 0
  let answeredEssayCount = 0

  const questions: GradedQuestion[] = quiz.questions.map((question) => {
    const rawAnswer = cleanAnswer(answers[question.id])
    const answered = rawAnswer.length > 0

    if (question.type === 'multiple-choice') {
      objectiveQuestionCount += 1
      if (answered) answeredObjectiveCount += 1

      const matched = answered ? matchOptionAnswer(rawAnswer, question.options) : null
      const isCorrect = matched !== null && matched === question.answer

      if (!answered) {
        unansweredCount += 1
      } else if (isCorrect) {
        correctCount += 1
      } else {
        incorrectCount += 1
      }

      return {
        id: question.id,
        questionId: question.id,
        question: question.question,
        type: question.type,
        options: question.options,
        correctAnswer: question.answer,
        explanation: question.explanation,
        userAnswer: rawAnswer,
        isCorrect,
        answered,
        difficulty: question.difficulty,
      }
    }

    essayQuestionCount += 1
    if (answered) {
      answeredEssayCount += 1
    } else {
      unansweredCount += 1
    }

    return {
      id: question.id,
      questionId: question.id,
      question: question.question,
      type: question.type,
      options: [],
      correctAnswer: question.answer,
      explanation: question.explanation,
      userAnswer: rawAnswer,
      isCorrect: null,
      answered,
      difficulty: question.difficulty,
    }
  })

  const objectiveScore =
    objectiveQuestionCount > 0 ? Math.round((correctCount / objectiveQuestionCount) * 100) : 0

  return {
    attemptId: options.attemptId,
    quizId: options.quizId,
    quizTitle: quiz.title,
    objectiveScore,
    essayScore: 0,
    totalScore: objectiveScore,
    correctCount,
    incorrectCount,
    unansweredCount,
    objectiveQuestionCount,
    essayQuestionCount,
    answeredObjectiveCount,
    answeredEssayCount,
    // Essays are never auto-graded in this build. AI-assisted grading is a
    // separate, explicit operation and must be labelled when implemented.
    gradingStatus: 'not-graded',
    questions,
    durationSeconds: options.durationSeconds ?? null,
    completedAt: options.completedAt ?? null,
    mode: options.mode,
  }
}

export function attemptAnswersFromResult(result: GradedResult) {
  return result.questions.map((question) => ({
    questionId: question.questionId,
    questionType: question.type,
    answer: question.userAnswer,
    isCorrect: question.isCorrect,
    points: question.type === 'multiple-choice' ? (question.isCorrect ? 100 : 0) : null,
  }))
}
