'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from './Logo'

const NAV = [
  { href: '/setup', label: 'New session' },
  { href: '/history', label: 'History' },
  { href: '/settings', label: 'Settings' },
]

export function Header({ name, plan }: { name: string; plan: 'free' | 'pro' }) {
  const pathname = usePathname()
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'You'

  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo href="/setup" />

        <nav className="flex items-center gap-1 text-sm" aria-label="Main">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              (item.href === '/history' && pathname.startsWith('/practice/'))
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-lg px-2.5 py-1.5 transition sm:px-3 ${
                  active ? 'bg-surface text-text' : 'text-muted hover:bg-surface/60 hover:text-text'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <Link href="/settings" className="hidden items-center gap-2.5 sm:flex" title={name}>
          {plan === 'pro' && <span className="chip border-primary/40 bg-primary/10 text-primary">Pro</span>}
          <span className="grid h-8 w-8 place-items-center rounded-full bg-raised text-xs font-semibold text-muted">
            {initials}
          </span>
        </Link>
      </div>
    </header>
  )
}
