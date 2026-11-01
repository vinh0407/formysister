import { getStudyDB } from '@/lib/database/study-payload'
import type { StudyStatsData } from '@/types/study'

import { computeStats, emptyStats } from './quiz-stats'

export { computeStats, emptyStats }

export async function recalculateProgress(sessionHash: string): Promise<StudyStatsData> {
  const db = await getStudyDB()
  const attempts = await db.findInternal(
    'quiz-attempts',
    { sessionHash: { equals: sessionHash } },
    { limit: 1000, depth: 0, sort: '-completedAt' },
  )
  const stats = computeStats(attempts.docs)
  const progressKey = `session:${sessionHash}`

  const existing = await db.findInternal(
    'user-progress',
    { progressKey: { equals: progressKey } },
    { limit: 1, depth: 0 },
  )

  const data: Record<string, unknown> = {
    progressKey,
    sessionHash,
    totalQuizzes: stats.totalQuizzes,
    totalQuestions: stats.totalQuestions,
    totalCorrectAnswers: stats.totalCorrectAnswers,
    accuracy: stats.accuracy,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    lastStudyDate:
      [...stats.weeklyActivity].reverse().find((entry) => entry.quizzes > 0)?.date ?? null,
    weeklyActivity: stats.weeklyActivity,
    monthlyActivity: stats.monthlyActivity,
    subjectPerformance: stats.materialPerformance,
  }

  if (existing.docs[0]) {
    await db.updateInternal('user-progress', String(existing.docs[0].id), data)
  } else {
    await db.createInternal('user-progress', data)
  }

  return stats
}

export async function readProgress(sessionHash: string | null): Promise<StudyStatsData> {
  if (!sessionHash) return emptyStats()

  try {
    const db = await getStudyDB()
    const result = await db.findInternal(
      'user-progress',
      { progressKey: { equals: `session:${sessionHash}` } },
      { limit: 1, depth: 0 },
    )
    const doc = result.docs[0]
    if (!doc) return emptyStats()

    return {
      totalQuizzes: Number(doc.totalQuizzes) || 0,
      totalQuestions: Number(doc.totalQuestions) || 0,
      totalCorrectAnswers: Number(doc.totalCorrectAnswers) || 0,
      accuracy: Number(doc.accuracy) || 0,
      currentStreak: Number(doc.currentStreak) || 0,
      longestStreak: Number(doc.longestStreak) || 0,
      weeklyActivity: Array.isArray(doc.weeklyActivity)
        ? doc.weeklyActivity.map((entry) => {
            const item = entry as Record<string, unknown>
            return {
              date: String(item.date ?? ''),
              quizzes: Number(item.quizzes) || 0,
              questions: Number(item.questions) || 0,
              correct: Number(item.correct) || 0,
            }
          })
        : [],
      monthlyActivity: Array.isArray(doc.monthlyActivity)
        ? doc.monthlyActivity.map((entry) => {
            const item = entry as Record<string, unknown>
            return {
              month: String(item.month ?? ''),
              quizzes: Number(item.quizzes) || 0,
              questions: Number(item.questions) || 0,
              correct: Number(item.correct) || 0,
              accuracy: Number(item.accuracy) || 0,
            }
          })
        : [],
      materialPerformance: Array.isArray(doc.subjectPerformance)
        ? doc.subjectPerformance.map((entry) => {
            const item = entry as Record<string, unknown>
            return {
              title: String(item.title ?? 'Khác'),
              attempts: Number(item.attempts) || 0,
              accuracy: Number(item.accuracy) || 0,
            }
          })
        : [],
    }
  } catch (error) {
    console.error('Unable to read progress', error)
    return emptyStats()
  }
}
