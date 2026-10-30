'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { SCENARIOS, STANCES, TEMPLATES, getScenario } from '@/lib/scenarios'
import type { Opener, ScenarioType, Stance } from '@/lib/types'

interface Props {
  // Null when limits are off or the user is on Pro.
  remaining: number | null
  templatesUnlocked: boolean
}

const MIN_SITUATION = 20

export function ScenarioForm({ remaining, templatesUnlocked }: Props) {
  const router = useRouter()
  const [type, setType] = useState<ScenarioType>('salary')
  const [situation, setSituation] = useState('')
  const [target, setTarget] = useState('')
  const [walkAway, setWalkAway] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [stance, setStance] = useState<Stance>('realistic')
  const [opener, setOpener] = useState<Opener>('me')
  const [openerTouched, setOpenerTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scenario = getScenario(type)
  const hasNumber = /\d/.test(situation)
  const outOfSessions = remaining === 0

  function pickType(next: ScenarioType) {
    setType(next)
    // Follow the usual opener for the scenario until the user picks one themselves.
    if (!openerTouched) setOpener(getScenario(next).defaultOpener)
  }

  function loadTemplate() {
    const t = TEMPLATES.find((tpl) => tpl.scenario_type === type)
    if (!t) return
    setSituation(t.situation_description)
    setTarget(t.my_target)
    setWalkAway(t.my_walk_away_point)
    setCounterparty(t.counterparty_context)
    setOpener(t.opener)
    setError(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (situation.trim().length < MIN_SITUATION) {
      setError('Tell us a bit more about the situation. Real numbers and context make the practice useful.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/negotiations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_type: type,
          situation_description: situation,
          my_target: target,
          my_walk_away_point: walkAway,
          counterparty_context: counterparty,
          stance,
          opener,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string }
      if (!res.ok || !data.id) throw new Error(data.error || 'Could not start the session.')
      router.push(`/practice/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the session.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      {/* 1. Scenario */}
      <fieldset>
        <legend className="flex w-full items-baseline justify-between gap-3">
          <Step n={1} title="What are you negotiating?" />
        </legend>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Scenario type">
          {SCENARIOS.map((s) => {
            const active = s.id === type
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => pickType(s.id)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                  active
                    ? 'border-primary/60 bg-primary/15 text-text'
                    : 'border-line bg-surface/40 text-muted hover:border-faint hover:text-text'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* 2. Situation */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <Step n={2} title="Describe your situation" htmlFor="situation" />
          {templatesUnlocked ? (
            <button type="button" onClick={loadTemplate} className="text-xs text-primary hover:text-primary/80">
              Fill in a {scenario.label.toLowerCase()} example
            </button>
          ) : (
            <span className="text-xs text-faint">Scenario templates are part of Pro</span>
          )}
        </div>
        <textarea
          id="situation"
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder={scenario.situationHint}
          className="input mt-3 resize-y leading-relaxed"
        />
        <p className={`mt-1.5 text-xs ${situation && !hasNumber ? 'text-them' : 'text-faint'}`}>
          {situation && !hasNumber
            ? 'Add the real numbers if you have them. The counterparty reacts to specifics.'
            : 'The more real it is, the more useful the practice. Numbers, history, what you know about them.'}
        </p>
      </div>

      {/* 3. Your numbers */}
      <div>
        <Step n={3} title="Your numbers" />
        <p className="mt-1 text-xs text-faint">
          Private to you. The counterparty never sees these, so they have to find your limits the hard way.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="target" className="label">
              Your target
            </label>
            <input
              id="target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              maxLength={200}
              placeholder={scenario.targetHint}
              className="input mt-2"
            />
          </div>
          <div>
            <label htmlFor="walkaway" className="label">
              Your walk-away point
            </label>
            <input
              id="walkaway"
              value={walkAway}
              onChange={(e) => setWalkAway(e.target.value)}
              maxLength={200}
              placeholder={scenario.walkAwayHint}
              className="input mt-2"
            />
          </div>
        </div>
      </div>

      {/* 4. Counterparty */}
      <div>
        <Step n={4} title="Who is across the table?" htmlFor="counterparty" />
        <textarea
          id="counterparty"
          value={counterparty}
          onChange={(e) => setCounterparty(e.target.value)}
          rows={3}
          maxLength={1200}
          placeholder={scenario.counterpartyHint}
          className="input mt-3 resize-y leading-relaxed"
        />
        <p className="mt-1.5 text-xs text-faint">
          Their likely position, pressures and constraints. Leave it blank and Claude will play a typical{' '}
          {scenario.counterpartyRole.replace(/^the /, '')}.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="label">How hard do they push?</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Counterparty stance">
              {STANCES.map((s, i) => {
                const active = s.id === stance
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setStance(s.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      active ? 'border-them/60 bg-them/[0.08]' : 'border-line bg-surface/40 hover:border-faint'
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-sm font-medium">{s.label}</span>
                      <PressureBars level={i + 1} active={active} />
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted">{s.blurb}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="label">Who speaks first?</p>
            <div className="mt-2 inline-flex rounded-xl border border-line bg-surface/40 p-1" role="radiogroup" aria-label="Who opens">
              {(['me', 'them'] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={opener === o}
                  onClick={() => {
                    setOpener(o)
                    setOpenerTouched(true)
                  }}
                  className={`rounded-lg px-3.5 py-2 text-sm transition ${
                    opener === o ? 'bg-raised text-text' : 'text-muted hover:text-text'
                  }`}
                >
                  {o === 'me' ? 'I open' : 'They open'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-faint">
          {remaining === null
            ? 'Practice only. Nothing here is legal or financial advice.'
            : `${remaining} free ${remaining === 1 ? 'session' : 'sessions'} left this month.`}
        </p>
        <button type="submit" disabled={submitting || outOfSessions} className="btn-primary px-5 py-3">
          {submitting ? 'Setting the table…' : 'Start practice negotiation'}
        </button>
      </div>

      {(error || outOfSessions) && (
        <p role="alert" className="-mt-4 text-sm text-weakness">
          {error ?? "You've used this month's free sessions. Pro gives you unlimited practice."}
        </p>
      )}
    </form>
  )
}

function Step({ n, title, htmlFor }: { n: number; title: string; htmlFor?: string }) {
  const Tag = htmlFor ? 'label' : 'span'
  return (
    <Tag htmlFor={htmlFor} className="flex items-baseline gap-3">
      <span className="font-mono text-xs text-faint">0{n}</span>
      <span className="font-display text-2xl leading-none">{title}</span>
    </Tag>
  )
}

export function PressureBars({ level, active = true }: { level: number; active?: boolean }) {
  return (
    <span className="flex items-end gap-0.5" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-1 rounded-sm ${i <= level ? (active ? 'bg-them' : 'bg-muted') : 'bg-line'}`}
          style={{ height: `${4 + i * 3}px` }}
        />
      ))}
    </span>
  )
}
