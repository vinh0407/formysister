import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

function userCollection(req: PayloadRequest): string | null {
  const user = req.user as { collection?: string } | null | undefined
  return user?.collection ?? null
}

const isAdminRequest = (req: PayloadRequest) => userCollection(req) === 'admins'
const isAppUserRequest = (req: PayloadRequest) => userCollection(req) === 'users'

export const getSessionHash = (req: PayloadRequest): string | null => {
  const value = req.context?.sessionHash
  return typeof value === 'string' && value.length > 0 ? value : null
}

export const isAdmin: Access = ({ req }) => isAdminRequest(req)

export const isAdminOrSelf: Access = ({ req, id }) => {
  if (isAdminRequest(req)) return true
  if (!isAppUserRequest(req) || !req.user) return false
  return String(req.user.id) === String(id)
}

export const adminOnly: Access = ({ req }) => isAdminRequest(req)

/** Field-level equivalent of `adminOnly` for server-owned workflow fields. */
export const adminFieldOnly: FieldAccess = ({ req }) => isAdminRequest(req)

function ownedReadWhere(req: PayloadRequest): boolean | Where {
  if (isAdminRequest(req)) return true

  if (isAppUserRequest(req) && req.user) {
    const ownerWhere: Where = { owner: { equals: req.user.id } }
    return ownerWhere
  }

  const sessionHash = getSessionHash(req)
  if (sessionHash) {
    const sessionWhere: Where = { sessionHash: { equals: sessionHash } }
    return sessionWhere
  }

  return false
}

export const ownedReadAccess: Access = ({ req }) => ownedReadWhere(req)

export const ownedCreateAccess: Access = ({ req, data }) => {
  if (isAdminRequest(req)) return true

  const sessionHash = getSessionHash(req)
  if (isAppUserRequest(req) && req.user) {
    return relationshipId(data?.owner) === String(req.user.id) || !data?.owner
  }

  return Boolean(sessionHash && data?.sessionHash === sessionHash)
}

export const ownedUpdateDeleteAccess: Access = async ({ req, id, slug }) => {
  if (isAdminRequest(req)) return true
  if (!id) return false

  const sessionHash = getSessionHash(req)
  const userId = isAppUserRequest(req) && req.user ? String(req.user.id) : null
  if (!sessionHash && !userId) return false

  try {
    const doc = await req.payload.findByID({
      collection: slug as never,
      id,
      depth: 0,
      overrideAccess: true,
    })

    if (!doc || typeof doc !== 'object') return false

    if (userId && relationshipId((doc as Record<string, unknown>).owner) === userId) {
      return true
    }

    return Boolean(
      sessionHash &&
        (doc as Record<string, unknown>).sessionHash &&
        (doc as Record<string, unknown>).sessionHash === sessionHash,
    )
  } catch {
    return false
  }
}

export const adminOrOwnedRead: Access = ({ req }) => ownedReadWhere(req)

/**
 * Public quiz visibility or ownership. Answers are never protected by this
 * access rule alone; exam-mode clients receive a sanitized payload.
 */
export const publicOrOwnedRead: Access = ({ req }) => {
  if (isAdminRequest(req)) return true

  const ownership = ownedReadWhere(req)
  if (ownership === true) return true
  if (ownership === false) return false

  return { or: [{ visibility: { equals: 'public' } }, ownership] }
}

function relationshipId(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'string' || typeof id === 'number') return String(id)
  }
  return null
}
