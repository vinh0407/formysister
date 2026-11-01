'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { ClientQuiz, StudyMode } from '@/types/study'

export type GenerationStage = 'idle' | 'uploading' | 'reading' | 'generating' | 'finalizing'

export type GenerationPayload = {
  file: File | null
  sourceText: string
  questionCount: number
  essayCount: number
  mode: StudyMode
  difficulty?: 'easy' | 'medium' | 'hard'
  contentType?: 'lesson' | 'existing-questions'
  provider?: string
  turnstileToken?: string | null
}

type ApiError = Error & { code?: string; status?: number; retryAfterSeconds?: number }

const stageLabels: Record<GenerationStage, string> = {
  idle: '',
  uploading: 'Đang tải tài liệu lên máy chủ…',
  reading: 'Đang đọc và làm sạch nội dung…',
  generating: 'AI đang soạn câu hỏi cho bạn…',
  finalizing: 'Đang kiểm tra và lưu bài kiểm tra…',
}

export function useQuizGeneration() {
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState<GenerationStage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [quota, setQuota] = useState<{ retryAfterSeconds?: number; code?: string } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastPayloadRef = useRef<GenerationPayload | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current = []
  }, [])

  useEffect(() => {
    return () => {
      clearTimers()
      abortRef.current?.abort()
    }
  }, [clearTimers])

  const generate = useCallback(
    async (payload: GenerationPayload): Promise<ClientQuiz | null> => {
      abortRef.current?.abort()
      clearTimers()
      const controller = new AbortController()
      abortRef.current = controller
      lastPayloadRef.current = payload

      setLoading(true)
      setError(null)
      setQuota(null)
      setStage('uploading')

      timersRef.current = [
        setTimeout(() => setStage('reading'), 700),
        setTimeout(() => setStage('generating'), 2400),
        setTimeout(() => setStage('finalizing'), 9000),
      ]

      try {
        const body = new FormData()
        if (payload.file) body.append('file', payload.file)
        if (payload.sourceText.trim()) body.append('sourceText', payload.sourceText.trim())
        body.append('questionCount', String(payload.questionCount))
        body.append('essayCount', String(payload.essayCount))
        body.append('mode', payload.mode)
        body.append('difficulty', payload.difficulty ?? 'medium')
        if (payload.contentType) body.append('contentType', payload.contentType)
        if (payload.provider) body.append('provider', payload.provider)
        if (payload.turnstileToken) body.append('turnstileToken', payload.turnstileToken)

        const response = await fetch('/api/quiz/generate', {
          method: 'POST',
          body,
          signal: controller.signal,
        })
        const result = (await response.json().catch(() => null)) as
          | { quiz?: ClientQuiz; error?: string; code?: string; retryAfterSeconds?: number }
          | null

        if (!response.ok || !result?.quiz) {
          const failure = new Error(result?.error ?? 'Không thể tạo bài kiểm tra lúc này.') as ApiError
          failure.code = result?.code
          failure.status = response.status
          failure.retryAfterSeconds = result?.retryAfterSeconds
          throw failure
        }

        return result.quiz
      } catch (cause) {
        if (controller.signal.aborted) {
          setError('Bạn đã huỷ yêu cầu tạo bài. Nội dung đã nhập vẫn được giữ lại.')
          return null
        }
        const failure = cause as ApiError
        if (failure.status === 429) {
          setQuota({ retryAfterSeconds: failure.retryAfterSeconds, code: failure.code })
        }
        setError(
          failure.message ||
            'Không thể tạo bài kiểm tra lúc này. Vui lòng kiểm tra kết nối và thử lại.',
        )
        return null
      } finally {
        clearTimers()
        if (abortRef.current === controller) abortRef.current = null
        setStage('idle')
        setLoading(false)
      }
    },
    [clearTimers],
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const retry = useCallback(async () => {
    if (!lastPayloadRef.current) return null
    return generate(lastPayloadRef.current)
  }, [generate])

  const clearError = useCallback(() => {
    setError(null)
    setQuota(null)
  }, [])

  return {
    loading,
    stage,
    stageLabel: stageLabels[stage],
    error,
    quota,
    generate,
    retry,
    cancel,
    clearError,
  }
}
