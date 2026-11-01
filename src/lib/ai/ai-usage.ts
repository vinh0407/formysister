import { randomUUID } from 'node:crypto'

import { AIError } from '@/lib/ai/ai-errors'
import type { AIUsageStatus } from '@/types/study'

const DEFAULT_BUDGET = 8000
const FREE_ALLOWANCE = 10_000

/**
 * Neuron usage fallback for the stateless deployment.
 *
 * The simple flow has no database, but the free-plan guard must still work.
 * The counter lives on `globalThis` so every route bundle shares one value,
 * and it resets when the process restarts.
 */
type NeuronMemory = { day: string; total: number }
const memoryRef = globalThis as unknown as { __studyaiNeurons?: NeuronMemory }

function memoryUsage(): NeuronMemory {
  const day = todayKey()
  const current = memoryRef.__studyaiNeurons
  if (!current || current.day !== day) {
    memoryRef.__studyaiNeurons = { day, total: 0 }
    return memoryRef.__studyaiNeurons
  }
  return current
}

function addMemoryNeurons(neurons: number): void {
  memoryUsage().total += neurons
}

export function textModel(): string {
  return process.env.CF_TEXT_MODEL || '@cf/qwen/qwen3.8-27b'
}

export function advancedTextModel(): string {
  return process.env.CF_TEXT_MODEL_ADVANCED || textModel()
}

export function visionModel(): string {
  return process.env.CF_VISION_MODEL || textModel()
}

export function neuronBudget(): number {
  const parsed = Number(process.env.CF_DAILY_NEURON_BUDGET)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_BUDGET
  return Math.min(Math.floor(parsed), FREE_ALLOWANCE)
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isAIConfigured(): boolean {
  return Boolean(
    process.env.KILO_API_KEY ||
      Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
  )
}

export async function getTodayNeurons(): Promise<number> {
  try {
    // Imported lazily so the stateless flow never loads the Payload config.
    const { getStudyDB } = await import('@/lib/database/study-payload')
    const db = await getStudyDB()
    const result = await db.findInternal(
      'ai-usage',
      { day: { equals: todayKey() } },
      { limit: 1000, depth: 0, sort: '-createdAt' },
    )
    return result.docs.reduce((sum, doc) => sum + (Number(doc.neurons) || 0), 0)
  } catch {
    return memoryUsage().total
  }
}

export async function getAIUsageStatus(): Promise<AIUsageStatus> {
  const budget = neuronBudget()
  const configured = isAIConfigured()
  let used = 0
  try {
    used = await getTodayNeurons()
  } catch (error) {
    console.error('Unable to read AI usage', error)
  }
  return {
    configured,
    day: todayKey(),
    neuronsUsed: Math.round(used * 100) / 100,
    neuronBudget: budget,
    remaining: Math.max(0, Math.round((budget - used) * 100) / 100),
    budgetExhausted: used >= budget,
    textModel: textModel(),
    visionModel: visionModel(),
  }
}

export async function assertNeuronBudget(): Promise<void> {
  if (!isAIConfigured()) {
    throw new AIError('AI chưa được cấu hình trên máy chủ.', {
      code: 'NOT_CONFIGURED',
      status: 503,
    })
  }

  let used: number
  try {
    used = await getTodayNeurons()
  } catch {
    throw new AIError(
      'Không đọc được hạn mức AI. Hệ thống tạm dừng gọi AI để tránh phát sinh chi phí.',
      { code: 'STORAGE', status: 503 },
    )
  }

  if (used >= neuronBudget()) {
    throw new AIError(
      'Hạn mức AI miễn phí hôm nay đã hết. Vui lòng quay lại vào ngày mai (giờ UTC).',
      { code: 'QUOTA_EXCEEDED', status: 429 },
    )
  }
}

export async function recordAIUsage(options: {
  model: string
  neurons: number
  requestId?: string
}): Promise<void> {
  const neurons = Number(options.neurons)
  if (!Number.isFinite(neurons) || neurons <= 0) return

  // Always update the in-process counter first: it is the only budget source
  // in the stateless flow, and it keeps the guard accurate even when no
  // database is available.
  addMemoryNeurons(neurons)

  try {
    const { getStudyDB } = await import('@/lib/database/study-payload')
    const db = await getStudyDB()
    await db.createInternal('ai-usage', {
      day: todayKey(),
      model: options.model.slice(0, 160),
      neurons,
      requests: 1,
      requestId: options.requestId ?? randomUUID(),
    })
  } catch {
    // Logging must never break a successful AI response. The in-memory counter
    // already recorded this request, so the budget guard stays accurate.
  }
}
