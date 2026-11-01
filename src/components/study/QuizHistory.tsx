'use client'

import Link from 'next/link'
import { useState } from 'react'

import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Icon } from '@/components/ui/Icon'
import { LoadingState } from '@/components/ui/LoadingState'
import { useStudyHistory } from '@/hooks/useStudyHistory'
import { formatDateTime, formatDuration, scoreTone } from '@/lib/format'

function ScoreBadge({ score }: { score: number }) {
  const tone = scoreTone(score)
  const classes =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : tone === 'okay'
        ? 'bg-amber-50 text-amber-800 ring-amber-200'
        : 'bg-rose-50 text-rose-700 ring-rose-200'
  return (
    <span
      className={`inline-flex min-w-12 items-center justify-center rounded-lg px-2 py-1 text-sm font-bold ring-1 ${classes}`}
      aria-label={`Điểm ${score} trên 100`}
    >
      {score}%
    </span>
  )
}

export function QuizHistory() {
  const {
    params,
    attempts,
    pagination,
    loading,
    error,
    deletingId,
    setSearch,
    setMode,
    setSort,
    setPage,
    deleteAttempt,
    clearError,
  } = useStudyHistory()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const statusText = loading
    ? 'Đang tải lịch sử làm bài'
    : `Tìm thấy ${pagination.totalDocs} lượt làm bài`

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <label htmlFor="history-search" className="mb-1.5 block text-xs font-bold text-slate-700">
              Tìm theo tên bài
            </label>
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              />
              <input
                id="history-search"
                type="search"
                value={params.search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ví dụ: Quang hợp"
                maxLength={100}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="history-mode" className="mb-1.5 block text-xs font-bold text-slate-700">
              Chế độ
            </label>
            <select
              id="history-mode"
              value={params.mode}
              onChange={(event) => setMode(event.target.value as '' | 'learn' | 'exam')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-ink outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
            >
              <option value="">Tất cả chế độ</option>
              <option value="learn">Học & sửa ngay</option>
              <option value="exam">Kiểm tra thật</option>
            </select>
          </div>

          <div>
            <label htmlFor="history-sort" className="mb-1.5 block text-xs font-bold text-slate-700">
              Sắp xếp
            </label>
            <select
              id="history-sort"
              value={params.sort}
              onChange={(event) =>
                setSort(event.target.value as 'newest' | 'oldest' | 'score-desc' | 'score-asc')
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-ink outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="score-desc">Điểm cao nhất</option>
              <option value="score-asc">Điểm thấp nhất</option>
            </select>
          </div>
        </div>
      </section>

      <ErrorMessage message={error} onDismiss={clearError} />

      <p className="sr-only" role="status" aria-live="polite">
        {statusText}
      </p>

      {loading && attempts.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <LoadingState label="Đang tải lịch sử làm bài…" />
        </div>
      ) : attempts.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon="history"
            title="Chưa có lượt làm bài nào"
            description="Kết quả chỉ xuất hiện sau khi bạn nộp bài. Hãy tạo một bài kiểm tra từ tài liệu của bạn để bắt đầu."
            action={
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                <Icon name="plus" className="size-4" />
                Tạo bài kiểm tra
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Danh sách lượt làm bài">
          {attempts.map((attempt) => (
            <li
              key={attempt.id}
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <ScoreBadge score={attempt.totalScore} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/history/${attempt.id}`}
                      className="block truncate font-bold text-ink hover:text-brand-700"
                    >
                      {attempt.quizTitle}
                    </Link>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatDateTime(attempt.completedAt ?? attempt.createdAt)} ·{' '}
                      {attempt.mode === 'exam' ? 'Kiểm tra thật' : 'Học & sửa ngay'} ·{' '}
                      {formatDuration(attempt.durationSeconds)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-600">
                      <span className="text-emerald-700">Đúng {attempt.correctCount}</span>
                      <span className="text-rose-700">Sai {attempt.incorrectCount}</span>
                      <span className="text-amber-700">Bỏ trống {attempt.unansweredCount}</span>
                      <span>
                        {attempt.objectiveQuestionCount} trắc nghiệm · {attempt.essayQuestionCount} tự
                        luận
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link
                    href={`/history/${attempt.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
                  >
                    <Icon name="eye" className="size-3.5" />
                    Xem lại
                  </Link>
                  {attempt.quizId ? (
                    <Link
                      href={`/quizzes/${attempt.quizId}?mode=learn`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
                    >
                      <Icon name="refresh" className="size-3.5" />
                      Làm lại
                    </Link>
                  ) : null}
                  {confirmId === attempt.id ? (
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmId(null)
                          void deleteAttempt(attempt.id)
                        }}
                        disabled={deletingId === attempt.id}
                        className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                      >
                        {deletingId === attempt.id ? 'Đang xoá…' : 'Xác nhận xoá'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Huỷ
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(attempt.id)}
                      aria-label={`Xoá lượt làm bài ${attempt.quizTitle}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Icon name="trash" className="size-3.5" />
                      Xoá
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pagination.totalPages > 1 ? (
        <nav
          aria-label="Phân trang lịch sử"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          <p className="text-sm text-slate-600">
            Trang {pagination.page}/{pagination.totalPages} · {pagination.totalDocs} lượt
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="arrowLeft" className="size-4" />
              Trước
            </button>
            <button
              type="button"
              onClick={() => setPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
              <Icon name="arrowRight" className="size-4" />
            </button>
          </div>
        </nav>
      ) : null}
    </div>
  )
}
