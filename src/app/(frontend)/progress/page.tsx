import type { Metadata } from 'next'

import { StudyStats } from '@/components/study/StudyStats'
import { Icon } from '@/components/ui/Icon'
import { loadProgressData } from '@/lib/study/server-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tiến độ học tập',
  description: 'Độ chính xác, chuỗi ngày học và hiệu suất theo từng bài kiểm tra thật.',
}

export default async function ProgressPage() {
  const stats = await loadProgressData()

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="mb-6 flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon name="chart" className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Tiến độ học tập</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Số liệu được tính từ lịch sử nộp bài của bạn. Không có dữ liệu mẫu, không có thống kê
            trang trí. Tự luận chỉ hiển thị số câu đã trả lời, không cộng vào điểm tự động.
          </p>
        </div>
      </header>
      <StudyStats stats={stats} />
    </main>
  )
}
