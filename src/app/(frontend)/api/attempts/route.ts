import type { Where } from 'payload'
import { z } from 'zod'

import { fail, handleApiError, json } from '@/lib/api/http'
import { getStudyDB } from '@/lib/database/study-payload'
import { fromQuizDoc } from '@/lib/quiz/quiz-engine'
import { attemptAnswersFromResult, gradeQuiz } from '@/lib/quiz/quiz-grader'
import {
  answersFromAttempt,
  parseDuration,
  toAttemptSummary,
} from '@/lib/quiz/quiz-attempts'
import { readProgress, recalculateProgress } from '@/lib/quiz/quiz-progress'
import { ensureSessionHash, readSessionHash, sessionContext } from '@/lib/security/session'
import type { QuizDoc } from '@/types/study'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const submitSchema = z.object({
  quizId: z.string().min(1).max(80),
  mode: z.enum(['learn', 'exam']).default('learn'),
  answers: z.record(z.string().max(80), z.string().max(5000)),
  attemptKey: z.string().regex(/^[A-Za-z0-9-]{8,80}$/),
  startedAt: z.string().min(1).max(40).optional(),
  durationSeconds: z.number().int().min(0).max(86_400).optional(),
})

const sortMap: Record<string, string> = {
  newest: '-completedAt',
  oldest: 'completedAt',
  'score-desc': '-totalScore',
  'score-asc': 'totalScore',
}

function parseIsoDate(value: string | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export async function GET(request: Request) {
  try {
    const sessionHash = await readSessionHash()
    if (!sessionHash) {
      return json({
        attempts: [],
        pagination: { page: 1, pageSize: 10, totalDocs: 0, totalPages: 0 },
      })
    }

    const url = new URL(request.url)
    const search = (url.searchParams.get('search') ?? '').trim().slice(0, 100)
    const mode = url.searchParams.get('mode')
    const sort = sortMap[url.searchParams.get('sort') ?? 'newest'] ?? sortMap.newest
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get('pageSize')) || 10))
    const from = url.searchParams.get('from')
    const fromDate = from ? new Date(from) : null

    const where: Where[] = [{ sessionHash: { equals: sessionHash } }]
    if (search) where.push({ quizTitle: { like: search } })
    if (mode === 'learn' || mode === 'exam') where.push({ mode: { equals: mode } })
    if (fromDate && !Number.isNaN(fromDate.getTime())) {
      where.push({ completedAt: { greater_than_equal: fromDate.toISOString() } })
    }

    const db = await getStudyDB()
    const result = await db.find({
      collection: 'quiz-attempts',
      where: { and: where },
      sort,
      page,
      limit: pageSize,
      depth: 0,
      overrideAccess: false,
      context: sessionContext(sessionHash),
    })

    return json({
      attempts: result.docs.map(toAttemptSummary),
      pagination: {
        page: result.page,
        pageSize,
        totalDocs: result.totalDocs,
        totalPages: result.totalPages,
      },
    })
  } catch (error) {
    return handleApiError(error, 'Không tải được lịch sử làm bài.')
  }
}

export async function POST(request: Request) {
  try {
    const sessionHash = await ensureSessionHash()
    const body = submitSchema.parse(await request.json())
    const db = await getStudyDB()
    const context = sessionContext(sessionHash)

    const quizRecord = await db
      .findByID({
        collection: 'quizzes',
        id: body.quizId,
        depth: 0,
        overrideAccess: false,
        context,
      })
      .catch(() => null)

    if (!quizRecord) return fail('Không tìm thấy bài kiểm tra hoặc bạn không có quyền truy cập.', 404)

    const quiz = fromQuizDoc(quizRecord as unknown as QuizDoc)
    if (quiz.questions.length === 0) return fail('Bài kiểm tra không có câu hỏi hợp lệ.', 400)

    const now = new Date()
    const completedAt = now.toISOString()
    const durationSeconds = parseDuration(body.durationSeconds)
    const startedAt =
      parseIsoDate(body.startedAt) ??
      new Date(now.getTime() - (durationSeconds ?? 0) * 1000).toISOString()

    const result = gradeQuiz(quiz, body.answers, {
      quizId: body.quizId,
      mode: body.mode,
      durationSeconds,
      completedAt,
    })

    const duplicate = await db.find({
      collection: 'quiz-attempts',
      where: {
        and: [
          { sessionHash: { equals: sessionHash } },
          { quiz: { equals: body.quizId } },
          { answersHash: { equals: body.attemptKey } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      context,
    })

    if (duplicate.docs[0]) {
      const existing = duplicate.docs[0]
      const storedAnswers = answersFromAttempt(existing)
      const storedResult = gradeQuiz(quiz, storedAnswers, {
        quizId: body.quizId,
        mode: existing.mode === 'exam' ? 'exam' : 'learn',
        attemptId: String(existing.id),
        durationSeconds:
          existing.durationSeconds == null ? null : Number(existing.durationSeconds),
        completedAt: typeof existing.completedAt === 'string' ? existing.completedAt : completedAt,
      })
      return json({
        duplicate: true,
        result: storedResult,
        attempt: toAttemptSummary(existing),
        progress: await readProgress(sessionHash),
      })
    }

    const attempt = await db.create({
      collection: 'quiz-attempts',
      data: {
        quiz: body.quizId,
        quizTitle: quiz.title,
        mode: body.mode,
        answers: attemptAnswersFromResult(result).map((answer) => ({
          ...answer,
          points: answer.points ?? undefined,
        })),
        objectiveScore: result.objectiveScore,
        essayScore: result.essayScore,
        totalScore: result.totalScore,
        correctCount: result.correctCount,
        incorrectCount: result.incorrectCount,
        unansweredCount: result.unansweredCount,
        objectiveQuestionCount: result.objectiveQuestionCount,
        essayQuestionCount: result.essayQuestionCount,
        answeredObjectiveCount: result.answeredObjectiveCount,
        answeredEssayCount: result.answeredEssayCount,
        gradingStatus: result.gradingStatus,
        answersHash: body.attemptKey,
        startedAt,
        completedAt,
        durationSeconds,
        sessionHash,
      },
      overrideAccess: false,
      context,
    })

    result.attemptId = String(attempt.id)

    let progress
    try {
      progress = await recalculateProgress(sessionHash)
    } catch (error) {
      console.error('Progress recalculation failed', error)
      progress = await readProgress(sessionHash)
    }

    return json({
      duplicate: false,
      result,
      attempt: toAttemptSummary(attempt),
      progress,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail('Dữ liệu nộp bài không hợp lệ.', 400)
    }
    return handleApiError(error, 'Không thể nộp bài lúc này.')
  }
}
