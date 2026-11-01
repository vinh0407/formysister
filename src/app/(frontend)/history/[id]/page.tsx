import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AttemptDetail } from '@/components/study/AttemptDetail'
import { loadAttemptReview } from '@/lib/study/server-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Chi tiết lượt làm bài',
  description: 'Xem lại câu trả lời, đáp án đúng và giải thích của lượt làm bài.',
}

export default async function AttemptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const review = await loadAttemptReview(id)
  if (!review) notFound()

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <AttemptDetail review={review} />
    </main>
  )
}
