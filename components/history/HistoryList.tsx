'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { OutcomeChip } from '@/components/practice/OutcomeChip'
import { SCENARIOS, getScenario } from '@/lib/scenarios'
import type { Outcome, ScenarioType } from '@/lib/types'

export interface HistoryItem {
  id: string
  created_at: string
  scenario_type: ScenarioType
  situation: string
  target: string | null
  turns: number
  status: 'live' | 'debriefed' | 'pending'
  outcome: Outcome | null
  final_terms: string | null
  overall_score: number | null
}

export function HistoryList({ items }: { items: HistoryItem[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<ScenarioType | 'all'>('all')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [armed, setArmed] = useState<string | null>(null)

  const present = new Set(items.map((i) => i.scenario_type))
  const shown = filter === 'all' ? items : items.filter((i) => i.scenario_type === filter)

  async function remove(id: string) {
    setDeleting(id)
    const res = await fetch(`/api/negotiations/${id}`, { method: 'DELETE' })
    setDeleting(null)
    setArmed(null)
    if (res.ok) router.refresh()
  }

  return (
    <div>
      {present.size > 1 && (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by scenario">
          {[{ id: 'all' as const, label: 'All' }, ...SCENARIOS.filter((s) => present.has(s.id))].map((s) => (
            <button
              key={s.id}
              onClick={() => setFilter(s.id)}
              aria-pressed={filter === s.id}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${
                filter === s.id ? 'bg-raised text-text' : 'text-muted hover:text-text'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <ul className="mt-4 divide-y divide-line/60 border-y border-line/60">
        {shown.map((item) => (
          <li key={item.id} className="group relative flex items-center gap-4 py-4">
            <div className="w-12 shrink-0 text-center">
              {item.overall_score !== null ? (
                <p className="font-display text-3xl leading-none">{item.overall_score}</p>
              ) : (
                <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  {item.status === 'live' ? 'Live' : 'n/a'}
                </p>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/practice/${item.id}`}
                className="line-clamp-1 font-medium after:absolute after:inset-0 hover:underline hover:decoration-line hover:underline-offset-4"
              >
                {item.situation}
              </Link>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-faint">
                <span className="text-muted">{getScenario(item.scenario_type).label}</span>
                {item.status === 'live' ? (
                  <span className="chip border-primary/40 text-primary">In progress</span>
                ) : (
                  <OutcomeChip outcome={item.outcome} />
                )}
                {item.final_terms && <span className="line-clamp-1 max-w-[16rem]">{item.final_terms}</span>}
                {!item.final_terms && item.target && <span className="line-clamp-1 max-w-[16rem]">Target {item.target}</span>}
                <span>
                  {item.turns} {item.turns === 1 ? 'exchange' : 'exchanges'}
                </span>
                <span>{new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              </p>
            </div>
            <div className="relative z-10 shrink-0">
              {armed === item.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => remove(item.id)}
                    disabled={deleting === item.id}
                    className="rounded-lg bg-weakness/15 px-2.5 py-1 text-xs text-weakness hover:bg-weakness/25"
                  >
                    {deleting === item.id ? 'Deleting…' : 'Delete'}
                  </button>
                  <button onClick={() => setArmed(null)} className="rounded-lg px-2 py-1 text-xs text-muted hover:text-text">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setArmed(item.id)}
                  className="rounded-lg px-2 py-1 text-xs text-faint opacity-100 transition hover:text-weakness sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  aria-label="Delete this session"
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
