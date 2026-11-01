import { fail, handleApiError, json } from '@/lib/api/http'
import { getStudyDB } from '@/lib/database/study-payload'
import { fromQuizDoc, toClientQuiz } from '@/lib/quiz/quiz-engine'
import { readSessionHash, sessionContext } from '@/lib/security/session'
import type { QuizDoc, StudyMode } from '@/types/study'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const sessionHash = await readSessionHash()
    const mode: StudyMode =
      new URL(request.url).searchParams.get('mode') === 'learn' ? 'learn' : 'exam'

    const db = await getStudyDB()
    const quizRecord = await db
      .findByID({
        collection: 'quizzes',
        id,
        depth: 0,
        overrideAccess: false,
        context: sessionHash ? sessionContext(sessionHash) : {},
      })
      .catch(() => null)

    if (!quizRecord) return fail('Không tìm thấy bài kiểm tra.', 404)

    const owned = Boolean(sessionHash && quizRecord.sessionHash === sessionHash)
    const effectiveMode: StudyMode = owned ? mode : 'exam'
    const reveal = owned && effectiveMode === 'learn'

    const quiz = fromQuizDoc(quizRecord as unknown as QuizDoc)
    const sourceMaterial = quizRecord.sourceMaterial

    return json({
      quiz: toClientQuiz(quiz, {
        quizId: id,
        mode: effectiveMode,
        reveal,
        sourceMaterialId:
          typeof sourceMaterial === 'string'
            ? sourceMaterial
            : sourceMaterial && typeof sourceMaterial === 'object' && 'id' in sourceMaterial
              ? String((sourceMaterial as { id: unknown }).id)
              : undefined,
      }),
      owned,
    })
  } catch (error) {
    return handleApiError(error, 'Không tải được bài kiểm tra.')
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const sessionHash = await readSessionHash()
    if (!sessionHash) return fail('Phiên học không hợp lệ.', 401)

    const { id } = await params
    const db = await getStudyDB()
    const context = sessionContext(sessionHash)
    const quiz = await db
      .findByID({
        collection: 'quizzes',
        id,
        depth: 0,
        overrideAccess: false,
        context,
      })
      .catch(() => null)

    if (!quiz) return fail('Không tìm thấy bài kiểm tra.', 404)

    const attempts = await db.count({
      collection: 'quiz-attempts',
      where: { quiz: { equals: id } },
      overrideAccess: true,
    })
    if (attempts.totalDocs > 0) {
      return fail(
        'Bài kiểm tra đã có lịch sử làm bài. Hãy xoá các lượt làm bài trong mục Lịch sử trước.',
        409,
      )
    }

    await db.delete({ collection: 'quizzes', id, overrideAccess: false, context })
    return json({ ok: true })
  } catch (error) {
    return handleApiError(error, 'Không xoá được bài kiểm tra.')
  }
}
