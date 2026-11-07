import { NextResponse } from 'next/server'

import { AIError } from '@/lib/ai/ai-errors'
import { StudyBackendUnavailableError } from '@/lib/api/errors'
import { DocumentProcessingError } from '@/lib/documents/document-processor'
import { ImageProcessingError } from '@/lib/documents/image-processor'
import { QuizValidationError } from '@/lib/quiz/quiz-validator'
import { FileValidationError } from '@/lib/security/file-validation'

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, status)
}

/**
 * Map known domain errors to safe Vietnamese responses.
 *
 * Internal details are logged but never sent to the browser, so API keys and
 * upstream diagnostics cannot leak through error messages.
 */
export function handleApiError(error: unknown, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.') {
  if (error instanceof AIError) {
    if (error.code === 'CANCELLED') return fail('Yêu cầu đã bị huỷ.', 499)
    console.error(`[AI:${error.code}]`, error.message, error.details ?? '')
    return fail(error.message, normalizeStatus(error.status))
  }
  if (
    error instanceof FileValidationError ||
    error instanceof DocumentProcessingError ||
    error instanceof ImageProcessingError
  ) {
    return fail(error.message, normalizeStatus(error.status))
  }
  if (error instanceof QuizValidationError) {
    console.error('[QuizValidation]', error.message)
    return fail('AI trả về câu hỏi chưa hợp lệ. Vui lòng thử tạo lại.', 502)
  }
  if (error instanceof StudyBackendUnavailableError) {
    console.error('[StudyBackend]', error.message, error.cause ?? '')
    return fail(
      'Hệ thống dữ liệu chưa sẵn sàng. Quản trị viên cần kết nối Payload backend cho dự án này.',
      503,
    )
  }
  if (error instanceof SyntaxError || error instanceof TypeError) {
    console.error('[API:TypeError/SyntaxError]', error)
    return fail(error.message || 'Dữ liệu gửi lên không hợp lệ.', 400)
  }
  console.error('[API]', error)
  return fail(fallback, 500)
}

function normalizeStatus(status: number): number {
  if (status === 499) return 499
  if (status >= 400 && status <= 599) return status
  return 500
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new TypeError('Expected JSON')
  }
  return request.json()
}
