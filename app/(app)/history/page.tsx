import type { Metadata } from 'next'
import Link from 'next/link'
import { HistoryList, type HistoryItem } from '@/components/history/HistoryList'
import { requireUser } from '@/lib/auth'
import { userTurnCount } from '@/lib/negotiation'
import { FREE_HISTORY_LIMIT, hasProFeatures } from '@/lib/plan'
import type { NegotiationSession, SkillScores } from '@/lib/types'

export const metadata: Metadata = { title: 'History' }
export const dynamic = 'force-dynamic'

const SKILL_LABELS: Record<keyof SkillScores, string> = {
  anchoring: 'Anchoring',
  discovery: 'Discovery',
  concessions: 'Concessions',
  composure: 'Composure',
}

type Row = Pick<
  NegotiationSession,
  | 'id'
  | 'created_at'
  | 'ended_at'
  | 'scenario_type'
  | 'situation_description'
  | 'my_target'
  | 'messages'
  | 'outcome'
  | 'final_terms'
  | 'overall_score'
  | 'likely_outcome_assessment'
  | 'skill_scores'
  | 'tactics_used'
>

const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null)
const fmt = (n: number | null) => (n === null ? '–' : (Math.round(n * 10) / 10).toString())

export default async function HistoryPage() {
  const { supabase, user, profile } = await requireUser()
  const full = hasProFeatures(profile.plan)

  const { data } = await supabase
    .from('negotiation_sessions')
    .select(
      'id, created_at, ended_at, scenario_type, situation_description, my_target, messages, outcome, final_terms, overall_score, likely_outcome_assessment, skill_scores, tactics_used'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const all = (data ?? []) as Row[]
  const rows = full ? all : all.slice(0, FREE_HISTORY_LIMIT)

  const debriefed = all.filter((r) => r.overall_score !== null)
  const closed = all.filter((r) => r.outcome && r.outcome !== 'paused')
  const deals = closed.filter((r) => r.outcome === 'deal').length

  // Skill averages show where the user is consistently strongest and weakest.
  const skillAvgs = (Object.keys(SKILL_LABELS) as (keyof SkillScores)[])
    .map((key) => ({ key, value: avg(debriefed.map((r) => r.skill_scores?.[key]).filter((v): v is number => !!v)) }))
    .filter((s): s is { key: keyof SkillScores; value: number } => s.value !== null)
    .sort((a, b) => b.value - a.value)

  const tacticCounts = new Map<string, number>()
  for (const r of debriefed) {
    for (const name of r.tactics_used ?? []) tacticCounts.set(name, (tacticCounts.get(name) ?? 0) + 1)
  }
  const topTactics = Array.from(tacticCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  // Last ten scores, oldest first, for the trend strip.
  const trend = debriefed
    .slice(0, 10)
    .reverse()
    .map((r) => ({ id: r.id, score: r.overall_score as number }))

  const items: HistoryItem[] = rows.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    scenario_type: r.scenario_type,
    situation: r.situation_description,
    target: r.my_target,
    turns: userTurnCount(r.messages ?? []),
    status: !r.ended_at ? 'live' : r.likely_outcome_assessment ? 'debriefed' : 'pending',
    outcome: r.outcome,
    final_terms: r.final_terms,
    overall_score: r.overall_score,
  }))

  if (all.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="label">History</p>
        <h1 className="mt-2 font-display text-5xl">Nothing on record yet</h1>
        <p className="mt-3 max-w-md text-muted">
          Every session you finish lands here with its debrief, so you can walk into the real conversation having already
          had it a few times.
        </p>
        <Link href="/setup" className="btn-primary mt-8">
          Set up your first session
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">History</p>
          <h1 className="mt-2 font-display text-5xl">Your track record</h1>
        </div>
        <Link href="/setup" className="btn-primary">
          New session
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line/70 bg-line/70 sm:grid-cols-4">
        <Stat label="Sessions" value={all.length.toString()} />
        <Stat label="Avg score" value={fmt(avg(debriefed.map((r) => r.overall_score as number)))} suffix="/10" />
        <Stat
          label="Deals closed"
          value={closed.length ? `${deals}/${closed.length}` : '–'}
          note={closed.length ? 'of finished sessions' : undefined}
        />
        <Stat
          label="Work on"
          value={skillAvgs.length > 1 ? SKILL_LABELS[skillAvgs[skillAvgs.length - 1].key] : '–'}
          note={skillAvgs.length > 1 ? `${fmt(skillAvgs[skillAvgs.length - 1].value)}/5 avg` : undefined}
        />
      </div>

      {full ? (
        debriefed.length > 0 && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section className="card p-5 sm:p-6">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-medium">Score trend</h2>
                <p className="text-xs text-faint">Last {trend.length}</p>
              </div>
              <div className="mt-5 flex h-24 items-end gap-1.5" role="img" aria-label="Recent scores, oldest first">
                {trend.map((t, i) => (
                  <Link
                    key={t.id}
                    href={`/practice/${t.id}`}
                    title={`${t.score}/10`}
                    className={`flex-1 origin-bottom rounded-t-md transition hover:opacity-80 ${
                      i === trend.length - 1 ? 'bg-primary' : 'bg-primary/35'
                    }`}
                    style={{ height: `${t.score * 10}%` }}
                  />
                ))}
              </div>
              {skillAvgs.length > 0 && (
                <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line/60 pt-4 text-sm">
                  {skillAvgs.map((s) => (
                    <div key={s.key} className="flex items-baseline justify-between">
                      <span className="text-muted">{SKILL_LABELS[s.key]}</span>
                      <span className="font-mono text-xs">{fmt(s.value)}/5</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="font-medium">Your go-to tactics</h2>
              {topTactics.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No named tactics spotted yet. Anchoring early is a good first one to try.</p>
              ) : (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {topTactics.map(([name, count]) => (
                    <li key={name} className="chip border-primary/40 bg-primary/10 py-1 text-primary">
                      {name}
                      <span className="text-primary/60">×{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-line p-6 text-center">
          <p className="text-sm text-muted">Score trends, skill averages and your tactic record are part of Pro.</p>
          <Link href="/settings" className="btn-ghost mt-4">
            See Pro
          </Link>
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-display text-3xl">Every session</h2>
        <div className="mt-4">
          <HistoryList items={items} />
        </div>
        {!full && all.length > FREE_HISTORY_LIMIT && (
          <p className="mt-4 text-sm text-muted">
            Showing your latest {FREE_HISTORY_LIMIT}. {all.length - FREE_HISTORY_LIMIT} older{' '}
            {all.length - FREE_HISTORY_LIMIT === 1 ? 'session is' : 'sessions are'} kept safe and unlock with{' '}
            <Link href="/settings" className="text-text underline decoration-line underline-offset-4">
              Pro
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, suffix, note }: { label: string; value: string; suffix?: string; note?: string }) {
  return (
    <div className="bg-surface p-4 sm:p-5">
      <p className="label">{label}</p>
      <p className="mt-2 font-display text-3xl leading-none">
        {value}
        {suffix && value !== '–' && <span className="text-sm text-faint">{suffix}</span>}
      </p>
      {note && <p className="mt-1.5 text-xs text-faint">{note}</p>}
    </div>
  )
}
