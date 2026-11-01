import { z } from 'zod'

import { getAIProvider } from '@/lib/ai/ai-provider'
import { fail, handleApiError, json } from '@/lib/api/http'
import { getStudyDB } from '@/lib/database/study-payload'
import { fromQuizDoc, toClientQuestion, toPayloadQuestions } from '@/lib/quiz/quiz-engine'
import { parseRegeneratedQuestion } from '@/lib/quiz/quiz-validator'
import { consumeRateLimit, getClientIp, rateLimitMessage } from '@/lib/security/rate-limit'
import { ensureSessionHash, sessionContext } from '@/lib/security/session'
import type { QuizDoc, StudyMode } from '@/types/study'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  quizId: z.string().min(1).max(80),
  questionId: z.string().min(1).max(80),
  mode: z.enum(['learn', 'exam']).default('learn'),
})

export async function POST(request: Request) {
  try {
    const sessionHash = await ensureSessionHash()
    const ip = getClientIp(request)
    const body = schema.parse(await request.json())

    const rate = await consumeRateLimit(ip, sessionHash)
    if (!rate.allowed) {
      return json(
        {
          error: rateLimitMessage(rate),
          retryAfterSeconds: rate.retryAfterSeconds,
          code: rate.unavailable ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMITED',
        },
        429,
      )
    }

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

    if (!quizRecord) return fail('Không tìm thấy bài kiểm tra.', 404)
    if (quizRecord.sessionHash !== sessionHash) {
      return fail('Bạn không có quyền tạo lại câu hỏi cho bài kiểm tra này.', 403)
    }

    const quiz = fromQuizDoc(quizRecord as unknown as QuizDoc)
    const index = quiz.questions.findIndex((question) => question.id === body.questionId)
    if (index === -1) return fail('Không tìm thấy câu hỏi cần tạo lại.', 404)
    const target = quiz.questions[index]

    const materialRef = quizRecord.sourceMaterial
    const materialId =
      typeof materialRef === 'string'
        ? materialRef
        : materialRef && typeof materialRef === 'object' && 'id' in materialRef
          ? String((materialRef as { id: unknown }).id)
          : null

    if (!materialId) {
      return fail('Bài kiểm tra không còn tài liệu nguồn để tạo lại câu hỏi.', 400)
    }

    const material = await db
      .findByID({
        collection: 'study-materials',
        id: materialId,
        depth: 0,
        overrideAccess: false,
        context,
      })
      .catch(() => null)

    const sourceText = typeof material?.extractedText === 'string' ? material.extractedText : ''
    if (sourceText.trim().length < 20) {
      return fail('Tài liệu nguồn không còn đủ nội dung để tạo lại câu hỏi.', 400)
    }

    const provider = getAIProvider()
    const generation = await provider.regenerateQuestion({
      text: sourceText,
      type: target.type,
      previousQuestion: target.question,
      difficulty: target.difficulty,
      signal: request.signal,
    })
    const regenerated = parseRegeneratedQuestion(generation.raw, target.type)
    const updated = { ...regenerated, id: target.id }
    quiz.questions[index] = updated

    await db.update({
      collection: 'quizzes',
      id: body.quizId,
      data: {
        questions: toPayloadQuestions(quiz),
        questionCount: quiz.questions.filter((question) => question.type === 'multiple-choice').length,
        essayCount: quiz.questions.filter((question) => question.type === 'essay').length,
      },
      overrideAccess: false,
      context,
    })

    const mode: StudyMode = body.mode === 'exam' ? 'exam' : 'learn'
    return json({
      question: toClientQuestion(updated, mode === 'learn'),
      quizId: body.quizId,
      questionId: target.id,
    })
  } catch (error) {
    if (error instanceof z.ZodError) return fail('Yêu cầu tạo lại câu hỏi không hợp lệ.', 400)
    return handleApiError(error, 'Không thể tạo lại câu hỏi lúc này.')
  }
}
