'use client'

import { useMemo } from 'react'

import type { ClientQuiz, GradedResult } from '@/types/study'

export function useQuizProgress(
  quiz: ClientQuiz,
  answers: Record<string, string>,
  result: GradedResult | null,
) {
  return useMemo(() => {
    let objectiveTotal = 0
    let essayTotal = 0
    let objectiveAnswered = 0
    let essayAnswered = 0
    let liveCorrect = 0

    for (const question of quiz.questions) {
      const answered = Boolean((answers[question.id] ?? '').trim())
      if (question.type === 'multiple-choice') {
        objectiveTotal += 1
        if (answered) objectiveAnswered += 1
        if (answered && question.answer && answers[question.id] === question.answer) {
          liveCorrect += 1
        }
      } else {
        essayTotal += 1
        if (answered) essayAnswered += 1
      }
    }

    const total = objectiveTotal + essayTotal
    const answered = objectiveAnswered + essayAnswered
    const liveScore =
      result?.objectiveScore ??
      (objectiveTotal > 0 ? Math.round((liveCorrect / objectiveTotal) * 100) : 0)

    return {
      total,
      answered,
      unanswered: Math.max(0, total - answered),
      objectiveTotal,
      essayTotal,
      objectiveAnswered,
      essayAnswered,
      liveScore,
      liveCorrect,
      percent: total > 0 ? Math.round((answered / total) * 100) : 0,
    }
  }, [answers, quiz.questions, result])
}
