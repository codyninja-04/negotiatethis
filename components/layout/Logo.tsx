import Link from 'next/link'

// Two offers moving toward each other: yours in bone, theirs in emerald, with
// the gap between them being the part you negotiate.
export function LogoMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-surface" />
      <path d="M6 12.5h9.5" className="stroke-text" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M12.5 9.5l3 3-3 3" fill="none" className="stroke-text" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 19.5h-9.5" className="stroke-primary" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M19.5 16.5l-3 3 3 3" fill="none" className="stroke-primary" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
    >
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight">NegotiateThis</span>
    </Link>
  )
}
