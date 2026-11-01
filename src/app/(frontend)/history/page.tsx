import type { Metadata } from 'next'

import { QuizHistory } from '@/components/study/QuizHistory'
import { Icon } from '@/components/ui/Icon'

export const metadata: Metadata = {
  title: 'Lịch sử làm bài',
  description: 'Xem lại điểm, câu trả lời và giải thích của từng lượt làm bài thật.',
}

export default function HistoryPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="mb-6 flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon name="history" className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Lịch sử làm bài</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Mọi lượt nộp bài được lưu theo phiên ẩn danh trên thiết bị này. Chỉ số liệu thật từ các
            lần bạn đã nộp mới xuất hiện ở đây.
          </p>
        </div>
      </header>
      <QuizHistory />
    </main>
  )
}
