import { getStudyDB } from '@/lib/database/study-payload'
import { toAttemptSummary } from '@/lib/quiz/quiz-attempts'
import { fromQuizDoc, toClientQuiz } from '@/lib/quiz/quiz-engine'
import { gradeQuiz } from '@/lib/quiz/quiz-grader'
import { emptyStats, readProgress } from '@/lib/quiz/quiz-progress'
import { readSessionHash, sessionContext } from '@/lib/security/session'
import type {
  AttemptSummary,
  ClientQuiz,
  GradedResult,
  QuizDoc,
  StudyMode,
  StudyStatsData,
} from '@/types/study'

export type HomeData = {
  progress: StudyStatsData
  recentAttempts: AttemptSummary[]
}

export type AttemptReview = {
  attempt: AttemptSummary
  result: GradedResult | null
  message: string | null
}

export async function loadHomeData(): Promise<HomeData> {
  const sessionHash = await readSessionHash()
  if (!sessionHash) return { progress: emptyStats(), recentAttempts: [] }

  try {
    const db = await getStudyDB()
    const context = sessionContext(sessionHash)
    const [progress, recent] = await Promise.all([
      readProgress(sessionHash),
      db.find({
        collection: 'quiz-attempts',
        where: { sessionHash: { equals: sessionHash } },
        sort: '-completedAt',
        limit: 3,
        depth: 0,
        overrideAccess: false,
        context,
      }),
    ])

    return {
      progress,
      recentAttempts: recent.docs.map(toAttemptSummary),
    }
  } catch (error) {
    console.error('Unable to load home data', error)
    return { progress: emptyStats(), recentAttempts: [] }
  }
}

export async function loadProgressData(): Promise<StudyStatsData> {
  const sessionHash = await readSessionHash()
  return readProgress(sessionHash)
}

export async function loadAttemptReview(id: string): Promise<AttemptReview | null> {
  const sessionHash = await readSessionHash()
  if (!sessionHash) return null

  try {
    const db = await getStudyDB()
    const context = sessionContext(sessionHash)
    const attempt = await db
      .findByID({
        collection: 'quiz-attempts',
        id,
        depth: 0,
        overrideAccess: false,
        context,
      })
      .catch(() => null)

    if (!attempt) return null

    const summary = toAttemptSummary(attempt)
    if (!summary.quizId) {
      return {
        attempt: summary,
        result: null,
        message: 'Bài kiểm tra gốc không còn tồn tại; chỉ còn điểm và câu trả lời đã lưu.',
      }
    }

    const quizRecord = await db
      .findByID({
        collection: 'quizzes',
        id: summary.quizId,
        depth: 0,
        overrideAccess: false,
        context,
      })
      .catch(() => null)

    if (!quizRecord) {
      return {
        attempt: summary,
        result: null,
        message: 'Bài kiểm tra gốc đã bị xoá; không thể dựng lại đáp án chi tiết.',
      }
    }

    const storedAnswers: Record<string, string> = {}
    if (Array.isArray(attempt.answers)) {
      for (const entry of attempt.answers) {
        if (!entry || typeof entry !== 'object') continue
        const record = entry as Record<string, unknown>
        if (typeof record.questionId === 'string' && typeof record.answer === 'string') {
          storedAnswers[record.questionId] = record.answer
        }
      }
    }

    const result = gradeQuiz(fromQuizDoc(quizRecord as unknown as QuizDoc), storedAnswers, {
      quizId: summary.quizId,
      attemptId: summary.id,
      mode: summary.mode,
      durationSeconds: summary.durationSeconds,
      completedAt: summary.completedAt,
    })

    return { attempt: summary, result, message: null }
  } catch (error) {
    console.error('Unable to load attempt review', error)
    return null
  }
}

export async function loadQuizForView(
  id: string,
  mode: StudyMode,
): Promise<{ quiz: ClientQuiz; owned: boolean } | null> {
  const sessionHash = await readSessionHash()

  try {
    const db = await getStudyDB()
    const quizRecord = await db
      .findByID({
        collection: 'quizzes',
        id,
        depth: 0,
        overrideAccess: false,
        context: sessionHash ? sessionContext(sessionHash) : {},
      })
      .catch(() => null)

    if (!quizRecord) return null

    const owned = Boolean(sessionHash && quizRecord.sessionHash === sessionHash)
    const effectiveMode: StudyMode = owned ? mode : 'exam'
    const reveal = owned && effectiveMode === 'learn'
    const sourceMaterial = quizRecord.sourceMaterial

    return {
      quiz: toClientQuiz(fromQuizDoc(quizRecord as unknown as QuizDoc), {
        quizId: id,
        mode: effectiveMode,
        reveal,
        sourceMaterialId:
          typeof sourceMaterial === 'string'
            ? sourceMaterial
            : sourceMaterial && typeof sourceMaterial === 'object' && 'id' in sourceMaterial
              ? String((sourceMaterial as { id: unknown }).id)
              : undefined,
      }),
      owned,
    }
  } catch (error) {
    console.error('Unable to load quiz', error)
    return null
  }
}
