import type { StudyStatsData } from '@/types/study'

type AttemptLike = Record<string, unknown>

const DAY_MS = 24 * 60 * 60 * 1000

export function emptyStats(): StudyStatsData {
  return {
    totalQuizzes: 0,
    totalQuestions: 0,
    totalCorrectAnswers: 0,
    accuracy: 0,
    currentStreak: 0,
    longestStreak: 0,
    weeklyActivity: lastDays(7).map((date) => ({ date, quizzes: 0, questions: 0, correct: 0 })),
    monthlyActivity: lastMonths(6).map((month) => ({
      month,
      quizzes: 0,
      questions: 0,
      correct: 0,
      accuracy: 0,
    })),
    materialPerformance: [],
  }
}

function toDateKey(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function lastDays(count: number): string[] {
  const days: string[] = []
  const now = new Date()
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    days.push(new Date(now.getTime() - offset * DAY_MS).toISOString().slice(0, 10))
  }
  return days
}

function lastMonths(count: number): string[] {
  const months: string[] = []
  const now = new Date()
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1))
    months.push(date.toISOString().slice(0, 7))
  }
  return months
}

function streakFrom(dates: Set<string>): { current: number; longest: number } {
  if (dates.size === 0) return { current: 0, longest: 0 }
  const sorted = Array.from(dates).sort()
  let longest = 1
  let run = 1
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = new Date(`${sorted[index - 1]}T00:00:00.000Z`).getTime()
    const current = new Date(`${sorted[index]}T00:00:00.000Z`).getTime()
    if (current - previous === DAY_MS) {
      run += 1
      longest = Math.max(longest, run)
    } else {
      run = 1
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10)
  let cursor: string | null = dates.has(today) ? today : dates.has(yesterday) ? yesterday : null
  let current = 0
  while (cursor && dates.has(cursor)) {
    current += 1
    cursor = new Date(new Date(`${cursor}T00:00:00.000Z`).getTime() - DAY_MS)
      .toISOString()
      .slice(0, 10)
  }
  return { current, longest }
}

export function computeStats(attempts: AttemptLike[]): StudyStatsData {
  const stats = emptyStats()
  if (attempts.length === 0) return stats

  const studyDates = new Set<string>()
  const weekly = new Map(stats.weeklyActivity.map((entry) => [entry.date, { ...entry }]))
  const monthly = new Map(stats.monthlyActivity.map((entry) => [entry.month, { ...entry }]))
  const subjects = new Map<string, { attempts: number; correct: number; objective: number }>()

  let objectiveQuestions = 0
  let essayQuestions = 0

  for (const attempt of attempts) {
    const date = toDateKey(attempt.completedAt) ?? toDateKey(attempt.createdAt)
    if (date) studyDates.add(date)

    const objective = Number(attempt.objectiveQuestionCount) || 0
    const essay = Number(attempt.essayQuestionCount) || 0
    const correct = Number(attempt.correctCount) || 0
    const questions = objective + essay

    objectiveQuestions += objective
    essayQuestions += essay

    const day = date ? weekly.get(date) : undefined
    if (day) {
      day.quizzes += 1
      day.questions += questions
      day.correct += correct
    }

    const monthKey = date?.slice(0, 7)
    const month = monthKey ? monthly.get(monthKey) : undefined
    if (month) {
      month.quizzes += 1
      month.questions += questions
      month.correct += correct
    }

    const title = String(attempt.quizTitle ?? 'Khác')
    const subject = subjects.get(title) ?? { attempts: 0, correct: 0, objective: 0 }
    subject.attempts += 1
    subject.correct += correct
    subject.objective += objective
    subjects.set(title, subject)
  }

  const totalCorrect = attempts.reduce((sum, attempt) => sum + (Number(attempt.correctCount) || 0), 0)
  const totalQuestions = objectiveQuestions + essayQuestions
  const streak = streakFrom(studyDates)

  return {
    totalQuizzes: attempts.length,
    totalQuestions,
    totalCorrectAnswers: totalCorrect,
    accuracy: objectiveQuestions > 0 ? Math.round((totalCorrect / objectiveQuestions) * 100) : 0,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    weeklyActivity: Array.from(weekly.values()),
    monthlyActivity: Array.from(monthly.values()).map((entry) => ({
      ...entry,
      accuracy: entry.questions > 0 ? Math.round((entry.correct / entry.questions) * 100) : 0,
    })),
    materialPerformance: Array.from(subjects.entries())
      .map(([title, value]) => ({
        title,
        attempts: value.attempts,
        accuracy:
          value.objective > 0 ? Math.round((value.correct / value.objective) * 100) : 0,
      }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 8),
  }
}
