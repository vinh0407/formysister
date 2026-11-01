'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Icon } from '@/components/ui/Icon'
import { LoadingState } from '@/components/ui/LoadingState'
import { formatDateTime } from '@/lib/format'

type QuizRow = {
  id: string
  title: string
  summary: string | null
  difficulty: 'easy' | 'medium' | 'hard'
  questionCount: number
  essayCount: number
  sourceMaterialId: string | null
  createdAt: string
}

type Pagination = { page: number; pageSize: number; totalDocs: number; totalPages: number }

const difficultyLabels = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó',
} as const

export function QuizzesManager() {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    totalDocs: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: '10' })
      if (debounced) query.set('search', debounced)
      const response = await fetch(`/api/quizzes?${query.toString()}`)
      const payload = (await response.json().catch(() => null)) as
        | { quizzes?: QuizRow[]; pagination?: Pagination; error?: string }
        | null
      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? 'Không tải được danh sách bài kiểm tra.')
      }
      setQuizzes(payload.quizzes ?? [])
      setPagination(payload.pagination ?? { page: 1, pageSize: 10, totalDocs: 0, totalPages: 0 })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được danh sách bài kiểm tra.')
    } finally {
      setLoading(false)
    }
  }, [debounced, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Paginated fetch on mount and filter changes; loading state lives in the async loader.
    void load()
  }, [load])

  const deleteQuiz = async (id: string) => {
    setDeletingId(id)
    setError(null)
    try {
      const response = await fetch(`/api/quizzes/${encodeURIComponent(id)}`, { method: 'DELETE' })
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) throw new Error(payload?.error ?? 'Không xoá được bài kiểm tra.')
      setConfirmId(null)
      if (quizzes.length === 1 && page > 1) setPage((current) => current - 1)
      else void load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không xoá được bài kiểm tra.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-md">
            <label htmlFor="quizzes-search" className="mb-1.5 block text-xs font-bold text-slate-700">
              Tìm bài kiểm tra
            </label>
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              />
              <input
                id="quizzes-search"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                maxLength={100}
                placeholder="Tên bài kiểm tra…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
              />
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            <Icon name="plus" className="size-4" />
            Tạo bài kiểm tra mới
          </Link>
        </div>
      </section>

      <ErrorMessage message={error} onDismiss={() => setError(null)} />

      <p className="sr-only" role="status" aria-live="polite">
        {loading ? 'Đang tải bài kiểm tra' : `${pagination.totalDocs} bài kiểm tra`}
      </p>

      {loading && quizzes.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <LoadingState label="Đang tải bài kiểm tra…" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon="book"
            title="Chưa có bài kiểm tra nào"
            description="Bài kiểm tra được tạo từ tài liệu của bạn sẽ xuất hiện ở đây để học lại hoặc thi lại bất cứ lúc nào."
            action={
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                <Icon name="spark" className="size-4" />
                Tạo bài đầu tiên
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2" aria-label="Danh sách bài kiểm tra">
          {quizzes.map((quiz) => (
            <li
              key={quiz.id}
              className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon name="book" className="size-5" />
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  {difficultyLabels[quiz.difficulty]}
                </span>
              </div>
              <h3 className="mt-3 break-words font-bold leading-6 text-ink">{quiz.title}</h3>
              {quiz.summary ? (
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{quiz.summary}</p>
              ) : null}
              <p className="mt-3 text-xs text-slate-600">
                {quiz.questionCount} trắc nghiệm · {quiz.essayCount} tự luận ·{' '}
                {formatDateTime(quiz.createdAt)}
              </p>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Link
                  href={`/quizzes/${quiz.id}?mode=learn`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
                >
                  <Icon name="brain" className="size-3.5" />
                  Học & sửa ngay
                </Link>
                <Link
                  href={`/quizzes/${quiz.id}?mode=exam`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-50"
                >
                  <Icon name="timer" className="size-3.5" />
                  Thi lại
                </Link>
                <span className="flex-1" />
                {confirmId === quiz.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void deleteQuiz(quiz.id)}
                      disabled={deletingId === quiz.id}
                      className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                    >
                      {deletingId === quiz.id ? 'Đang xoá…' : 'Xác nhận'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Huỷ
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(quiz.id)}
                    aria-label={`Xoá bài kiểm tra ${quiz.title}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Icon name="trash" className="size-3.5" />
                    Xoá
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pagination.totalPages > 1 ? (
        <nav
          aria-label="Phân trang bài kiểm tra"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          <p className="text-sm text-slate-600">
            Trang {pagination.page}/{pagination.totalPages} · {pagination.totalDocs} bài
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="arrowLeft" className="size-4" />
              Trước
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
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
