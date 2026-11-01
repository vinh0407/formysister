import type { AttemptSummary, QuizDoc, StudyMode } from '@/types/study'

export function toAttemptSummary(doc: Record<string, unknown>): AttemptSummary {
  const quiz = doc.quiz
  const quizId =
    typeof quiz === 'string'
      ? quiz
      : quiz && typeof quiz === 'object' && 'id' in quiz
        ? String((quiz as { id: unknown }).id)
        : ''

  return {
    id: String(doc.id),
    quizId,
    quizTitle: String(doc.quizTitle ?? 'Bài kiểm tra'),
    mode: doc.mode === 'exam' ? 'exam' : 'learn',
    totalScore: Number(doc.totalScore) || 0,
    objectiveScore: Number(doc.objectiveScore) || 0,
    correctCount: Number(doc.correctCount) || 0,
    incorrectCount: Number(doc.incorrectCount) || 0,
    unansweredCount: Number(doc.unansweredCount) || 0,
    objectiveQuestionCount: Number(doc.objectiveQuestionCount) || 0,
    essayQuestionCount: Number(doc.essayQuestionCount) || 0,
    durationSeconds: doc.durationSeconds == null ? null : Number(doc.durationSeconds),
    completedAt: typeof doc.completedAt === 'string' ? doc.completedAt : null,
    createdAt: String(doc.createdAt ?? ''),
  }
}

export function answersFromAttempt(doc: Record<string, unknown>): Record<string, string> {
  const answers: Record<string, string> = {}
  if (!Array.isArray(doc.answers)) return answers
  for (const entry of doc.answers) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const questionId = record.questionId
    const answer = record.answer
    if (typeof questionId === 'string' && typeof answer === 'string') {
      answers[questionId] = answer
    }
  }
  return answers
}

export function quizIdFromDoc(doc: QuizDoc | Record<string, unknown>): string {
  const quiz = (doc as Record<string, unknown>).quiz
  if (typeof quiz === 'string') return quiz
  if (quiz && typeof quiz === 'object' && 'id' in quiz) {
    return String((quiz as { id: unknown }).id)
  }
  return String((doc as Record<string, unknown>).id ?? '')
}

export function parseDuration(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.min(86_400, Math.floor(parsed))
}

export function modeOf(value: unknown): StudyMode {
  return value === 'exam' ? 'exam' : 'learn'
}
