'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { AttemptSummary, StudyMode } from '@/types/study'

export type HistoryParams = {
  search: string
  mode: '' | StudyMode
  sort: 'newest' | 'oldest' | 'score-desc' | 'score-asc'
  page: number
  pageSize: number
}

const defaultParams: HistoryParams = {
  search: '',
  mode: '',
  sort: 'newest',
  page: 1,
  pageSize: 10,
}

export function useStudyHistory(initial: Partial<HistoryParams> = {}) {
  const [params, setParams] = useState<HistoryParams>({ ...defaultParams, ...initial })
  const [debouncedSearch, setDebouncedSearch] = useState(params.search)
  const [attempts, setAttempts] = useState<AttemptSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: defaultParams.pageSize,
    totalDocs: 0,
    totalPages: 0,
  })
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(params.search), 300)
    return () => clearTimeout(timer)
  }, [params.search])

  const load = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams({
        search: debouncedSearch,
        sort: params.sort,
        page: String(params.page),
        pageSize: String(params.pageSize),
      })
      if (params.mode) query.set('mode', params.mode)

      const response = await fetch(`/api/attempts?${query.toString()}`, {
        signal: controller.signal,
      })
      const payload = (await response.json().catch(() => null)) as
        | {
            attempts?: AttemptSummary[]
            pagination?: typeof pagination
            error?: string
          }
        | null
      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? 'Không tải được lịch sử làm bài.')
      }
      setAttempts(payload.attempts ?? [])
      setPagination(
        payload.pagination ?? {
          page: params.page,
          pageSize: params.pageSize,
          totalDocs: 0,
          totalPages: 0,
        },
      )
    } catch (cause) {
      if (controller.signal.aborted) return
      setError(cause instanceof Error ? cause.message : 'Không tải được lịch sử làm bài.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [debouncedSearch, params.mode, params.page, params.pageSize, params.sort])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- History fetch on mount and filter changes; loading state lives in the async loader.
    void load()
  }, [load])

  const setSearch = useCallback((search: string) => {
    setParams((current) => ({ ...current, search, page: 1 }))
  }, [])

  const setMode = useCallback((mode: '' | StudyMode) => {
    setParams((current) => ({ ...current, mode, page: 1 }))
  }, [])

  const setSort = useCallback((sort: HistoryParams['sort']) => {
    setParams((current) => ({ ...current, sort, page: 1 }))
  }, [])

  const setPage = useCallback((page: number) => {
    setParams((current) => ({ ...current, page: Math.max(1, page) }))
  }, [])

  const deleteAttempt = useCallback(
    async (id: string) => {
      setDeletingId(id)
      setError(null)
      try {
        const response = await fetch(`/api/attempts/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        })
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        if (!response.ok) throw new Error(payload?.error ?? 'Không xoá được lượt làm bài.')
        setAttempts((current) => current.filter((attempt) => attempt.id !== id))
        void load()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Không xoá được lượt làm bài.')
      } finally {
        setDeletingId(null)
      }
    },
    [load],
  )

  return {
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
    refresh: load,
    clearError: () => setError(null),
  }
}
