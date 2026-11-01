import type { ReactNode } from 'react'

export type IconName =
  | 'spark'
  | 'home'
  | 'book'
  | 'chart'
  | 'upload'
  | 'file'
  | 'clock'
  | 'check'
  | 'brain'
  | 'settings'
  | 'close'
  | 'menu'
  | 'image'
  | 'message'
  | 'history'
  | 'trash'
  | 'search'
  | 'filter'
  | 'refresh'
  | 'play'
  | 'arrowLeft'
  | 'arrowRight'
  | 'chevronDown'
  | 'alert'
  | 'info'
  | 'timer'
  | 'plus'
  | 'target'
  | 'user'
  | 'eye'
  | 'list'
  | 'layers'
  | 'calendar'
  | 'external'
  | 'spinner'

const paths: Record<IconName, ReactNode> = {
  spark: (
    <path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2Zm6 13 .7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7L18 15Z" />
  ),
  home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" />,
  book: (
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H11v18H6.5A2.5 2.5 0 0 0 4 22V4.5Zm16 0A2.5 2.5 0 0 0 17.5 2H13v18h4.5A2.5 2.5 0 0 1 20 22V4.5Z" />
  ),
  chart: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
  upload: <path d="M12 16V3m0 0L7 8m5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />,
  file: <path d="M6 2h8l5 5v15H6V2Zm8 0v6h5M9 13h7m-7 4h7" />,
  clock: <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v6l4 2" />,
  check: <path d="m5 12 4 4L19 6" />,
  brain: (
    <path d="M9.5 4A3.5 3.5 0 0 0 6 7.5v.7A3.5 3.5 0 0 0 4 14.5 3.5 3.5 0 0 0 9.5 18m5-14A3.5 3.5 0 0 1 18 7.5v.7a3.5 3.5 0 0 1 2 6.3 3.5 3.5 0 0 1-5.5 3.5M9.5 4v16m5-16v16M7 10h2.5m5 4H18" />
  ),
  settings: (
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-3.5c0-.5-.1-1-.2-1.5l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2.6-1.5L14 2.5h-4l-.3 2.6a8 8 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.5a8 8 0 0 0 0 3l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2.6 1.5l.3 2.6h4l.3-2.6a8 8 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.5c.1-.5.2-1 .2-1.5Z" />
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  image: (
    <path d="M4 4h16v16H4V4Zm0 12 4.5-4.5 3.5 3.5 2-2 6 6M15.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
  ),
  message: <path d="M4 5h16v12H8l-4 4V5Zm4 4h8m-8 4h5" />,
  history: <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5m4 0v5l3 2" />,
  trash: <path d="M4 7h16M9 7V4h6v3m-8 0 1 14h8l1-14M10 11v6m4-6v6" />,
  search: <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.5-4.5" />,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />,
  refresh: <path d="M20 6v5h-5M4 18v-5h5M6.1 9A7 7 0 0 1 18.7 7M17.9 15A7 7 0 0 1 5.3 17" />,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  arrowLeft: <path d="M19 12H5m0 0 6-6m-6 6 6 6" />,
  arrowRight: <path d="M5 12h14m0 0-6-6m6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  alert: <path d="M12 3 2 21h20L12 3Zm0 6v5m0 3h.01" />,
  info: <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-11v6m0-10h.01" />,
  timer: <path d="M12 8v5l3 2M9 2h6m-3 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  target: <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-4a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0-4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />,
  user: <path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />,
  eye: <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  layers: <path d="m12 2 9 5-9 5-9-5 9-5Zm9 10-9 5-9-5m18 5-9 5-9-5" />,
  calendar: <path d="M4 5h16v16H4V5Zm0 5h16M8 3v4m8-4v4" />,
  external: <path d="M14 4h6v6m0-6-9 9M19 14v6H4V5h6" />,
  spinner: <path d="M21 12a9 9 0 1 1-6.2-8.6" />,
}

export function Icon({
  name,
  className = 'size-5',
}: {
  name: IconName
  className?: string
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  )
}
