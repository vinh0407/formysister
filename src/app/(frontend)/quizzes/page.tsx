import type { Metadata } from 'next'

import { QuizzesManager } from '@/components/study/QuizzesManager'
import { Icon } from '@/components/ui/Icon'

export const metadata: Metadata = {
  title: 'Bài kiểm tra của bạn',
  description: 'Học lại hoặc thi lại các bài kiểm tra đã tạo từ tài liệu của bạn.',
}

export default function QuizzesPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="mb-6 flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon name="book" className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Bài kiểm tra của bạn
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Chọn chế độ học để xem đáp án ngay, hoặc chế độ thi để đáp án chỉ hiện sau khi nộp. Bài
            đã có lịch sử làm bài không thể xoá cho tới khi xoá các lượt làm bài.
          </p>
        </div>
      </header>
      <QuizzesManager />
    </main>
  )
}
