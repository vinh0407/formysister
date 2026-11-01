import type { Metadata } from 'next'

import { SettingsPanel } from '@/components/study/SettingsPanel'
import { Icon } from '@/components/ui/Icon'
import { getAIUsageStatus } from '@/lib/ai/ai-usage'
import { maxDocumentBytes, maxImageBytes, maxTextBytes } from '@/lib/security/file-validation'
import { rateLimitSettings } from '@/lib/security/rate-limit'
import { readSessionHash } from '@/lib/security/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cài đặt và hạn mức',
  description: 'Trạng thái Cloudflare Workers AI, hạn mức miễn phí và cách dữ liệu học tập được bảo vệ.',
}

const MB = 1024 * 1024

export default async function SettingsPage() {
  const [usage, sessionHash] = await Promise.all([getAIUsageStatus(), readSessionHash()])
  const limits = rateLimitSettings()

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="mb-6 flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon name="settings" className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Cài đặt và hạn mức</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            StudyAI chỉ dùng Cloudflare Workers AI miễn phí. Trang này cho biết mô hình đang chạy,
            ngân sách neuron còn lại và các lớp bảo vệ dữ liệu của bạn.
          </p>
        </div>
      </header>

      <SettingsPanel
        usage={usage}
        turnstileConfigured={Boolean(
          process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        )}
        rateLimits={limits}
        fileLimits={{
          image: Math.round(maxImageBytes() / MB),
          document: Math.round(maxDocumentBytes() / MB),
          text: Math.round(maxTextBytes() / MB),
        }}
        hasSession={Boolean(sessionHash)}
      />
    </main>
  )
}
