'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Icon } from '@/components/ui/Icon'
import { LoadingState } from '@/components/ui/LoadingState'
import { formatBytes, formatDateTime, sourceTypeLabel } from '@/lib/format'

type MaterialRow = {
  id: string
  title: string
  description: string | null
  originalFilename: string | null
  sourceType: string
  mimeType: string | null
  fileSize: number
  processingStatus: 'pending' | 'ready' | 'failed'
  pageCount: number | null
  hasFile: boolean
  createdAt: string
}

type Pagination = { page: number; pageSize: number; totalDocs: number; totalPages: number }

const statusStyles: Record<MaterialRow['processingStatus'], string> = {
  ready: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  failed: 'bg-rose-50 text-rose-700 ring-rose-200',
}

const statusLabels: Record<MaterialRow['processingStatus'], string> = {
  ready: 'Sẵn sàng',
  pending: 'Đang xử lý',
  failed: 'Xử lý lỗi',
}

export function MaterialsManager() {
  const [materials, setMaterials] = useState<MaterialRow[]>([])
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
      const query = new URLSearchParams({
        page: String(page),
        pageSize: '10',
      })
      if (debounced) query.set('search', debounced)
      const response = await fetch(`/api/materials?${query.toString()}`)
      const payload = (await response.json().catch(() => null)) as
        | { materials?: MaterialRow[]; pagination?: Pagination; error?: string }
        | null
      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? 'Không tải được danh sách tài liệu.')
      }
      setMaterials(payload.materials ?? [])
      setPagination(payload.pagination ?? { page: 1, pageSize: 10, totalDocs: 0, totalPages: 0 })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được danh sách tài liệu.')
    } finally {
      setLoading(false)
    }
  }, [debounced, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Paginated fetch on mount and filter changes; loading state lives in the async loader.
    void load()
  }, [load])

  const deleteMaterial = async (id: string) => {
    setDeletingId(id)
    setError(null)
    try {
      const response = await fetch(`/api/materials?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) throw new Error(payload?.error ?? 'Không xoá được tài liệu.')
      setConfirmId(null)
      if (materials.length === 1 && page > 1) setPage((current) => current - 1)
      else void load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không xoá được tài liệu.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-md">
            <label htmlFor="materials-search" className="mb-1.5 block text-xs font-bold text-slate-700">
              Tìm tài liệu
            </label>
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              />
              <input
                id="materials-search"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                maxLength={100}
                placeholder="Tên tài liệu…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
              />
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            <Icon name="plus" className="size-4" />
            Tạo từ tài liệu mới
          </Link>
        </div>
      </section>

      <ErrorMessage message={error} onDismiss={() => setError(null)} />

      <p className="sr-only" role="status" aria-live="polite">
        {loading ? 'Đang tải tài liệu' : `${pagination.totalDocs} tài liệu`}
      </p>

      {loading && materials.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <LoadingState label="Đang tải tài liệu…" />
        </div>
      ) : materials.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon="layers"
            title="Chưa có tài liệu nào"
            description="Mỗi tài liệu bạn tải lên để tạo bài kiểm tra sẽ được lưu riêng trong phiên học này. Bạn có thể xoá tài liệu chưa dùng."
            action={
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                <Icon name="upload" className="size-4" />
                Tải tài liệu đầu tiên
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-3" aria-label="Danh sách tài liệu">
          {materials.map((material) => (
            <li
              key={material.id}
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon name={material.sourceType === 'image' ? 'image' : 'file'} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 break-words font-bold text-ink">{material.title}</h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${statusStyles[material.processingStatus]}`}
                    >
                      {statusLabels[material.processingStatus]}
                    </span>
                  </div>
                  {material.description ? (
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                      {material.description}
                    </p>
                  ) : null}
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span>{sourceTypeLabel(material.sourceType)}</span>
                    <span>{formatBytes(material.fileSize)}</span>
                    {material.pageCount ? <span>{material.pageCount} trang</span> : null}
                    <span>{formatDateTime(material.createdAt)}</span>
                    {material.originalFilename ? (
                      <span className="max-w-full truncate">{material.originalFilename}</span>
                    ) : null}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {confirmId === material.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void deleteMaterial(material.id)}
                        disabled={deletingId === material.id}
                        className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                      >
                        {deletingId === material.id ? 'Đang xoá…' : 'Xác nhận xoá'}
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
                      onClick={() => setConfirmId(material.id)}
                      aria-label={`Xoá tài liệu ${material.title}`}
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
          aria-label="Phân trang tài liệu"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          <p className="text-sm text-slate-600">
            Trang {pagination.page}/{pagination.totalPages} · {pagination.totalDocs} tài liệu
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
