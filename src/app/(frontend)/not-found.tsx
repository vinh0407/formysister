import Link from 'next/link'

import { Icon } from '@/components/ui/Icon'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon name="search" className="size-7" />
      </span>
      <p className="mt-5 text-xs font-bold uppercase tracking-widest text-brand-700">Lỗi 404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Không tìm thấy trang này
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
        Đường dẫn có thể đã bị xoá, đổi tên hoặc thuộc về một phiên học khác trên thiết bị này.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          <Icon name="home" className="size-4" />
          Về trang tổng quan
        </Link>
        <Link
          href="/history"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
        >
          <Icon name="history" className="size-4" />
          Xem lịch sử làm bài
        </Link>
      </div>
    </main>
  )
}
