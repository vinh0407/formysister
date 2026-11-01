'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Icon } from '@/components/ui/Icon'

const navigation = [
  { href: '/', label: 'Tạo bài tập', icon: 'spark' as const },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
          aria-label="StudyAI — về trang tổng quan"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-200">
            <Icon name="spark" />
          </span>
          <span className="hidden sm:block">
            <span className="block text-lg font-bold leading-6 tracking-tight text-ink">StudyAI</span>
            <span className="block text-xs text-slate-500">Học thông minh hơn mỗi ngày</span>
          </span>
        </Link>

        <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 rounded-xl bg-slate-100 p-1 lg:flex">
          {navigation.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon name={item.icon} className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 sm:inline-flex">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Phiên ẩn danh
          </span>
          <Link
            href="/settings"
            aria-label="Cài đặt"
            aria-current={pathname === '/settings' ? 'page' : undefined}
            className={`flex size-10 items-center justify-center rounded-xl border transition ${
              pathname === '/settings'
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-700'
            }`}
          >
            <Icon name="settings" className="size-5" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? 'Đóng điều hướng' : 'Mở điều hướng'}
            className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-brand-200 hover:text-brand-700 lg:hidden"
          >
            <Icon name={open ? 'close' : 'menu'} className="size-5" />
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-navigation"
          aria-label="Điều hướng di động"
          className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden"
        >
          <ul className="grid gap-1.5">
            {navigation.map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? 'bg-brand-50 text-brand-700'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon name={item.icon} className="size-4" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
            <li>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                aria-current={pathname === '/settings' ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  pathname === '/settings'
                    ? 'bg-brand-50 text-brand-700'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon name="settings" className="size-4" />
                Cài đặt
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  )
}
