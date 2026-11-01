import { z } from 'zod'

import { getAIProvider } from '@/lib/ai/ai-provider'
import { fail, handleApiError, json } from '@/lib/api/http'
import { toClientQuestion } from '@/lib/quiz/quiz-engine'
import { getStoredQuiz, replaceQuestion } from '@/lib/quiz/quiz-store'
import { parseRegeneratedQuestion } from '@/lib/quiz/quiz-validator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  quizId: z.string().min(1).max(80),
  questionId: z.string().min(1).max(80),
  mode: z.enum(['learn', 'exam']).default('learn'),
})

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json())
    const stored = getStoredQuiz(body.quizId)
    if (!stored) {
      return fail('Bài kiểm tra đã hết hạn hoặc không còn tồn tại. Hãy tạo bài mới.', 404)
    }

    const target = stored.quiz.questions.find((question) => question.id === body.questionId)
    if (!target) return fail('Không tìm thấy câu hỏi cần tạo lại.', 404)
    if (stored.sourceText.trim().length < 20) {
      return fail('Bài kiểm tra không còn đủ nội dung nguồn để tạo lại câu hỏi.', 400)
    }

    const provider = getAIProvider()
    const generation = await provider.regenerateQuestion({
      text: stored.sourceText,
      type: target.type,
      previousQuestion: target.question,
      difficulty: target.difficulty,
      signal: request.signal,
    })

    const regenerated = parseRegeneratedQuestion(generation.raw, target.type)
    const updated = replaceQuestion(stored.id, target.id, { ...regenerated, id: target.id })
    if (!updated) return fail('Không thể cập nhật câu hỏi vừa tạo.', 500)

    return json({
      question: toClientQuestion(updated, body.mode === 'learn'),
      quizId: stored.id,
      questionId: updated.id,
    })
  } catch (error) {
    if (error instanceof z.ZodError) return fail('Yêu cầu tạo lại câu hỏi không hợp lệ.', 400)
    return handleApiError(error, 'Không thể tạo lại câu hỏi lúc này.')
  }
}
