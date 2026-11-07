import { getAIProvider } from '@/lib/ai/ai-provider'
import { isAIConfigured } from '@/lib/ai/ai-usage'
import { fail, handleApiError, json } from '@/lib/api/http'
import { getStudyDB } from '@/lib/database/study-payload'
import { DocumentProcessingError, processDocument } from '@/lib/documents/document-processor'
import { toClientQuiz, toPayloadQuestions } from '@/lib/quiz/quiz-engine'
import { parseQuizResponse, QuizValidationError } from '@/lib/quiz/quiz-validator'
import {
  maxDocumentBytes,
  maxImageBytes,
  validateSourceText,
  validateUpload,
} from '@/lib/security/file-validation'
import { consumeRateLimit, getClientIp, rateLimitMessage } from '@/lib/security/rate-limit'
import { ensureSessionHash, sessionContext } from '@/lib/security/session'
import { verifyTurnstile } from '@/lib/security/turnstile'
import type { QuestionDifficulty, StudyMode } from '@/types/study'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

function difficultyOf(value: unknown): QuestionDifficulty {
  return value === 'easy' || value === 'hard' ? value : 'medium'
}

function initialTitle(filename: string | null, text: string): string {
  if (filename) {
    const withoutExtension = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
    if (withoutExtension) return withoutExtension.slice(0, 120)
  }
  const firstLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0)
  return (firstLine ?? 'Tài liệu học tập').slice(0, 120)
}

function isUploadFile(value: unknown): value is File {
  return (
    value instanceof File ||
    (typeof value === 'object' &&
      value !== null &&
      'arrayBuffer' in value &&
      typeof (value as Blob).arrayBuffer === 'function' &&
      'size' in value &&
      typeof (value as Blob).size === 'number' &&
      (value as Blob).size > 0)
  )
}

export async function POST(request: Request) {
  let materialId: string | null = null

  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0)
    if (contentLength > maxDocumentBytes() + maxImageBytes()) {
      return fail('Tệp tải lên quá lớn.', 413)
    }

    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      return fail('Yêu cầu không hợp lệ. Hãy gửi nội dung hoặc tệp.', 400)
    }

    if (!isAIConfigured()) {
      return fail(
        'AI chưa được cấu hình trên máy chủ. Quản trị viên cần thêm CLOUDFLARE_ACCOUNT_ID và CLOUDFLARE_API_TOKEN.',
        503,
      )
    }

    const sessionHash = await ensureSessionHash()
    const ip = getClientIp(request)
    const form = await request.formData()

    const turnstile = await verifyTurnstile(
      typeof form.get('turnstileToken') === 'string'
        ? String(form.get('turnstileToken'))
        : null,
      ip,
    )
    if (!turnstile.ok) return fail(turnstile.message ?? 'Xác minh bảo mật thất bại.', 403)

    const rate = await consumeRateLimit(ip, sessionHash)
    if (!rate.allowed) {
      return json(
        {
          error: rateLimitMessage(rate),
          retryAfterSeconds: rate.retryAfterSeconds,
          limit: rate.limit,
          window: rate.window,
          code: rate.unavailable ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMITED',
        },
        429,
      )
    }

    const sourceText = validateSourceText(
      typeof form.get('sourceText') === 'string' ? String(form.get('sourceText')) : '',
    )
    const inputContentType: 'lesson' | 'existing-questions' =
      form.get('contentType') === 'existing-questions' ? 'existing-questions' : 'lesson'
    const isExisting = inputContentType === 'existing-questions'
    const objectiveCount = isExisting ? 0 : clampInt(form.get('questionCount'), 1, 50, 10)
    const essayCount = isExisting ? 0 : clampInt(form.get('essayCount'), 0, 10, 2)
    if (!isExisting && objectiveCount + essayCount > 60) {
      return fail('Tổng số câu hỏi không được vượt quá 60.', 400)
    }

    const rawFile = form.get('file')
    const file = isUploadFile(rawFile) ? (rawFile as File) : null
    if (!file && !sourceText) {
      return fail('Hãy nhập nội dung bài học hoặc đính kèm một tài liệu, hình ảnh.', 400)
    }

    const mode: StudyMode = form.get('mode') === 'exam' ? 'exam' : 'learn'
    const difficulty = difficultyOf(form.get('difficulty'))
    const validated = file ? await validateUpload(file) : null

    const db = await getStudyDB()
    const context = sessionContext(sessionHash)
    let fileId: string | null = null

    if (validated) {
      const fileDoc = await db.create({
        collection: 'study-files',
        data: { sessionHash },
        file: {
          data: validated.buffer,
          mimetype: validated.mimeType,
          name: validated.filename,
          size: validated.size,
        },
        overrideAccess: false,
        context,
      })
      fileId = String(fileDoc.id)
    }

    const title = initialTitle(validated?.filename ?? null, sourceText)
    const materialDoc = await db.create({
      collection: 'study-materials',
      data: {
        title,
        description: 'Tài liệu dùng để tạo bài kiểm tra.',
        originalFilename: validated?.filename ?? null,
        file: fileId,
        extractedText: sourceText,
        mimeType: validated?.mimeType ?? 'text/plain',
        fileSize: validated?.size ?? Buffer.byteLength(sourceText, 'utf8'),
        sourceType: validated?.category ?? 'text',
        processingStatus: 'pending',
        sessionHash,
      },
      overrideAccess: false,
      context,
    })
    materialId = String(materialDoc.id)

    const provider = getAIProvider(
      typeof form.get('provider') === 'string' ? String(form.get('provider')) : undefined,
    )
    const processed = validated
      ? await processDocument(validated, provider, request.signal)
      : null

    const combined = [
      sourceText ? `Nội dung người học nhập:\n${sourceText}` : '',
      processed ? `Nội dung trích xuất từ tệp ${validated?.filename ?? ''}:\n${processed.text}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    if (combined.trim().length < 20) {
      throw new DocumentProcessingError('Tài liệu không có đủ nội dung để tạo câu hỏi.')
    }

    await db.updateInternal('study-materials', materialId, {
      extractedText: combined,
      processingStatus: 'ready',
      pageCount: processed?.pageCount ?? null,
      errorMessage: null,
    })

    const generation = await provider.generateQuiz({
      text: combined,
      objectiveCount,
      essayCount,
      difficulty,
      contentType: inputContentType,
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
        contentType: inputContentType,
        repair: { raw: generation.raw, error: error.message },
        signal: request.signal,
      })
      quiz = parseQuizResponse(repaired.raw, {
        objectiveCount,
        essayCount,
        exactCount: !isExisting,
      })
    }

    const quizDoc = await db.create({
      collection: 'quizzes',
      data: {
        title: quiz.title,
        summary: quiz.summary,
        sourceMaterial: materialId,
        questions: toPayloadQuestions(quiz),
        difficulty: quiz.difficulty,
        questionCount: quiz.questions.filter((question) => question.type === 'multiple-choice').length,
        essayCount: quiz.questions.filter((question) => question.type === 'essay').length,
        model: generation.model,
        visibility: 'private',
        sessionHash,
      },
      overrideAccess: false,
      context,
    })

    const quizId = String(quizDoc.id)
    await db.updateInternal('study-materials', materialId, {
      title: quiz.title.slice(0, 200),
      description: quiz.summary.slice(0, 1000),
    })

    const clientQuiz = toClientQuiz(quiz, {
      quizId,
      mode,
      reveal: mode === 'learn',
      sourceMaterialId: materialId,
    })

    return json({
      quiz: clientQuiz,
      materialId,
      quizId,
      usage: {
        model: generation.model,
        mode,
      },
      source: {
        type: validated?.category ?? 'text',
        pageCount: processed?.pageCount ?? null,
        usedOcr: processed?.usedOcr ?? false,
      },
    })
  } catch (error) {
    if (materialId) {
      try {
        const db = await getStudyDB()
        await db.updateInternal('study-materials', materialId, {
          processingStatus: 'failed',
          errorMessage:
            error instanceof Error ? error.message.slice(0, 500) : 'Không xử lý được tài liệu.',
        })
      } catch {
        // Best-effort status update only.
      }
    }
    return handleApiError(error, 'Không thể tạo bài kiểm tra lúc này. Vui lòng thử lại.')
  }
}
