import { turnNumbers } from '@/lib/negotiation'
import type { NegotiationMessage } from '@/lib/types'

export interface TurnMarks {
  betterLine?: number | null
  tacticTurns?: number[]
}

export function Transcript({
  messages,
  counterpartyLabel,
  marks,
}: {
  messages: NegotiationMessage[]
  counterpartyLabel: string
  marks?: TurnMarks
}) {
  const turns = turnNumbers(messages)
  return (
    <div className="space-y-6">
      {messages.map((m, i) => (
        <Turn
          key={`${i}-${m.at}`}
          message={m}
          turn={turns[i]}
          counterpartyLabel={counterpartyLabel}
          highlight={
            turns[i] !== null && marks?.betterLine === turns[i]
              ? 'rewrite'
              : turns[i] !== null && marks?.tacticTurns?.includes(turns[i] as number)
                ? 'tactic'
                : undefined
          }
        />
      ))}
    </div>
  )
}

export function Turn({
  message,
  turn,
  counterpartyLabel,
  streaming = false,
  highlight,
}: {
  message: NegotiationMessage
  turn: number | null
  counterpartyLabel: string
  streaming?: boolean
  highlight?: 'rewrite' | 'tactic'
}) {
  const mine = message.role === 'user'
  return (
    <div
      id={turn ? `turn-${turn}` : undefined}
      className={`animate-rise-in scroll-mt-24 border-l-2 pl-4 ${mine ? 'border-text/70' : 'border-them'} ${
        highlight === 'rewrite' ? 'rounded-r-xl bg-weakness/[0.06] py-2' : highlight === 'tactic' ? 'rounded-r-xl bg-strength/[0.05] py-2' : ''
      }`}
    >
      <p className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider ${mine ? 'text-muted' : 'text-them'}`}>
        {mine ? `You · ${turn}` : counterpartyLabel}
        {highlight === 'rewrite' && <span className="chip border-weakness/40 text-weakness">Worth rewording</span>}
        {highlight === 'tactic' && <span className="chip border-strength/40 text-strength">Tactic used</span>}
      </p>
      <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-text/90">
        {message.content}
        {streaming && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-them" aria-hidden />}
      </p>
    </div>
  )
}
