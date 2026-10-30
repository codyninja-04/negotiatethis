import Link from 'next/link'
import { Logo } from '@/components/layout/Logo'
import { createClient } from '@/lib/supabase/server'

const STEPS = [
  {
    n: '01',
    title: 'Describe the real one',
    body: 'Your actual numbers, your history with them, what you know about their pressures. Plus your target and walk-away, which stay private.',
  },
  {
    n: '02',
    title: 'Have the conversation',
    body: 'Claude plays the other side with interests of its own. Vague asks get nothing. A good case moves them. It stays in character until you end it.',
  },
  {
    n: '03',
    title: 'Get the honest debrief',
    body: 'Tactics you used and the ones used on you, where you conceded too early, the value you left behind, and the exact line to say instead.',
  },
]

const SCENARIOS = ['Salary offer', 'Rent renewal', 'Freelance rate', 'Car purchase', 'Supplier terms', 'Four day week']

export default async function Home() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const cta = user ? { href: '/setup', label: 'Start a session' } : { href: '/signup', label: 'Practice your negotiation' }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <Link href="/history" className="rounded-lg px-3 py-1.5 text-muted hover:text-text">
              History
            </Link>
          ) : (
            <Link href="/login" className="rounded-lg px-3 py-1.5 text-muted hover:text-text">
              Sign in
            </Link>
          )}
          <Link href={cta.href} className="btn-primary px-3.5 py-1.5">
            {user ? 'New session' : 'Get started'}
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-20">
          <div>
            <p className="label">Negotiation rehearsal</p>
            <h1 className="mt-4 font-display text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
              Have the hard conversation <span className="italic text-primary">before</span> you have it.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Describe the salary, rent or rate talk you are about to walk into. Claude plays the other side with real
              constraints and real tactics, then tells you plainly what worked and what cost you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={cta.href} className="btn-primary px-5 py-3">
                {cta.label}
              </Link>
              <span className="text-sm text-faint">3 free sessions a month</span>
            </div>
            <ul className="mt-10 flex flex-wrap gap-2" aria-label="Things people practise">
              {SCENARIOS.map((s) => (
                <li key={s} className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <HeroPreview />
        </section>

        {/* How it works */}
        <section className="border-y border-line/60 bg-surface/30">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <p className="font-mono text-xs text-primary">{s.n}</p>
                <h2 className="mt-3 font-display text-3xl">{s.title}</h2>
                <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The point */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-display text-4xl leading-tight sm:text-5xl">
                Generic advice says &ldquo;anchor high.&rdquo; <span className="italic text-muted">Your landlord doesn&apos;t care.</span>
              </h2>
              <p className="mt-5 max-w-lg leading-relaxed text-muted">
                Reading about negotiation is easy. Holding your number while someone tells you their budget is fixed is not.
                The only way to get better at that is to practise it against someone who pushes back the way your actual
                counterparty will.
              </p>
            </div>
            <div className="card p-6 sm:p-8">
              <p className="label">Say this instead</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-weakness">You said</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted line-through decoration-weakness/40">
                    I was hoping for maybe around $7,000 if that&apos;s possible? But I&apos;m flexible.
                  </p>
                </div>
                <div className="rounded-xl bg-primary/[0.06] p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Try</p>
                  <p className="mt-2 text-sm leading-relaxed">
                    Based on the scope and what the market is paying, I&apos;m looking at $7,200. What room do you have in the
                    band?
                  </p>
                </div>
              </div>
              <p className="mt-4 border-t border-line/60 pt-4 text-sm text-muted">
                &ldquo;Hoping&rdquo;, &ldquo;maybe&rdquo; and &ldquo;flexible&rdquo; told them your number was soft before they
                had to work for it.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="table-grain rounded-3xl border border-line/70 bg-surface/40 px-6 py-14 text-center sm:px-12">
            <h2 className="font-display text-4xl sm:text-5xl">Your next negotiation is already on the calendar.</h2>
            <p className="mx-auto mt-3 max-w-md text-muted">Ten minutes of practice now beats replaying it in your head later.</p>
            <Link href={cta.href} className="btn-primary mt-8 px-5 py-3">
              {cta.label}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-faint sm:flex-row sm:justify-between sm:px-6">
          <p>NegotiateThis is a practice tool. Nothing here is legal or financial advice.</p>
          <p>Pro is $8/month for unlimited sessions.</p>
        </div>
      </footer>
    </div>
  )
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="card table-grain overflow-hidden shadow-lift">
        <div className="flex items-center justify-between border-b border-line/60 px-5 py-3">
          <p className="label">Salary · Realistic hiring manager</p>
          <p className="font-mono text-[10px] text-faint">Exchange 3 of 14</p>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div className="border-l-2 border-them pl-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-them">Hiring manager</p>
            <p className="mt-1 text-[15px] leading-relaxed text-text/90">
              I hear you, but $6,200 is already near the top of what we budgeted for this level. I&apos;d need a strong
              reason to take more to HR.
            </p>
          </div>
          <div className="border-l-2 border-text/70 pl-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">You · 3</p>
            <p className="mt-1 text-[15px] leading-relaxed text-text/90">
              Fair. Here&apos;s the reason: I have an offer at $6,600, and I&apos;d rather be here. If we can get to $6,900 I can
              sign this week.
            </p>
          </div>
          <div className="border-l-2 border-them pl-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-them">Hiring manager</p>
            <p className="mt-1 text-[15px] leading-relaxed text-text/90">
              That&apos;s helpful to know. I can probably get $6,600 approved quickly. Would that work?
            </p>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-6 -left-2 hidden w-64 animate-rise-in rounded-2xl border border-line bg-surface p-4 shadow-lift sm:block lg:-left-8">
        <div className="flex items-center gap-2">
          <span className="chip border-primary/40 bg-primary/10 text-primary">BATNA reference</span>
          <span className="font-mono text-[10px] text-faint">Turn 3</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Named your alternative and paired it with a deadline. Strong, but you anchored $100 under your target.
        </p>
      </div>
    </div>
  )
}
