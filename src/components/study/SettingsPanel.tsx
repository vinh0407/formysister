'use client'

import { useState } from 'react'

import Link from 'next/link'

import { Icon } from '@/components/ui/Icon'
import { formatNumber } from '@/lib/format'
import type { AIUsageStatus } from '@/types/study'

type HealthPayload = {
  ok?: boolean
  configured?: boolean
  message?: string
  modelCount?: number
  usage?: AIUsageStatus
  turnstileConfigured?: boolean
}

export function SettingsPanel({
  usage: initialUsage,
  turnstileConfigured,
  rateLimits,
  fileLimits,
  hasSession,
}: {
  usage: AIUsageStatus
  turnstileConfigured: boolean
  rateLimits: { perHour: number; perDay: number }
  fileLimits: { image: number; document: number; text: number }
  hasSession: boolean
}) {
  const [usage, setUsage] = useState(initialUsage)
  const [health, setHealth] = useState<HealthPayload | null>(null)
  const [checking, setChecking] = useState(false)

  const percent = Math.min(100, Math.round((usage.neuronsUsed / usage.neuronBudget) * 100))
  const quotaTone =
    percent >= 100 ? 'bg-rose-500' : percent >= 80 ? 'bg-amber-500' : 'bg-brand-500'

  const checkHealth = async () => {
    setChecking(true)
    try {
      const response = await fetch('/api/ai/health', { cache: 'no-store' })
      const payload = (await response.json().catch(() => null)) as HealthPayload | null
      setHealth(payload ?? { ok: false, message: 'Không đọc được phản hồi từ máy chủ.' })
      if (payload?.usage) setUsage(payload.usage)
    } catch {
      setHealth({ ok: false, message: 'Không kết nối được máy chủ để kiểm tra AI.' })
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-700">AI miễn phí</p>
            <h2 className="mt-2 text-lg font-bold tracking-tight text-ink">Cloudflare Workers AI</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Hệ thống chỉ gọi mô hình miễn phí và tự dừng khi chạm ngân sách neuron trong ngày.
              Không có phương án trả phí dự phòng.
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${
              usage.configured
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-rose-50 text-rose-700 ring-rose-200'
            }`}
          >
            {usage.configured ? 'Đã cấu hình' : 'Chưa cấu hình'}
          </span>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-800">Hạn mức neuron hôm nay</p>
            <p className="text-sm font-bold text-brand-700">
              {formatNumber(usage.neuronsUsed)} / {formatNumber(usage.neuronBudget)}
            </p>
          </div>
          <div
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-label="Hạn mức neuron đã dùng"
            aria-valuemin={0}
            aria-valuemax={usage.neuronBudget}
            aria-valuenow={Math.min(usage.neuronsUsed, usage.neuronBudget)}
          >
            <div className={`h-full rounded-full ${quotaTone}`} style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            Còn lại {formatNumber(usage.remaining)} neuron cho ngày {usage.day} (UTC).{' '}
            {usage.budgetExhausted
              ? 'Hạn mức đã hết; hệ thống trả lỗi rõ ràng thay vì chuyển sang dịch vụ trả phí.'
              : 'Mỗi yêu cầu đều được kiểm tra trước khi gọi AI.'}
          </p>
        </div>

        <dl className="mt-4 grid gap-3 text-sm">
          <div className="rounded-xl border border-slate-100 p-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-600">Mô hình văn bản</dt>
            <dd className="mt-1 break-all font-mono text-xs text-slate-800">{usage.textModel}</dd>
          </div>
          <div className="rounded-xl border border-slate-100 p-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-600">Mô hình thị giác</dt>
            <dd className="mt-1 break-all font-mono text-xs text-slate-800">{usage.visionModel}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void checkHealth()}
            disabled={checking}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-60"
          >
            <Icon name={checking ? 'spinner' : 'refresh'} className={checking ? 'size-4 animate-spin' : 'size-4'} />
            {checking ? 'Đang kiểm tra…' : 'Kiểm tra kết nối AI'}
          </button>
          <span className="text-xs text-slate-500">Không gửi nội dung học tập khi kiểm tra.</span>
        </div>

        <div aria-live="polite" className="mt-3">
          {health ? (
            <p
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                health.ok
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-rose-50 text-rose-800'
              }`}
            >
              {health.message}
              {health.ok && health.modelCount ? ` Danh mục có ${health.modelCount} mô hình.` : ''}
            </p>
          ) : null}
        </div>
      </section>

      <div className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold tracking-tight text-ink">Quyền riêng tư và bảo vệ</h2>
          <ul className="mt-4 grid gap-3 text-sm">
            {[
              {
                title: hasSession ? 'Cookie phiên HttpOnly đang hoạt động' : 'Phiên mới sẽ được tạo khi bạn tạo bài',
                description:
                  'Máy chủ chỉ lưu băm SHA-256 của token phiên. Không có tên, email hay mật khẩu công khai.',
              },
              {
                title: 'Tài liệu tải lên là riêng tư',
                description:
                  'Tệp được lưu trong bộ sưu tập riêng, không nằm trong thư viện media công khai.',
              },
              {
                title: 'Đáp án bị loại khỏi chế độ thi',
                description:
                  'Trước khi nộp, máy chủ không gửi đáp án hoặc giải thích cho trình duyệt ở chế độ kiểm tra.',
              },
              {
                title: 'Kiểm tra đầu vào và giới hạn tần suất',
                description: `Tối đa ${rateLimits.perHour} lượt/giờ và ${rateLimits.perDay} lượt/ngày cho mỗi IP và phiên; kiểm tra định dạng, kích thước và nội dung tệp.`,
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Icon name="check" className="size-3.5" />
                </span>
                <span>
                  <span className="block font-bold text-slate-800">{item.title}</span>
                  <span className="mt-0.5 block leading-6 text-slate-600">{item.description}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
            Turnstile: {turnstileConfigured ? 'đã bật khi tạo bài' : 'chưa cấu hình trên máy chủ'}. Giới hạn tệp:
            ảnh {fileLimits.image} MB, PDF/DOCX {fileLimits.document} MB, TXT {fileLimits.text} MB.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold tracking-tight text-ink">Dữ liệu của bạn</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Bản đơn giản này không tạo tài khoản và không lưu lịch sử lâu dài. Bài kiểm tra được giữ
            trong bộ nhớ máy chủ tối đa 2 giờ để chấm điểm và tạo lại câu hỏi, sau đó tự động xoá.
            Tải lại trang sẽ bắt đầu một bài mới.
          </p>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              Quay lại tạo bài tập
              <Icon name="arrowRight" className="size-4" />
            </Link>
          </div>
        </section>

        {!usage.configured ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-bold text-amber-900">
              <Icon name="alert" className="size-5" />
              Cần cấu hình máy chủ
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              Quản trị viên cần thêm biến môi trường{' '}
              <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-xs">CLOUDFLARE_ACCOUNT_ID</code>{' '}
              và{' '}
              <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-xs">CLOUDFLARE_API_TOKEN</code>{' '}
              trong phần cài đặt bí mật của nền tảng. Không nhập token vào chat hoặc mã nguồn.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  )
}
