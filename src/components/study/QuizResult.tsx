'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

import { Icon } from '@/components/ui/Icon'
import type { GradedResult } from '@/types/study'

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return 'Không rõ'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins} phút ${secs.toString().padStart(2, '0')} giây`
}

export function QuizResult({
  result,
  onRestart,
  onNewQuiz,
}: {
  result: GradedResult
  onRestart: () => void
  onNewQuiz?: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <section
      aria-labelledby="quiz-result-heading"
      aria-live="polite"
      className="rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-white p-5 shadow-sm sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-700">Kết quả</p>
          <h2
            id="quiz-result-heading"
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 text-2xl font-bold tracking-tight text-ink outline-none"
          >
            {result.objectiveScore}% điểm trắc nghiệm
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {result.objectiveQuestionCount} câu trắc nghiệm · {result.essayQuestionCount} câu tự luận
            {result.durationSeconds ? ` · ${formatDuration(result.durationSeconds)}` : ''}
          </p>
        </div>
        <div className="flex size-24 shrink-0 flex-col items-center justify-center rounded-full border-8 border-brand-100 bg-white text-center shadow-sm">
          <span className="text-2xl font-bold text-brand-700">{result.objectiveScore}%</span>
          <span className="text-xs font-semibold text-slate-600">Trắc nghiệm</span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Trả lời đúng', value: result.correctCount, tone: 'emerald' },
          { label: 'Trả lời sai', value: result.incorrectCount, tone: 'rose' },
          { label: 'Chưa trả lời', value: result.unansweredCount, tone: 'amber' },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border p-4 ${
              item.tone === 'emerald'
                ? 'border-emerald-100 bg-emerald-50'
                : item.tone === 'rose'
                  ? 'border-rose-100 bg-rose-50'
                  : 'border-amber-100 bg-amber-50'
            }`}
          >
            <p className="text-2xl font-bold text-ink">{item.value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-600">{item.label}</p>
          </div>
        ))}
      </div>

      {result.essayQuestionCount > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <p className="font-bold">Tự luận chưa được chấm tự động</p>
          <p className="mt-1">
            Đã trả lời {result.answeredEssayCount}/{result.essayQuestionCount} câu. Điểm tổng chỉ gồm
            phần trắc nghiệm; đáp án tham khảo bên dưới giúp bạn hoặc giáo viên đối chiếu.
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700"
        >
          <Icon name="refresh" className="size-4" />
          Làm lại bài này
        </button>
        {onNewQuiz ? (
          <button
            type="button"
            onClick={onNewQuiz}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-brand-50"
          >
            <Icon name="plus" className="size-4" />
            Tạo bài mới
          </button>
        ) : null}
        <Link
          href="/history"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
        >
          <Icon name="history" className="size-4" />
          Xem lịch sử
        </Link>
      </div>
    </section>
  )
}
