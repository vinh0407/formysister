const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const monthFormatter = new Intl.DateTimeFormat('vi-VN', {
  month: 'short',
  year: 'numeric',
})

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | null | undefined): string {
  const date = toDate(value)
  return date ? dateFormatter.format(date) : '—'
}

export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value)
  return date ? dateTimeFormatter.format(date) : '—'
}

export function formatMonth(value: string | null | undefined): string {
  if (!value) return '—'
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return value
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)))
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return 'Không ghi nhận'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remaining = seconds % 60
  if (hours > 0) return `${hours} giờ ${minutes} phút`
  if (minutes > 0) return `${minutes} phút ${remaining.toString().padStart(2, '0')} giây`
  return `${remaining} giây`
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function formatNumber(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('vi-VN')
}

export function scoreTone(score: number): 'good' | 'okay' | 'weak' {
  if (score >= 80) return 'good'
  if (score >= 50) return 'okay'
  return 'weak'
}

export function sourceTypeLabel(value: string): string {
  switch (value) {
    case 'image':
      return 'Ảnh'
    case 'pdf':
      return 'PDF'
    case 'docx':
      return 'DOCX'
    case 'txt':
      return 'Văn bản'
    default:
      return 'Nội dung nhập'
  }
}
