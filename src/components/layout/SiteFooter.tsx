import Link from 'next/link'

import { Icon } from '@/components/ui/Icon'

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-8 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Icon name="spark" className="size-4" />
            </span>
            <span className="font-bold tracking-tight text-ink">StudyAI</span>
          </div>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
            Trợ lý ôn tập tiếng Việt giúp biến tài liệu của bạn thành bài kiểm tra, giải thích lỗi
            sai và theo dõi tiến độ thật.
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            AI có thể mắc lỗi. Hãy kiểm chứng thông tin quan trọng với giáo viên hoặc tài liệu gốc.
          </p>
        </div>

        <nav aria-label="Liên kết học tập">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Học tập</p>
          <ul className="mt-3 grid gap-2 text-sm">
            <li>
              <Link className="text-slate-700 hover:text-brand-700" href="/">
                Tạo bài tập
              </Link>
            </li>
            <li>
              <Link className="text-slate-700 hover:text-brand-700" href="/settings">
                Cài đặt &amp; hạn mức AI
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Quyền riêng tư</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Bài làm được gắn với một cookie phiên ẩn danh trên thiết bị này. Không có tên, email
            hay tài khoản công khai.
          </p>
          <Link
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
            href="/settings"
          >
            Xem cài đặt và hạn mức
            <Icon name="arrowRight" className="size-4" />
          </Link>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} StudyAI · Chạy trên Cloudflare Workers AI miễn phí
      </div>
    </footer>
  )
}
