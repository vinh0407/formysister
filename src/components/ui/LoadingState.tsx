import { Icon } from './Icon'

export function LoadingState({
  label = 'Đang tải…',
  className = '',
  compact = false,
}: {
  label?: string
  className?: string
  compact?: boolean
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-3 text-slate-600 ${compact ? 'py-2' : 'py-10'} ${className}`}
    >
      <Icon name="spinner" className="size-5 animate-spin text-brand-600" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}
