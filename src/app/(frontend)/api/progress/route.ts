import { handleApiError, json } from '@/lib/api/http'
import { readProgress, recalculateProgress } from '@/lib/quiz/quiz-progress'
import { readSessionHash } from '@/lib/security/session'
import { emptyStats } from '@/lib/quiz/quiz-progress'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sessionHash = await readSessionHash()
    if (!sessionHash) return json({ progress: emptyStats() })
    return json({ progress: await readProgress(sessionHash) })
  } catch (error) {
    return handleApiError(error, 'Không tải được tiến độ học tập.')
  }
}

export async function POST() {
  try {
    const sessionHash = await readSessionHash()
    if (!sessionHash) return json({ progress: emptyStats() })
    return json({ progress: await recalculateProgress(sessionHash) })
  } catch (error) {
    return handleApiError(error, 'Không cập nhật được tiến độ học tập.')
  }
}
