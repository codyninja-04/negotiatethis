'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { formatAmount, positionOnScale } from '@/lib/negotiation'
import type { CounterTactic, DealNumbers, NegotiationSession, SkillScores } from '@/lib/types'

const SKILLS: { key: keyof SkillScores; label: string; hint: string }[] = [
  { key: 'anchoring', label: 'Anchoring', hint: 'Setting and resetting the reference number' },
  { key: 'discovery', label: 'Discovery', hint: 'Asking to learn their constraints' },
  { key: 'concessions', label: 'Concessions', hint: 'Small steps, traded, not given' },
  { key: 'composure', label: 'Composure', hint: 'Calm and firm under pressure' },
]

const HANDLED: Record<CounterTactic['handled'], { label: string; tone: string }> = {
  well: { label: 'Handled well', tone: 'border-strength/40 text-strength' },
  partly: { label: 'Partly handled', tone: 'border-them/40 text-them' },
  poorly: { label: 'Got you', tone: 'border-weakness/40 text-weakness' },
}

export function OutcomeAnalysis({ session }: { session: NegotiationSession }) {
  const score = session.overall_score ?? 0
  const skills = session.skill_scores
  const tactics = session.tactic_details ?? []
  const counters = session.counter_tactics ?? []
  const better = session.better_line

  return (
    <div className="space-y-4">
      {/* Verdict */}
      <section className="card grid animate-rise-in gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
        <ScoreRing score={score} />
        <div>
          <p className="label">Honest read</p>
          <p className="mt-2 font-display text-2xl leading-snug sm:text-[28px]">{session.likely_outcome_assessment}</p>
        </div>
      </section>

      {session.deal_numbers && <DealZone numbers={session.deal_numbers} />}

      <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
        {skills && (
          <section className="card p-6">
            <p className="label">Skills</p>
            <ul className="mt-4 space-y-4">
              {SKILLS.map((s, i) => (
                <li key={s.key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{s.label}</span>
                    <span className="font-mono text-xs text-muted">{skills[s.key]}/5</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line/70">
                    <div
                      className={`h-full origin-left animate-grow rounded-full ${
                        skills[s.key] >= 4 ? 'bg-strength' : skills[s.key] <= 2 ? 'bg-weakness' : 'bg-them'
                      }`}
                      style={{ width: `${(skills[s.key] / 5) * 100}%`, animationDelay: `${i * 90}ms` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-faint">{s.hint}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {session.value_left && (
          <section className="card flex flex-col p-6">
            <p className="label">Value left on the table</p>
            <p className="mt-3 text-[15px] leading-relaxed text-text/90">{session.value_left}</p>
          </section>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PointList title="What worked" items={session.approach_strengths ?? []} tone="strength" />
        <PointList title="What cost you" items={session.approach_weaknesses ?? []} tone="weakness" />
      </div>

      {better && <BetterLineCard better={better} />}

      {(tactics.length > 0 || counters.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card p-6">
            <p className="label">Tactics you used</p>
            {tactics.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No named tactics this time. Plain asking is a tactic too, just not a strong one.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {tactics.map((t, i) => (
                  <li key={`${t.name}-${i}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip border-primary/40 bg-primary/10 text-primary">{t.name}</span>
                      {t.turn && (
                        <a href={`#turn-${t.turn}`} className="font-mono text-[10px] uppercase tracking-wider text-faint hover:text-muted">
                          Turn {t.turn}
                        </a>
                      )}
                    </div>
                    {t.quote && <p className="mt-2 border-l border-line pl-3 text-sm italic text-muted">&ldquo;{t.quote}&rdquo;</p>}
                    {t.note && <p className="mt-1.5 text-sm text-text/85">{t.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-6">
            <p className="label">Used on you</p>
            {counters.length === 0 ? (
              <p className="mt-3 text-sm text-muted">They kept it straightforward this time.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {counters.map((t, i) => (
                  <li key={`${t.name}-${i}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip border-them/40 bg-them/10 text-them">{t.name}</span>
                      <span className={`chip ${HANDLED[t.handled].tone}`}>{HANDLED[t.handled].label}</span>
                    </div>
                    {t.quote && <p className="mt-2 border-l border-line pl-3 text-sm italic text-muted">&ldquo;{t.quote}&rdquo;</p>}
                    {t.note && <p className="mt-1.5 text-sm text-text/85">{t.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {(session.suggested_improvements ?? []).length > 0 && (
        <section className="card p-6 sm:p-8">
          <p className="label">Before the real one</p>
          <ol className="mt-4 space-y-4">
            {(session.suggested_improvements ?? []).map((item, i) => (
              <li key={i} className="grid grid-cols-[2rem_1fr] gap-2">
                <span className="font-display text-2xl leading-none text-primary">{i + 1}</span>
                <p className="text-[15px] leading-relaxed text-text/90">{item}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="flex flex-col items-start justify-between gap-4 pt-2 sm:flex-row sm:items-center">
        <p className="max-w-md text-xs text-faint">
          Practice feedback only, not legal or financial advice. The real person across the table will have their own read
          on things.
        </p>
        <RunItBack session={session} />
      </div>
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const r = 46
  const c = 2 * Math.PI * r
  const tone = score >= 7 ? 'stroke-strength' : score <= 4 ? 'stroke-weakness' : 'stroke-them'
  return (
    <div className="relative mx-auto h-28 w-28 sm:mx-0" role="img" aria-label={`Overall score ${score} out of 10`}>
      <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" className="stroke-line/70" strokeWidth="7" />
        <circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          className={`${tone} transition-[stroke-dashoffset] duration-1000`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 10)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-4xl leading-none">{score}</p>
          <p className="font-mono text-[10px] text-faint">/ 10</p>
        </div>
      </div>
    </div>
  )
}

// Your range runs from walk-away (left) to target (right), whichever way the
// numbers go, so "further right" always means "better for you".
function DealZone({ numbers }: { numbers: DealNumbers }) {
  const { walk_away, target, their_opening, final, prefix, suffix } = numbers
  if (walk_away === null || target === null) return null

  const span = target - walk_away
  const pad = Math.abs(span) * 0.4 || Math.abs(target) * 0.1 || 1
  const dir = span >= 0 ? 1 : -1
  const lo = walk_away - pad * dir
  const hi = target + pad * dir
  const pos = (v: number) => positionOnScale(v, lo, hi)
  const fmt = (v: number) => formatAmount(v, prefix, suffix)

  const left = pos(walk_away)
  const right = pos(target)
  const verdict =
    final === null
      ? null
      : (final - walk_away) * dir < 0
        ? { text: 'Past your walk-away point', tone: 'text-weakness' }
        : (final - target) * dir >= 0
          ? { text: 'At or beyond your target', tone: 'text-strength' }
          : { text: `${Math.round(((final - walk_away) / span) * 100)}% of the way to your target`, tone: 'text-them' }

  return (
    <section className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="label">Where it landed</p>
        {verdict && <p className={`text-sm ${verdict.tone}`}>{verdict.text}</p>}
      </div>

      <div className="relative mt-12 mb-12 h-2">
        <div className="absolute inset-0 rounded-full bg-line/60" />
        <div
          className="absolute inset-y-0 origin-left animate-grow rounded-full bg-gradient-to-r from-them/50 to-strength/70"
          style={{ left: `${left}%`, width: `${right - left}%` }}
        />
        <Marker at={left} label="Walk away" value={fmt(walk_away)} side="below" />
        <Marker at={right} label="Target" value={fmt(target)} side="below" />
        {their_opening !== null && <Marker at={pos(their_opening)} label="Their opening" value={fmt(their_opening)} side="above" tone="them" />}
        {final !== null && <Marker at={pos(final)} label="Final" value={fmt(final)} side="above" tone="final" />}
      </div>
    </section>
  )
}

function Marker({
  at,
  label,
  value,
  side,
  tone = 'plain',
}: {
  at: number
  label: string
  value: string
  side: 'above' | 'below'
  tone?: 'plain' | 'them' | 'final'
}) {
  const dot = tone === 'final' ? 'h-4 w-4 bg-text ring-4 ring-primary/40' : tone === 'them' ? 'h-3 w-3 bg-them' : 'h-3 w-3 bg-muted'
  // Keep edge labels inside the card.
  const align = at < 12 ? 'left-0' : at > 88 ? 'right-0' : 'left-1/2 -translate-x-1/2'
  return (
    <div className="absolute top-1/2" style={{ left: `${at}%` }}>
      <span className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${dot}`} />
      <div className={`absolute w-max whitespace-nowrap text-center ${align} ${side === 'above' ? 'bottom-4' : 'top-4'}`}>
        <p className={`font-mono text-[10px] uppercase tracking-wider ${tone === 'them' ? 'text-them' : 'text-faint'}`}>{label}</p>
        <p className={`text-xs ${tone === 'final' ? 'font-semibold text-text' : 'text-muted'}`}>{value}</p>
      </div>
    </div>
  )
}

function PointList({ title, items, tone }: { title: string; items: string[]; tone: 'strength' | 'weakness' }) {
  const bar = tone === 'strength' ? 'bg-strength' : 'bg-weakness'
  return (
    <section className="card p-6">
      <p className="label">{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nothing stood out here.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-text/90">
              <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${bar}`} aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function BetterLineCard({ better }: { better: NonNullable<NegotiationSession['better_line']> }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(better.rewrite)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard can be blocked. The text is on screen either way.
    }
  }
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line/60 px-6 py-4">
        <p className="label">Say this instead</p>
        {better.turn && (
          <a href={`#turn-${better.turn}`} className="font-mono text-[10px] uppercase tracking-wider text-faint hover:text-muted">
            Turn {better.turn}
          </a>
        )}
      </div>
      <div className="grid md:grid-cols-2">
        <div className="border-b border-line/60 p-6 md:border-b-0 md:border-r">
          <p className="font-mono text-[10px] uppercase tracking-wider text-weakness">You said</p>
          <p className="mt-2 text-[15px] leading-relaxed text-muted line-through decoration-weakness/40">{better.original}</p>
        </div>
        <div className="bg-primary/[0.04] p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Try</p>
            <button onClick={copy} className="text-xs text-muted hover:text-text">
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-text">{better.rewrite}</p>
        </div>
      </div>
      {better.why && <p className="border-t border-line/60 px-6 py-4 text-sm text-muted">{better.why}</p>}
    </section>
  )
}

// Same scenario, fresh conversation. The counterparty will not remember the
// last attempt, which is the point: try the improvements on a clean slate.
function RunItBack({ session }: { session: NegotiationSession }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go() {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/negotiations/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario_type: session.scenario_type,
        situation_description: session.situation_description,
        my_target: session.my_target,
        my_walk_away_point: session.my_walk_away_point,
        counterparty_context: session.counterparty_context,
        stance: session.stance,
        opener: session.opener,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string }
    if (res.ok && data.id) {
      router.push(`/practice/${data.id}`)
      return
    }
    setError(data.error || 'Could not start a new run.')
    setBusy(false)
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button onClick={go} disabled={busy} className="btn-primary">
        {busy ? 'Resetting the table…' : 'Run it again'}
      </button>
      {error && <p className="text-xs text-weakness">{error}</p>}
    </div>
  )
}
