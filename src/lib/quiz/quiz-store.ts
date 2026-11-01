import { randomUUID } from 'node:crypto'

import type { InternalQuiz, InternalQuizQuestion, StudyMode } from '@/types/study'

export type StoredQuiz = {
  id: string
  quiz: InternalQuiz
  /** Source text kept for regenerating individual questions. */
  sourceText: string
  mode: StudyMode
  createdAt: number
}

type Store = {
  quizzes: Map<string, StoredQuiz>
  hits: Map<string, number[]>
}

const TTL_MS = 2 * 60 * 60 * 1000
const MAX_QUIZZES = 200
const MAX_KEYS = 5000

/**
 * Route handlers can be compiled into separate bundles, so a module-level
 * `Map` is not guaranteed to be shared. Anchoring the store on `globalThis`
 * keeps every route reading the same instance.
 */
const globalRef = globalThis as unknown as { __studyaiQuizStore?: Store }
const store: Store =
  globalRef.__studyaiQuizStore ??
  (globalRef.__studyaiQuizStore = { quizzes: new Map(), hits: new Map() })

function prune(): void {
  const now = Date.now()
  for (const [id, entry] of store.quizzes) {
    if (now - entry.createdAt > TTL_MS) store.quizzes.delete(id)
  }
  if (store.quizzes.size > MAX_QUIZZES) {
    const oldest = [...store.quizzes.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)
    for (const [id] of oldest.slice(0, store.quizzes.size - MAX_QUIZZES)) {
      store.quizzes.delete(id)
    }
  }

  for (const [key, stamps] of store.hits) {
    const alive = stamps.filter((stamp) => now - stamp < TTL_MS)
    if (alive.length === 0) store.hits.delete(key)
    else store.hits.set(key, alive)
  }
  if (store.hits.size > MAX_KEYS) {
    for (const key of store.hits.keys()) {
      store.hits.delete(key)
      if (store.hits.size <= MAX_KEYS) break
    }
  }
}

export function saveQuiz(quiz: InternalQuiz, mode: StudyMode, sourceText: string): string {
  prune()
  const id = randomUUID()
  store.quizzes.set(id, { id, quiz, sourceText, mode, createdAt: Date.now() })
  return id
}

export function getStoredQuiz(id: string): StoredQuiz | null {
  prune()
  const entry = store.quizzes.get(id)
  if (!entry) return null
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.quizzes.delete(id)
    return null
  }
  return entry
}

export function replaceQuestion(
  quizId: string,
  questionId: string,
  question: InternalQuizQuestion,
): InternalQuizQuestion | null {
  const entry = store.quizzes.get(quizId)
  if (!entry) return null

  const index = entry.quiz.questions.findIndex((item) => item.id === questionId)
  if (index === -1) return null

  entry.quiz.questions[index] = question
  store.quizzes.set(quizId, { ...entry, quiz: { ...entry.quiz } })
  return question
}

/** In-memory sliding window limiter for the stateless flow. */
export function consumeLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const stamps = (store.hits.get(key) ?? []).filter((stamp) => now - stamp < windowMs)
  if (stamps.length >= limit) {
    store.hits.set(key, stamps)
    return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1000) }
  }
  stamps.push(now)
  store.hits.set(key, stamps)
  return { allowed: true, retryAfterSeconds: 0 }
}

export function clientIp(request: Request): string {
  const headers = request.headers
  const candidate = [
    headers.get('cf-connecting-ip'),
    headers.get('x-real-ip'),
    headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
  ].find((value) => value && value.length > 0)
  return candidate ?? 'unknown'
}
