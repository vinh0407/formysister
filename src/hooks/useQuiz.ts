'use client'

import { useCallback, useMemo, useState } from 'react'

import type { ClientQuiz, GradedResult } from '@/types/study'

function newAttemptKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useQuiz(
  initialQuiz: ClientQuiz,
  options: { onSubmitted?: (result: GradedResult) => void } = {},
) {
  const [quiz, setQuiz] = useState<ClientQuiz>(initialQuiz)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<GradedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [attemptKey, setAttemptKey] = useState(newAttemptKey)
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString())

  const locked = submitted || submitting

  const selectAnswer = useCallback(
    (questionId: string, answer: string) => {
      if (locked) return
      const question = quiz.questions.find((item) => item.id === questionId)
      if (!question) return
      const isRevealed = Boolean(revealed[questionId])
      if (quiz.mode === 'learn' && isRevealed) return

      setAnswers((current) => ({ ...current, [questionId]: answer }))
      // Objective questions reveal immediately in learn mode. Essay questions
      // require an explicit "Xem đáp án" action so typing does not lock the box.
      if (quiz.mode === 'learn' && question.type === 'multiple-choice') {
        setRevealed((current) => ({ ...current, [questionId]: true }))
      }
    },
    [locked, quiz.mode, quiz.questions, revealed],
  )

  const revealEssay = useCallback(
    (questionId: string) => {
      if (quiz.mode !== 'learn' || submitted) return
      setRevealed((current) => ({ ...current, [questionId]: true }))
    },
    [quiz.mode, submitted],
  )

  const submit = useCallback(async () => {
    if (!quiz.quizId || submitted || submitting) return null
    setSubmitting(true)
    setError(null)
    try {
      const durationSeconds = Math.max(
        0,
        Math.round((Date.now() - new Date(startedAt).getTime()) / 1000),
      )
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quiz.quizId,
          answers,
          durationSeconds,
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { result?: GradedResult; error?: string }
        | null
      if (!response.ok || !payload?.result) {
        throw new Error(payload?.error ?? 'Không thể nộp bài lúc này.')
      }

      setResult(payload.result)
      setSubmitted(true)
      setRevealed(
        Object.fromEntries(quiz.questions.map((question) => [question.id, true])) as Record<
          string,
          boolean
        >,
      )
      options.onSubmitted?.(payload.result)
      return payload.result
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể nộp bài lúc này.')
      return null
    } finally {
      setSubmitting(false)
    }
  }, [answers, options, quiz.questions, quiz.quizId, startedAt, submitted, submitting])

  const restart = useCallback(() => {
    if (submitting) return
    setAnswers({})
    setRevealed({})
    setSubmitted(false)
    setResult(null)
    setError(null)
    setRegeneratingId(null)
    setAttemptKey(newAttemptKey())
    setStartedAt(new Date().toISOString())
  }, [submitting])

  const regenerateQuestion = useCallback(
    async (questionId: string) => {
      if (!quiz.quizId || regeneratingId || submitted) return
      setRegeneratingId(questionId)
      setError(null)
      try {
        const response = await fetch('/api/quiz/regenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId: quiz.quizId, questionId, mode: quiz.mode }),
        })
        const payload = (await response.json().catch(() => null)) as
          | {
              question?: ClientQuiz['questions'][number]
              error?: string
            }
          | null
        if (!response.ok || !payload?.question) {
          throw new Error(payload?.error ?? 'Không thể tạo lại câu hỏi.')
        }
        setQuiz((current) => ({
          ...current,
          questions: current.questions.map((question) =>
            question.id === questionId ? payload.question! : question,
          ),
        }))
        setAnswers((current) => {
          const next = { ...current }
          delete next[questionId]
          return next
        })
        setRevealed((current) => {
          const next = { ...current }
          delete next[questionId]
          return next
        })
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Không thể tạo lại câu hỏi.')
      } finally {
        setRegeneratingId(null)
      }
    },
    [quiz.mode, quiz.quizId, regeneratingId, submitted],
  )

  const revealFor = useCallback(
    (questionId: string) => {
      if (result) {
        const graded = result.questions.find((question) => question.questionId === questionId)
        if (graded) {
          return {
            answer: graded.correctAnswer,
            explanation: graded.explanation,
            isCorrect: graded.isCorrect,
          }
        }
      }
      if (quiz.mode === 'learn' && revealed[questionId]) {
        const question = quiz.questions.find((item) => item.id === questionId)
        return {
          answer: question?.answer,
          explanation: question?.explanation,
          isCorrect:
            question?.type === 'multiple-choice'
              ? answers[questionId] === question.answer
              : null,
        }
      }
      return null
    },
    [answers, quiz.mode, quiz.questions, result, revealed],
  )

  const grouped = useMemo(
    () => ({
      objective: quiz.questions.filter((question) => question.type === 'multiple-choice'),
      essay: quiz.questions.filter((question) => question.type === 'essay'),
    }),
    [quiz.questions],
  )

  return {
    quiz,
    answers,
    submitted,
    submitting,
    result,
    error,
    regeneratingId,
    startedAt,
    locked,
    selectAnswer,
    revealEssay,
    submit,
    restart,
    regenerateQuestion,
    revealFor,
    grouped,
    setError,
  }
}
