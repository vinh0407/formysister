import { createHash, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'

import { getStudyDB } from '@/lib/database/study-payload'

export const SESSION_COOKIE = 'studyai_session'
const SESSION_DAYS = 180
const TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function sessionContext(sessionHash: string): Record<string, unknown> {
  return { sessionHash }
}

async function findSession(token: string) {
  const tokenHash = hashSessionToken(token)
  const db = await getStudyDB()
  const result = await db.findInternal(
    'study-sessions',
    { tokenHash: { equals: tokenHash } },
    { limit: 1, depth: 0 },
  )
  return { tokenHash, session: result.docs[0] ?? null }
}

/**
 * Read the anonymous study session without creating one.
 *
 * Safe in Server Components, where cookies are read-only. Returns null for a
 * first-time visitor so pages can render a real empty state.
 */
export async function readSessionHash(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null

    const { tokenHash, session } = await findSession(token)
    if (!session) return null

    const expiresAt = new Date(String(session.expiresAt))
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      const db = await getStudyDB()
      await db.deleteInternal('study-sessions', String(session.id)).catch(() => undefined)
      return null
    }

    const lastSeen = session.lastSeenAt ? new Date(String(session.lastSeenAt)).getTime() : 0
    if (Date.now() - lastSeen > TOUCH_INTERVAL_MS) {
      const db = await getStudyDB()
      await db
        .updateInternal('study-sessions', String(session.id), { lastSeenAt: new Date().toISOString() })
        .catch(() => undefined)
    }

    return tokenHash
  } catch (error) {
    console.error('Unable to read study session', error)
    return null
  }
}

/**
 * Create (or reuse) the anonymous session for an API request.
 *
 * Uses a random HttpOnly cookie and stores only its SHA-256 hash in Payload.
 * No signing secret is required because the raw token is never stored and is
 * compared by hash lookup.
 */
export async function ensureSessionHash(): Promise<string> {
  const existing = await readSessionHash()
  if (existing) return existing

  const token = randomBytes(32).toString('base64url')
  const tokenHash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  const db = await getStudyDB()
  await db.createInternal('study-sessions', {
    tokenHash,
    expiresAt: expiresAt.toISOString(),
    lastSeenAt: new Date().toISOString(),
  })

  try {
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    })
  } catch {
    // Server Components cannot set cookies. The session still exists for this
    // request; the client will receive the cookie on the next API response.
  }

  return tokenHash
}
