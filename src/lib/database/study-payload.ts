import type { Where } from 'payload'

import { StudyBackendUnavailableError } from '@/lib/api/errors'
import { getPayloadClient } from '@/lib/payload'

type PayloadFindResult<T> = {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
}

type PayloadFindArgs = {
  collection: string
  where?: Where
  limit?: number
  page?: number
  sort?: string
  depth?: number
  overrideAccess?: boolean
  context?: Record<string, unknown>
  select?: Record<string, boolean>
}

type PayloadFindByIDArgs = {
  collection: string
  id: string
  depth?: number
  overrideAccess?: boolean
  context?: Record<string, unknown>
}

type PayloadCreateArgs = {
  collection: string
  data: Record<string, unknown>
  depth?: number
  overrideAccess?: boolean
  context?: Record<string, unknown>
  file?: { data: Buffer; mimetype: string; name: string; size: number }
}

type PayloadUpdateArgs = {
  collection: string
  id: string
  data: Record<string, unknown>
  depth?: number
  overrideAccess?: boolean
  context?: Record<string, unknown>
}

type PayloadDeleteArgs = {
  collection: string
  id: string
  depth?: number
  overrideAccess?: boolean
  context?: Record<string, unknown>
}

type PayloadCountArgs = {
  collection: string
  where?: Where
  overrideAccess?: boolean
  context?: Record<string, unknown>
}

type PayloadLike = {
  find: (args: PayloadFindArgs) => Promise<PayloadFindResult<Record<string, unknown>>>
  findByID: (args: PayloadFindByIDArgs) => Promise<Record<string, unknown>>
  create: (args: PayloadCreateArgs) => Promise<Record<string, unknown>>
  update: (args: PayloadUpdateArgs) => Promise<Record<string, unknown>>
  delete: (args: PayloadDeleteArgs) => Promise<Record<string, unknown>>
  count: (args: PayloadCountArgs) => Promise<{ totalDocs: number }>
}

/**
 * Narrow, local wrapper around Payload's Local API.
 *
 * Generated `payload-types.ts` cannot be regenerated in the Make shell because
 * the platform-owned FIGMA_EID is only injected in the lifecycle environment.
 * Keeping the cast here (instead of editing generated types) lets the app use
 * the new collections without pretending generated types are up to date.
 */
export class StudyDB {
  private readonly payload: PayloadLike

  constructor(payload: PayloadLike) {
    this.payload = payload
  }

  find(args: PayloadFindArgs) {
    return this.payload.find(args)
  }

  findByID(args: PayloadFindByIDArgs) {
    return this.payload.findByID(args)
  }

  create(args: PayloadCreateArgs) {
    return this.payload.create(args)
  }

  update(args: PayloadUpdateArgs) {
    return this.payload.update(args)
  }

  delete(args: PayloadDeleteArgs) {
    return this.payload.delete(args)
  }

  count(args: PayloadCountArgs) {
    return this.payload.count(args)
  }

  findOwned(
    collection: string,
    where: Where | undefined,
    context: Record<string, unknown>,
    options: Omit<PayloadFindArgs, 'collection' | 'where' | 'context' | 'overrideAccess'> = {},
  ) {
    return this.find({
      collection,
      where,
      context,
      overrideAccess: false,
      ...options,
    })
  }

  findInternal(
    collection: string,
    where?: Where,
    options: Omit<PayloadFindArgs, 'collection' | 'where' | 'overrideAccess'> = {},
  ) {
    return this.find({
      collection,
      where,
      overrideAccess: true,
      ...options,
    })
  }

  createInternal(collection: string, data: Record<string, unknown>, file?: PayloadCreateArgs['file']) {
    return this.create({ collection, data, file, overrideAccess: true })
  }

  updateInternal(collection: string, id: string, data: Record<string, unknown>) {
    return this.update({ collection, id, data, overrideAccess: true })
  }

  deleteInternal(collection: string, id: string) {
    return this.delete({ collection, id, overrideAccess: true })
  }

  findByIDInternal(collection: string, id: string, depth = 0) {
    return this.findByID({ collection, id, depth, overrideAccess: true })
  }
}

let cached: StudyDB | null = null

export async function getStudyDB(): Promise<StudyDB> {
  if (cached) return cached
  try {
    const payload = await getPayloadClient()
    cached = new StudyDB(payload as unknown as PayloadLike)
    return cached
  } catch (error) {
    // The Payload backend is platform-provisioned. Surface it as a typed
    // error so routes can answer 503 with an actionable message instead of a
    // generic 500 that looks like an application bug.
    throw new StudyBackendUnavailableError('Payload backend did not initialise', { cause: error })
  }
}
