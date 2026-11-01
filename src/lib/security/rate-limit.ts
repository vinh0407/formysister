import { randomUUID } from 'node:crypto'

import { getStudyDB } from '@/lib/database/study-payload'

type WindowName = 'hour' | 'day'

type Scope = {
  key: string
  window: WindowName
  limit: number
  start: Date
  retryAfterSeconds: number
}

export type RateLimitResult = {
  allowed: boolean
  unavailable?: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
  window: WindowName
}

export function getClientIp(request: Request): string {
  const headers = request.headers
  const candidates = [
    headers.get('cf-connecting-ip'),
    headers.get('x-real-ip'),
    headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
  ]
  return candidates.find((value) => value && value.length > 0) ?? 'unknown'
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

/** Effective generation limits, read once per request from the environment. */
export function rateLimitSettings(): { perHour: number; perDay: number } {
  return {
    perHour: positiveInt(process.env.RATE_LIMIT_PER_HOUR, 5),
    perDay: positiveInt(process.env.RATE_LIMIT_PER_DAY, 15),
  }
}

function buildScopes(ip: string, sessionHash: string): Scope[] {
  const { perHour, perDay } = rateLimitSettings()
  const now = Date.now()
  const hourStart = new Date(now - 60 * 60 * 1000)
  const dayStart = new Date(now - 24 * 60 * 60 * 1000)

  return [
    {
      key: `ip:${ip}`,
      window: 'hour',
      limit: perHour,
      start: hourStart,
      retryAfterSeconds: 60 * 60,
    },
    {
      key: `ip:${ip}`,
      window: 'day',
      limit: perDay,
      start: dayStart,
      retryAfterSeconds: 60 * 60,
    },
    {
      key: `session:${sessionHash}`,
      window: 'hour',
      limit: perHour,
      start: hourStart,
      retryAfterSeconds: 60 * 60,
    },
    {
      key: `session:${sessionHash}`,
      window: 'day',
      limit: perDay,
      start: dayStart,
      retryAfterSeconds: 60 * 60,
    },
  ]
}

/**
 * Persistent sliding-window rate limit.
 *
 * Each accepted request inserts one event per scope, then counts events in the
 * window (including itself). If any scope is over its limit, the just-created
 * events are removed and the request is rejected. This fails closed when
 * storage is unavailable rather than pretending a limit is active.
 */
export async function consumeRateLimit(
  ip: string,
  sessionHash: string,
): Promise<RateLimitResult> {
  const db = await getStudyDB()
  const scopes = buildScopes(ip, sessionHash)
  const createdIds: string[] = []

  try {
    for (const scope of scopes) {
      const doc = await db.createInternal('rate-limit-buckets', {
        key: scope.key,
        window: scope.window,
        nonce: randomUUID(),
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      })
      createdIds.push(String(doc.id))
    }

    let mostRestrictive: RateLimitResult = {
      allowed: true,
      limit: scopes[0].limit,
      remaining: scopes[0].limit,
      retryAfterSeconds: 0,
      window: scopes[0].window,
    }

    for (const scope of scopes) {
      const { totalDocs } = await db.count({
        collection: 'rate-limit-buckets',
        overrideAccess: true,
        where: {
          and: [
            { key: { equals: scope.key } },
            { window: { equals: scope.window } },
            { createdAt: { greater_than_equal: scope.start.toISOString() } },
          ],
        },
      })

      const remaining = Math.max(0, scope.limit - totalDocs)
      if (totalDocs > scope.limit) {
        await cleanup(createdIds)
        return {
          allowed: false,
          limit: scope.limit,
          remaining: 0,
          retryAfterSeconds: scope.retryAfterSeconds,
          window: scope.window,
        }
      }

      if (remaining < mostRestrictive.remaining) {
        mostRestrictive = {
          allowed: true,
          limit: scope.limit,
          remaining,
          retryAfterSeconds: 0,
          window: scope.window,
        }
      }
    }

    return mostRestrictive
  } catch (error) {
    console.error('Rate limit storage failed', error)
    await cleanup(createdIds)
    return {
      allowed: false,
      unavailable: true,
      limit: 0,
      remaining: 0,
      retryAfterSeconds: 60,
      window: 'hour',
    }
  }
}

async function cleanup(ids: string[]) {
  if (ids.length === 0) return
  const db = await getStudyDB()
  await Promise.all(ids.map((id) => db.deleteInternal('rate-limit-buckets', id).catch(() => undefined)))
}

export function rateLimitMessage(result: RateLimitResult): string {
  if (result.unavailable) {
    return 'Hệ thống giới hạn tạm thời không khả dụng. Vui lòng thử lại sau ít phút.'
  }
  return result.window === 'hour'
    ? 'Bạn đã đạt giới hạn tạo bài trong 1 giờ. Vui lòng thử lại sau.'
    : 'Bạn đã đạt giới hạn tạo bài trong 24 giờ. Vui lòng thử lại vào ngày mai.'
}
