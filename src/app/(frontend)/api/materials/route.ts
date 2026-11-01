import type { Where } from 'payload'

import { fail, handleApiError, json } from '@/lib/api/http'
import { getStudyDB } from '@/lib/database/study-payload'
import { readSessionHash, sessionContext } from '@/lib/security/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const sessionHash = await readSessionHash()
    if (!sessionHash) {
      return json({
        materials: [],
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
      collection: 'study-materials',
      where: { and: where },
      sort: '-createdAt',
      page,
      limit: pageSize,
      depth: 0,
      overrideAccess: false,
      context: sessionContext(sessionHash),
    })

    return json({
      materials: result.docs.map((doc) => ({
        id: String(doc.id),
        title: String(doc.title ?? 'Tài liệu'),
        description: doc.description ?? null,
        originalFilename: doc.originalFilename ?? null,
        sourceType: doc.sourceType ?? 'text',
        mimeType: doc.mimeType ?? null,
        fileSize: Number(doc.fileSize) || 0,
        processingStatus: doc.processingStatus ?? 'ready',
        pageCount: doc.pageCount == null ? null : Number(doc.pageCount),
        hasFile: Boolean(doc.file),
        createdAt: String(doc.createdAt ?? ''),
      })),
      pagination: {
        page: result.page,
        pageSize,
        totalDocs: result.totalDocs,
        totalPages: result.totalPages,
      },
    })
  } catch (error) {
    return handleApiError(error, 'Không tải được danh sách tài liệu.')
  }
}

export async function DELETE(request: Request) {
  try {
    const sessionHash = await readSessionHash()
    if (!sessionHash) return fail('Phiên học không hợp lệ.', 401)

    const url = new URL(request.url)
    const id = (url.searchParams.get('id') ?? '').trim()
    if (!id) return fail('Thiếu mã tài liệu.', 400)

    const db = await getStudyDB()
    const context = sessionContext(sessionHash)
    const material = await db
      .findByID({
        collection: 'study-materials',
        id,
        depth: 1,
        overrideAccess: false,
        context,
      })
      .catch(() => null)

    if (!material) return fail('Không tìm thấy tài liệu.', 404)

    const quizzes = await db.count({
      collection: 'quizzes',
      where: { sourceMaterial: { equals: id } },
      overrideAccess: true,
    })
    if (quizzes.totalDocs > 0) {
      return fail(
        'Tài liệu đã được dùng để tạo bài kiểm tra. Hãy xoá bài kiểm tra liên quan trước.',
        409,
      )
    }

    const file = material.file
    const fileId =
      typeof file === 'string'
        ? file
        : file && typeof file === 'object' && 'id' in file
          ? String((file as { id: unknown }).id)
          : null

    await db.delete({
      collection: 'study-materials',
      id,
      overrideAccess: false,
      context,
    })

    if (fileId) {
      await db.deleteInternal('study-files', fileId).catch((error) => {
        console.error('Unable to delete study file', error)
      })
    }

    return json({ ok: true })
  } catch (error) {
    return handleApiError(error, 'Không xoá được tài liệu.')
  }
}
