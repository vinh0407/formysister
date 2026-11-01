import { getAIProvider } from '@/lib/ai/ai-provider'
import { isAIConfigured } from '@/lib/ai/ai-usage'
import { fail, handleApiError, json } from '@/lib/api/http'
import { DocumentProcessingError, processDocument } from '@/lib/documents/document-processor'
import { toClientQuiz } from '@/lib/quiz/quiz-engine'
import { clientIp, consumeLimit, saveQuiz } from '@/lib/quiz/quiz-store'
import { parseQuizResponse, QuizValidationError } from '@/lib/quiz/quiz-validator'
import { validateSourceText, validateUpload } from '@/lib/security/file-validation'
import type { QuestionDifficulty, StudyMode } from '@/types/study'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GENERATIONS_PER_HOUR = 10

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

function difficultyOf(value: unknown): QuestionDifficulty {
  return value === 'easy' || value === 'hard' ? value : 'medium'
}

/** Stateless quiz generation: no database, no account, no session. */
export async function POST(request: Request) {
  try {
    if (!isAIConfigured()) {
      return fail(
        'AI chưa được cấu hình trên máy chủ. Cần thêm CLOUDFLARE_ACCOUNT_ID và CLOUDFLARE_API_TOKEN.',
        503,
      )
    }

    const limit = consumeLimit(
      `generate:${clientIp(request)}`,
      GENERATIONS_PER_HOUR,
      60 * 60 * 1000,
    )
    if (!limit.allowed) {
      return fail('Bạn đã tạo quá nhiều bài trong 1 giờ. Vui lòng thử lại sau.', 429, {
        retryAfterSeconds: limit.retryAfterSeconds,
        code: 'RATE_LIMITED',
      })
    }

    const form = await request.formData()

    const sourceText = validateSourceText(
      typeof form.get('sourceText') === 'string' ? String(form.get('sourceText')) : '',
    )
    const contentType: 'lesson' | 'existing-questions' =
      form.get('contentType') === 'existing-questions' ? 'existing-questions' : 'lesson'
    const isExisting = contentType === 'existing-questions'
    const objectiveCount = isExisting ? 0 : clampInt(form.get('questionCount'), 1, 50, 10)
    const essayCount = isExisting ? 0 : clampInt(form.get('essayCount'), 0, 10, 2)
    if (!isExisting && objectiveCount + essayCount > 60) {
      return fail('Tổng số câu hỏi không được vượt quá 60.', 400)
    }

    const rawFile = form.get('file')
    const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null
    if (!file && !sourceText) {
      return fail('Hãy nhập nội dung bài học hoặc đính kèm một tài liệu, hình ảnh.', 400)
    }

    const mode: StudyMode = form.get('mode') === 'exam' ? 'exam' : 'learn'
    const difficulty = difficultyOf(form.get('difficulty'))
    const validated = file ? await validateUpload(file) : null

    const provider = getAIProvider()
    const processed = validated ? await processDocument(validated, provider, request.signal) : null

    const combined = [
      sourceText ? `Nội dung người học nhập:\n${sourceText}` : '',
      processed ? `Nội dung trích xuất từ tệp ${validated?.filename ?? ''}:\n${processed.text}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    if (combined.trim().length < 20) {
      throw new DocumentProcessingError('Tài liệu không có đủ nội dung để tạo câu hỏi.')
    }

    const generation = await provider.generateQuiz({
      text: combined,
      objectiveCount,
      essayCount,
      difficulty,
      contentType,
      signal: request.signal,
    })

    let quiz
    try {
      quiz = parseQuizResponse(generation.raw, {
        objectiveCount,
        essayCount,
        exactCount: !isExisting,
      })
    } catch (error) {
      if (!(error instanceof QuizValidationError)) throw error
      const repaired = await provider.generateQuiz({
        text: combined,
        objectiveCount,
        essayCount,
        difficulty,
        contentType,
        repair: { raw: generation.raw, error: error.message },
        signal: request.signal,
      })
      quiz = parseQuizResponse(repaired.raw, {
        objectiveCount,
        essayCount,
        exactCount: !isExisting,
      })
    }

    const quizId = saveQuiz(quiz, mode, combined)
    return json({
      quiz: toClientQuiz(quiz, { quizId, mode, reveal: mode === 'learn' }),
    })
  } catch (error) {
    return handleApiError(error, 'Không thể tạo bài kiểm tra lúc này. Vui lòng thử lại.')
  }
}
