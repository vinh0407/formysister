'use client'

import { Icon } from './Icon'

export function ErrorMessage({
  message,
  onDismiss,
  id,
}: {
  message: string | null | undefined
  onDismiss?: () => void
  id?: string
}) {
  if (!message) return null
  return (
    <div
      id={id}
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
    >
      <Icon name="alert" className="mt-0.5 size-5 shrink-0" />
      <p className="min-w-0 flex-1 leading-6">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 text-rose-700 transition hover:bg-rose-100"
          aria-label="Đóng thông báo lỗi"
        >
          <Icon name="close" className="size-4" />
        </button>
      ) : null}
    </div>
  )
}
