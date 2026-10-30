'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PressureBars } from '@/components/setup/ScenarioForm'
import {
  MAX_EXCHANGES,
  MAX_MESSAGE_LENGTH,
  OUTCOMES,
  awaiting,
  isSessionFull,
  outcomeLabel,
  userTurnCount,
  wordCount,
} from '@/lib/negotiation'
import { STANCES, getScenario, getStance } from '@/lib/scenarios'
import type { NegotiationMessage, NegotiationSession, Outcome } from '@/lib/types'
import { OutcomeAnalysis } from './OutcomeAnalysis'
import { OutcomeChip } from './OutcomeChip'
import { Transcript, Turn } from './Transcript'

type Status = 'idle' | 'streaming' | 'analyzing'

const ERROR_MARK = '[[error]]'
const LONG_MESSAGE_WORDS = 150

export function NegotiationChat({ initial }: { initial: NegotiationSession }) {
  const [session, setSession] = useState(initial)
  const [streaming, setStreaming] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ending, setEnding] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const openingRequested = useRef(false)

  const messages = session.messages
  const turns = userTurnCount(messages)
  const ended = Boolean(session.ended_at)
  const full = isSessionFull(messages)
  const scenario = getScenario(session.scenario_type)
  const stance = getStance(session.stance)
  const theirMove = awaiting(messages, session.opener) === 'counterparty'

  // Follow the conversation, unless the user has scrolled up to reread something.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 240
    if (nearBottom || streaming === '') el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length, streaming])

  // Grow the box with the message, up to a point.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [draft])

  // Streams the counterparty's next line. With content it is a reply to the
  // user, without it the counterparty is opening the conversation.
  const exchange = useCallback(
    async (content: string | null) => {
      const base = session.messages
      const optimistic: NegotiationMessage[] = content
        ? [...base, { role: 'user', content, at: new Date().toISOString() }]
        : base
      setError(null)
      setStatus('streaming')
      setStreaming('')
      setSession((s) => ({ ...s, messages: optimistic }))

      const fail = (message: string) => {
        setSession((s) => ({ ...s, messages: base }))
        if (content) setDraft(content)
        setStreaming(null)
        setStatus('idle')
        setError(message)
      }

      try {
        const res = await fetch(`/api/negotiations/${session.id}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(content ? { content } : {}),
        })
        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          return fail(data.error || 'They went quiet. Try again.')
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let text = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          text += decoder.decode(value, { stream: true })
          setStreaming(text.replace(ERROR_MARK, ''))
        }

        if (text.includes(ERROR_MARK) || !text.trim()) {
          return fail(
            content
              ? 'The reply got lost on the way. Your message is back in the box, send it again.'
              : 'They could not open the conversation. Try again.'
          )
        }

        setSession((s) => ({
          ...s,
          messages: [...optimistic, { role: 'assistant', content: text.trim(), at: new Date().toISOString() }],
        }))
        setStreaming(null)
        setStatus('idle')
        requestAnimationFrame(() => inputRef.current?.focus())
      } catch {
        fail('Connection dropped. Check your internet and try again.')
      }
    },
    [session.id, session.messages]
  )

  // When the counterparty opens, ask for their first line as soon as the page loads.
  useEffect(() => {
    if (ended || openingRequested.current) return
    if (session.messages.length === 0 && session.opener === 'them') {
      openingRequested.current = true
      exchange(null)
    }
  }, [ended, exchange, session.messages.length, session.opener])

  function send() {
    const content = draft.trim()
    if (!content || status !== 'idle' || full || ended || theirMove) return
    setDraft('')
    exchange(content)
  }

  async function analyze(outcome?: Outcome, finalTerms?: string) {
    setEnding(false)
    setStatus('analyzing')
    setError(null)
    try {
      const res = await fetch(`/api/negotiations/${session.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, final_terms: finalTerms }),
      })
      const data = (await res.json().catch(() => ({}))) as { session?: NegotiationSession; error?: string }
      if (data.session) setSession(data.session)
      if (!res.ok) {
        setSession((s) => ({
          ...s,
          ended_at: s.ended_at ?? new Date().toISOString(),
          outcome: s.outcome ?? outcome ?? 'paused',
        }))
        throw new Error(data.error || 'Could not write the debrief.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not write the debrief.')
    } finally {
      setStatus('idle')
    }
  }

  // ---- Finished session: debrief first, transcript underneath -----------------

  if (ended || status === 'analyzing') {
    const marks = {
      betterLine: session.better_line?.turn ?? null,
      tacticTurns: (session.tactic_details ?? []).map((t) => t.turn).filter((t): t is number => t !== null),
    }

    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <SessionHeader session={session} turns={turns} />

        <div className="mt-8">
          {status === 'analyzing' ? (
            <Analyzing />
          ) : session.likely_outcome_assessment ? (
            <OutcomeAnalysis session={session} />
          ) : turns === 0 ? (
            <div className="card p-8 text-center">
              <p className="font-display text-3xl">Ended before you said anything</p>
              <p className="mt-2 text-sm text-muted">Nothing to debrief yet. Set it up again when you are ready.</p>
              <Link href="/setup" className="btn-primary mt-6">
                New session
              </Link>
            </div>
          ) : (
            <div className="card p-8 text-center">
              <p className="font-display text-3xl">The debrief isn&apos;t ready</p>
              <p className="mt-2 text-sm text-muted">{error ?? 'This session has not been analysed yet.'}</p>
              <button onClick={() => analyze()} className="btn-primary mt-6">
                Write my debrief
              </button>
            </div>
          )}
        </div>

        {messages.length > 0 && status !== 'analyzing' && (
          <section className="mt-12">
            <div className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-3">
              <h2 className="font-display text-3xl">The conversation</h2>
              <span className="font-mono text-xs text-faint">
                {turns} {turns === 1 ? 'exchange' : 'exchanges'}
              </span>
            </div>
            <div className="mt-6">
              <Transcript messages={messages} counterpartyLabel={scenario.themLabel} marks={marks} />
            </div>
          </section>
        )}
      </div>
    )
  }

  // ---- Live session -----------------------------------------------------------

  const words = wordCount(draft)
  const busy = status !== 'idle'
  const stanceLevel = STANCES.findIndex((s) => s.id === stance.id) + 1

  return (
    <div className="mx-auto grid h-[calc(100dvh-3.5rem)] max-w-6xl grid-rows-[auto_1fr] gap-x-10 px-4 sm:px-6 lg:grid-cols-[290px_1fr] lg:grid-rows-1">
      {/* Brief: a sidebar on desktop, a compact header on mobile */}
      <aside className="shrink-0 border-b border-line/60 py-4 lg:flex lg:h-full lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-8 lg:pr-8">
        <Link href="/history" className="hidden text-xs text-faint hover:text-muted lg:inline">
          ← History
        </Link>
        <p className="label lg:mt-6">{scenario.label}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text/85 lg:line-clamp-6">
          {session.situation_description}
        </p>

        <details className="group mt-3 lg:hidden">
          <summary className="cursor-pointer list-none text-xs text-muted">
            <span className="inline-block transition group-open:rotate-90">›</span> Your numbers
          </summary>
          <Numbers session={session} />
        </details>

        <div className="mt-6 hidden lg:block">
          <p className="label">Your numbers · only you see these</p>
          <Numbers session={session} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 lg:mt-8 lg:block">
          <div className="flex items-center gap-4 lg:block">
            <p className="flex items-center gap-2 text-sm">
              <PressureBars level={stanceLevel} />
              <span className="text-muted">
                {stance.label} {scenario.themLabel.toLowerCase()}
              </span>
            </p>
            <div className="lg:mt-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                Exchange {Math.min(turns + (full ? 0 : 1), MAX_EXCHANGES)} of {MAX_EXCHANGES}
              </p>
              <div className="mt-2 hidden gap-1 lg:flex" aria-hidden>
                {Array.from({ length: MAX_EXCHANGES }, (_, i) => (
                  <span key={i} className={`h-1 flex-1 rounded-full ${i < turns ? 'bg-primary' : 'bg-line/70'}`} />
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setEnding(true)}
            disabled={busy}
            className="btn-ghost px-3 py-2 text-xs lg:mt-8 lg:w-full"
          >
            End negotiation
          </button>
        </div>

        <p className="mt-auto hidden pt-8 text-xs leading-relaxed text-faint lg:block">
          They stay in character until you end it. Say what you would really say, including walking away.
        </p>
      </aside>

      {/* Conversation */}
      <section className="flex min-h-0 flex-col">
        <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto pb-6 pr-1 pt-6 lg:pt-8" aria-live="polite">
          {messages.length === 0 && streaming === null && session.opener === 'me' && <OpeningPrompt />}
          <Transcript messages={messages} counterpartyLabel={scenario.themLabel} />
          {streaming !== null &&
            (streaming.trim() ? (
              <Turn
                message={{ role: 'assistant', content: streaming, at: '' }}
                turn={null}
                counterpartyLabel={scenario.themLabel}
                streaming
              />
            ) : (
              <Thinking label={scenario.themLabel} />
            ))}
          {full && !busy && (
            <div className="animate-rise-in rounded-2xl border border-primary/30 bg-primary/[0.06] p-6 text-center">
              <p className="font-display text-3xl">Time to step away from the table</p>
              <p className="mt-1 text-sm text-muted">
                {MAX_EXCHANGES} exchanges in. Tell us how it ended and get your debrief.
              </p>
              <button onClick={() => setEnding(true)} className="btn-primary mt-4">
                End and debrief
              </button>
            </div>
          )}
          {!busy && theirMove && messages.length === 0 && error && (
            <div className="text-center">
              <button onClick={() => exchange(null)} className="btn-ghost">
                Ask them to open again
              </button>
            </div>
          )}
        </div>

        {!full && (
          <div className="shrink-0 border-t border-line/60 bg-background pb-4 pt-3">
            {error && (
              <p role="alert" className="mb-2 text-sm text-weakness">
                {error}
              </p>
            )}
            <div className="rounded-2xl border border-line bg-surface/60 transition focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
              <label htmlFor="line" className="sr-only">
                What you say
              </label>
              <textarea
                id="line"
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    send()
                  }
                }}
                rows={2}
                maxLength={MAX_MESSAGE_LENGTH}
                disabled={busy || theirMove}
                autoFocus={messages.length === 0 && session.opener === 'me'}
                placeholder={
                  status === 'streaming' || theirMove
                    ? `${scenario.themLabel} is talking…`
                    : turns === 0
                      ? 'Open the way you would in the real conversation.'
                      : 'Your reply. Ask, counter, hold, or walk.'
                }
                className="block min-h-[64px] w-full resize-none bg-transparent px-4 pt-3 text-[15px] leading-relaxed text-text outline-none placeholder:text-faint disabled:opacity-60"
              />
              <div className="flex items-center justify-between gap-3 px-3 pb-2.5">
                <span className={`font-mono text-[11px] ${words > LONG_MESSAGE_WORDS ? 'text-them' : 'text-faint'}`}>
                  {words > LONG_MESSAGE_WORDS
                    ? `${words} words. Over explaining reads as nerves.`
                    : words > 0
                      ? `${words} words`
                      : 'Enter to send · Shift + Enter for a new line'}
                </span>
                <button onClick={send} disabled={!draft.trim() || busy || theirMove} className="btn-primary px-4 py-1.5">
                  Say it
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {ending && (
        <EndDialog turns={turns} onCancel={() => setEnding(false)} onConfirm={(o, t) => analyze(o, t)} />
      )}
    </div>
  )
}

function Numbers({ session }: { session: NegotiationSession }) {
  return (
    <dl className="mt-2 space-y-2 text-sm">
      <div className="flex items-baseline justify-between gap-3 rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2">
        <dt className="text-xs text-muted">Target</dt>
        <dd className="text-right font-medium">{session.my_target || 'Not set'}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-3 rounded-lg border border-line px-3 py-2">
        <dt className="text-xs text-muted">Walk away</dt>
        <dd className="text-right font-medium">{session.my_walk_away_point || 'Not set'}</dd>
      </div>
    </dl>
  )
}

function EndDialog({
  turns,
  onCancel,
  onConfirm,
}: {
  turns: number
  onCancel: () => void
  onConfirm: (outcome: Outcome, finalTerms: string) => void
}) {
  const [outcome, setOutcome] = useState<Outcome>('deal')
  const [terms, setTerms] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 grid animate-fade-in place-items-end bg-black/60 p-4 backdrop-blur-sm sm:place-items-center"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="end-title"
        className="card w-full max-w-md animate-rise-in bg-surface p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="end-title" className="font-display text-3xl">
          How did it end?
        </h2>
        <p className="mt-1 text-sm text-muted">
          {turns === 0
            ? 'You have not said anything yet, so there will be nothing to debrief.'
            : 'Your debrief takes the outcome into account.'}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Outcome">
          {OUTCOMES.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={outcome === o.id}
              onClick={() => setOutcome(o.id)}
              className={`rounded-xl border p-3 text-left transition ${
                outcome === o.id ? 'border-primary/60 bg-primary/10' : 'border-line hover:border-faint'
              }`}
            >
              <span className="block text-sm font-medium">{outcomeLabel(o.id)}</span>
              <span className="mt-0.5 block text-xs text-muted">{o.hint}</span>
            </button>
          ))}
        </div>

        <label htmlFor="terms" className="label mt-5 block">
          {outcome === 'deal' ? 'What did you agree?' : 'Last offer on the table'} <span className="normal-case">(optional)</span>
        </label>
        <input
          id="terms"
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          maxLength={300}
          placeholder={outcome === 'deal' ? 'e.g. $3,350 on a 2 year lease' : 'e.g. They would not go below $3,500'}
          className="input mt-2"
        />

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost">
            Keep negotiating
          </button>
          <button onClick={() => onConfirm(outcome, terms)} className="btn-primary">
            {turns === 0 ? 'End session' : 'End and debrief'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SessionHeader({ session, turns }: { session: NegotiationSession; turns: number }) {
  const scenario = getScenario(session.scenario_type)
  const stance = getStance(session.stance)
  const date = new Date(session.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <div>
      <Link href="/history" className="text-xs text-faint hover:text-muted">
        ← History
      </Link>
      <p className="label mt-4">{scenario.label} negotiation</p>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-text/85">{session.situation_description}</p>
      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
        <OutcomeChip outcome={session.outcome} />
        {session.final_terms && <span className="text-muted">{session.final_terms}</span>}
        <span>·</span>
        <span>
          {stance.label} {scenario.themLabel.toLowerCase()}
        </span>
        <span>·</span>
        <span>
          {turns} {turns === 1 ? 'exchange' : 'exchanges'}
        </span>
        <span>·</span>
        <span>{date}</span>
      </p>
    </div>
  )
}

function OpeningPrompt() {
  return (
    <div className="animate-fade-in rounded-2xl border border-dashed border-line/80 p-6 sm:p-8">
      <p className="label">You open</p>
      <p className="mt-3 font-display text-3xl leading-snug">The first number on the table tends to stick.</p>
      <ul className="mt-4 space-y-2 text-sm text-muted">
        <li>Open the way you would in real life, greeting and all.</li>
        <li>If you name a number, anchor near your target, not your walk-away.</li>
        <li>Asking a question before you name anything is a perfectly good opening too.</li>
      </ul>
    </div>
  )
}

function Thinking({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 border-l-2 border-them/40 pl-4 text-sm text-faint">
      <span className="flex gap-1" aria-hidden>
        {[0, 150, 300].map((d) => (
          <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-them/70" style={{ animationDelay: `${d}ms` }} />
        ))}
      </span>
      {label} is thinking it over
    </div>
  )
}

function Analyzing() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="card grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
        <div className="skeleton mx-auto h-28 w-28 rounded-full sm:mx-0" />
        <div className="space-y-3">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-6 w-full" />
          <div className="skeleton h-6 w-4/5" />
        </div>
      </div>
      <div className="card space-y-3 p-6">
        <div className="skeleton h-3 w-1/4" />
        <div className="skeleton h-3 w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card space-y-3 p-6">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-5 w-full" />
            <div className="skeleton h-3 w-4/5" />
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-faint">
        Going back through every exchange for anchors, concessions and value left on the table. Usually 10 to 20 seconds.
      </p>
    </div>
  )
}
