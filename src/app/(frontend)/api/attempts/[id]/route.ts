import { fail, handleApiError, json } from '@/lib/api/http'
import { getStudyDB } from '@/lib/database/study-payload'
import { fromQuizDoc } from '@/lib/quiz/quiz-engine'
import { gradeQuiz } from '@/lib/quiz/quiz-grader'
import { answersFromAttempt, toAttemptSummary } from '@/lib/quiz/quiz-attempts'
import { readProgress, recalculateProgress } from '@/lib/quiz/quiz-progress'
import { readSessionHash, sessionContext } from '@/lib/security/session'
import type { QuizDoc } from '@/types/study'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Context) {
  try {
    const sessionHash = await readSessionHash()
    if (!sessionHash) return fail('Phiên học không hợp lệ.', 401)

    const { id } = await params
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

    if (!attempt) return fail('Không tìm thấy lượt làm bài.', 404)

    const quizRef = attempt.quiz
    const quizId =
      typeof quizRef === 'string'
        ? quizRef
        : quizRef && typeof quizRef === 'object' && 'id' in quizRef
          ? String((quizRef as { id: unknown }).id)
          : null

    const storedAnswers = answersFromAttempt(attempt)
    const summary = toAttemptSummary(attempt)

    if (!quizId) {
      return json({ attempt: summary, result: null, progress: await readProgress(sessionHash) })
    }

    const quizRecord = await db
      .findByID({
        collection: 'quizzes',
        id: quizId,
        depth: 0,
        overrideAccess: false,
        context,
      })
      .catch(() => null)

    if (!quizRecord) {
      return json({
        attempt: summary,
        result: null,
        message: 'Bài kiểm tra gốc đã bị xoá; chỉ còn điểm và câu trả lời đã lưu.',
        progress: await readProgress(sessionHash),
      })
    }

    const result = gradeQuiz(fromQuizDoc(quizRecord as unknown as QuizDoc), storedAnswers, {
      quizId,
      attemptId: summary.id,
      mode: summary.mode,
      durationSeconds: summary.durationSeconds,
      completedAt: summary.completedAt,
    })

    return json({
      attempt: summary,
      result,
      progress: await readProgress(sessionHash),
    })
  } catch (error) {
    return handleApiError(error, 'Không tải được chi tiết lượt làm bài.')
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const sessionHash = await readSessionHash()
    if (!sessionHash) return fail('Phiên học không hợp lệ.', 401)

    const { id } = await params
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

    if (!attempt) return fail('Không tìm thấy lượt làm bài.', 404)

    await db.delete({
      collection: 'quiz-attempts',
      id,
      overrideAccess: false,
      context,
    })

    let progress
    try {
      progress = await recalculateProgress(sessionHash)
    } catch (error) {
      console.error('Progress recalculation after delete failed', error)
      progress = await readProgress(sessionHash)
    }

    return json({ ok: true, progress })
  } catch (error) {
    return handleApiError(error, 'Không xoá được lượt làm bài.')
  }
}
