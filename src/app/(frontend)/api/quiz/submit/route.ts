import { z } from 'zod'

import { fail, handleApiError, json } from '@/lib/api/http'
import { gradeQuiz } from '@/lib/quiz/quiz-grader'
import { getStoredQuiz } from '@/lib/quiz/quiz-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  quizId: z.string().min(1).max(80),
  answers: z.record(z.string().max(80), z.string().max(5000)),
  durationSeconds: z.number().int().min(0).max(86_400).optional(),
})

/**
 * Grade a stored quiz. The mode is read from the server-side record, never
 * from the request, so clients cannot turn an exam into a learn-mode quiz.
 */
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json())
    const stored = getStoredQuiz(body.quizId)
    if (!stored) {
      return fail('Bài kiểm tra đã hết hạn hoặc không còn tồn tại. Hãy tạo bài mới.', 404)
    }

    const result = gradeQuiz(stored.quiz, body.answers, {
      quizId: stored.id,
      mode: stored.mode,
      durationSeconds: body.durationSeconds ?? null,
      completedAt: new Date().toISOString(),
    })

    return json({ result })
  } catch (error) {
    if (error instanceof z.ZodError) return fail('Dữ liệu nộp bài không hợp lệ.', 400)
    return handleApiError(error, 'Không thể nộp bài lúc này. Vui lòng thử lại.')
  }
}
