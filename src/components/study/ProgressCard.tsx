import Link from 'next/link'

import { Icon } from '@/components/ui/Icon'
import { formatDateTime, formatNumber, scoreTone } from '@/lib/format'
import type { AttemptSummary, StudyStatsData } from '@/types/study'

function scoreClass(score: number): string {
  const tone = scoreTone(score)
  if (tone === 'good') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (tone === 'okay') return 'bg-amber-50 text-amber-800 ring-amber-200'
  return 'bg-rose-50 text-rose-700 ring-rose-200'
}

export function ProgressCard({
  stats,
  recentAttempts = [],
}: {
  stats: StudyStatsData
  recentAttempts?: AttemptSummary[]
}) {
  const weeklyQuizzes = stats.weeklyActivity.reduce((sum, day) => sum + day.quizzes, 0)
  const weeklyQuestions = stats.weeklyActivity.reduce((sum, day) => sum + day.questions, 0)
  const maxDaily = Math.max(1, ...stats.weeklyActivity.map((day) => day.quizzes))

  return (
    <aside className="space-y-5" aria-labelledby="progress-card-heading">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-700">7 ngày gần đây</p>
            <h2 id="progress-card-heading" className="mt-2 text-lg font-bold tracking-tight text-ink">
              Tiến độ của bạn
            </h2>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Icon name="chart" className="size-5" />
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {[
            { value: formatNumber(weeklyQuizzes), label: 'Bài đã làm' },
            { value: formatNumber(weeklyQuestions), label: 'Câu đã luyện' },
            { value: `${stats.accuracy}%`, label: 'Chính xác' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-slate-50 p-3 text-center">
              <p className="text-xl font-bold text-brand-700">{item.value}</p>
              <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-600">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Hoạt động theo ngày</span>
            <span>{stats.currentStreak} ngày liên tiếp</span>
          </div>
          <div className="flex h-16 items-end gap-1.5" aria-hidden="true">
            {stats.weeklyActivity.map((day) => {
              const height = Math.max(8, Math.round((day.quizzes / maxDaily) * 100))
              return (
                <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm ${
                      day.quizzes > 0 ? 'bg-brand-500' : 'bg-slate-200'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[9px] font-medium text-slate-500">
                    {day.date.slice(8, 10)}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="sr-only">
            {stats.weeklyActivity
              .map((day) => `${day.date}: ${day.quizzes} bài`)
              .join(', ')}
          </p>
        </div>

        <Link
          href="/progress"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:text-brand-800"
        >
          Xem toàn bộ tiến độ
          <Icon name="arrowRight" className="size-4" />
        </Link>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold tracking-tight text-ink">Bài làm gần đây</h2>
          <Link href="/history" className="text-xs font-bold text-brand-700 hover:text-brand-800">
            Tất cả
          </Link>
        </div>

        {recentAttempts.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Chưa có lượt làm bài nào. Kết quả thật sẽ xuất hiện ở đây sau khi bạn nộp bài.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {recentAttempts.map((attempt) => (
              <li key={attempt.id}>
                <Link
                  href={`/history/${attempt.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ring-1 ${scoreClass(
                      attempt.totalScore,
                    )}`}
                    aria-label={`${attempt.totalScore} phần trăm`}
                  >
                    {attempt.totalScore}%
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-800">
                      {attempt.quizTitle}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {formatDateTime(attempt.completedAt ?? attempt.createdAt)} ·{' '}
                      {attempt.mode === 'exam' ? 'Kiểm tra' : 'Học'}
                    </span>
                  </span>
                  <Icon name="arrowRight" className="size-4 shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
