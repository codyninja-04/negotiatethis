import type { NegotiationMessage, Outcome } from './types'

// One exchange is a message from you and a reply from them. Past this the
// session closes itself, which keeps the debrief focused on how you negotiated
// rather than on how long you held out.
export const MAX_EXCHANGES = 14
export const MAX_MESSAGE_LENGTH = 2000

// Sent to Claude, never stored, when the counterparty is the one who opens.
// The API needs the conversation to start with a user turn.
export const OPENING_CUE = '[The conversation starts now. You speak first. Open the way this person really would.]'

export const OUTCOMES: { id: Outcome; label: string; hint: string }[] = [
  { id: 'deal', label: 'We reached a deal', hint: 'You both agreed to terms.' },
  { id: 'no_deal', label: 'No deal', hint: 'You could not find terms that worked.' },
  { id: 'walked_away', label: 'I walked away', hint: 'You chose to leave the table.' },
  { id: 'paused', label: 'Paused for now', hint: 'Left open, to pick up later.' },
]

export function outcomeLabel(outcome: Outcome | null): string {
  switch (outcome) {
    case 'deal':
      return 'Deal'
    case 'no_deal':
      return 'No deal'
    case 'walked_away':
      return 'Walked away'
    case 'paused':
      return 'Paused'
    default:
      return 'Unfinished'
  }
}

export function isOutcome(v: unknown): v is Outcome {
  return typeof v === 'string' && OUTCOMES.some((o) => o.id === v)
}

export function userTurnCount(messages: NegotiationMessage[]): number {
  return messages.filter((m) => m.role === 'user').length
}

export function isSessionFull(messages: NegotiationMessage[]): boolean {
  const last = messages[messages.length - 1]
  return userTurnCount(messages) >= MAX_EXCHANGES && last?.role === 'assistant'
}

// Whose move it is. With an empty transcript that depends on who opens.
export function awaiting(messages: NegotiationMessage[], opener: 'me' | 'them'): 'user' | 'counterparty' {
  const last = messages[messages.length - 1]
  if (!last) return opener === 'them' ? 'counterparty' : 'user'
  return last.role === 'assistant' ? 'user' : 'counterparty'
}

// What actually goes to Claude: the stored transcript, with the opening cue in
// front when the counterparty spoke first.
export function toApiMessages(messages: NegotiationMessage[]): { role: 'user' | 'assistant'; content: string }[] {
  const mapped = messages.map((m) => ({ role: m.role, content: m.content }))
  if (mapped.length === 0 || mapped[0].role === 'assistant') {
    return [{ role: 'user', content: OPENING_CUE }, ...mapped]
  }
  return mapped
}

// Labels every user message with its turn number so the debrief can point back
// at a specific moment, and the UI can highlight that same moment.
export function transcriptToText(messages: NegotiationMessage[]): string {
  let turn = 0
  return messages
    .map((m) => {
      if (m.role === 'user') {
        turn += 1
        return `[You, turn ${turn}]\n${m.content}`
      }
      return `[Counterparty]\n${m.content}`
    })
    .join('\n\n')
}

// Maps each message index to the user's turn number, or null for their turns.
export function turnNumbers(messages: NegotiationMessage[]): (number | null)[] {
  let turn = 0
  return messages.map((m) => (m.role === 'user' ? ++turn : null))
}

export function wordCount(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

// Where a number sits between two others, clamped to the bar. Used to place the
// final deal and their opening on the deal zone bar.
export function positionOnScale(value: number, min: number, max: number): number {
  if (max === min) return 50
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

export function formatAmount(value: number, prefix = '', suffix = ''): string {
  const n = value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  const tail = suffix.trim()
  return `${prefix.trim()}${n}${tail ? (/^[%/]/.test(tail) ? tail : ` ${tail}`) : ''}`
}
