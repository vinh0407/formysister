import type { Where } from 'payload'

import { handleApiError, json } from '@/lib/api/http'
import { getStudyDB } from '@/lib/database/study-payload'
import { readSessionHash, sessionContext } from '@/lib/security/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const sessionHash = await readSessionHash()
    if (!sessionHash) {
      return json({
        quizzes: [],
        pagination: { page: 1, pageSize: 10, totalDocs: 0, totalPages: 0 },
      })
    }

    const url = new URL(request.url)
    const search = (url.searchParams.get('search') ?? '').trim().slice(0, 100)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get('pageSize')) || 10))

    const where: Where[] = [{ sessionHash: { equals: sessionHash } }]
    if (search) where.push({ title: { like: search } })

    const db = await getStudyDB()
    const result = await db.find({
      collection: 'quizzes',
      where: { and: where },
      sort: '-createdAt',
      page,
      limit: pageSize,
      depth: 0,
      overrideAccess: false,
      context: sessionContext(sessionHash),
    })

    return json({
      quizzes: result.docs.map((doc) => {
        const material = doc.sourceMaterial
        return {
          id: String(doc.id),
          title: String(doc.title ?? 'Bài kiểm tra'),
          summary: doc.summary ?? null,
          difficulty: doc.difficulty ?? 'medium',
          questionCount: Number(doc.questionCount) || 0,
          essayCount: Number(doc.essayCount) || 0,
          sourceMaterialId:
            typeof material === 'string'
              ? material
              : material && typeof material === 'object' && 'id' in material
                ? String((material as { id: unknown }).id)
                : null,
          createdAt: String(doc.createdAt ?? ''),
        }
      }),
      pagination: {
        page: result.page,
        pageSize,
        totalDocs: result.totalDocs,
        totalPages: result.totalPages,
      },
    })
  } catch (error) {
    return handleApiError(error, 'Không tải được danh sách bài kiểm tra.')
  }
}
