import type { Metadata } from 'next'

import { MaterialsManager } from '@/components/study/MaterialsManager'
import { Icon } from '@/components/ui/Icon'

export const metadata: Metadata = {
  title: 'Tài liệu của bạn',
  description: 'Quản lý tài liệu đã tải lên để tạo bài kiểm tra trong phiên học ẩn danh.',
}

export default function MaterialsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="mb-6 flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon name="layers" className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Tài liệu của bạn</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Tệp tải lên được lưu riêng cho phiên học này và không xuất hiện trong thư viện công
            khai. Tài liệu đã gắn với bài kiểm tra cần xoá bài kiểm tra trước.
          </p>
        </div>
      </header>
      <MaterialsManager />
    </main>
  )
}
