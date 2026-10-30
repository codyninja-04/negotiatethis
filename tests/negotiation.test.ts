import { describe, expect, it } from 'vitest'
import {
  OPENING_CUE,
  awaiting,
  formatAmount,
  isSessionFull,
  MAX_EXCHANGES,
  positionOnScale,
  toApiMessages,
  transcriptToText,
  turnNumbers,
} from '@/lib/negotiation'
import type { NegotiationMessage } from '@/lib/types'

const me = (content: string): NegotiationMessage => ({ role: 'user', content, at: '' })
const them = (content: string): NegotiationMessage => ({ role: 'assistant', content, at: '' })

describe('awaiting', () => {
  it('follows the opener on an empty transcript', () => {
    expect(awaiting([], 'me')).toBe('user')
    expect(awaiting([], 'them')).toBe('counterparty')
  })

  it('alternates after that', () => {
    expect(awaiting([them('Rent is going up.')], 'them')).toBe('user')
    expect(awaiting([me('Hi')], 'me')).toBe('counterparty')
  })
})

describe('toApiMessages', () => {
  it('adds the opening cue when the counterparty speaks first', () => {
    expect(toApiMessages([])).toEqual([{ role: 'user', content: OPENING_CUE }])
    expect(toApiMessages([them('Hello'), me('Hi')])[0]).toEqual({ role: 'user', content: OPENING_CUE })
  })

  it('leaves a user opened transcript alone', () => {
    expect(toApiMessages([me('Hi'), them('Hello')])).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
    ])
  })
})

describe('transcript helpers', () => {
  const messages = [them('Opening'), me('First'), them('Reply'), me('Second')]

  it('numbers only the user turns', () => {
    expect(turnNumbers(messages)).toEqual([null, 1, null, 2])
  })

  it('labels turns for the analyser', () => {
    const text = transcriptToText(messages)
    expect(text).toContain('[Counterparty]\nOpening')
    expect(text).toContain('[You, turn 2]\nSecond')
  })

  it('closes after the last reply of the final exchange', () => {
    const full: NegotiationMessage[] = []
    for (let i = 0; i < MAX_EXCHANGES; i++) full.push(me(`m${i}`), them(`r${i}`))
    expect(isSessionFull(full)).toBe(true)
    expect(isSessionFull(full.slice(0, -1))).toBe(false)
  })
})

describe('deal bar maths', () => {
  it('clamps positions to the bar', () => {
    expect(positionOnScale(50, 0, 100)).toBe(50)
    expect(positionOnScale(-10, 0, 100)).toBe(0)
    expect(positionOnScale(200, 0, 100)).toBe(100)
  })

  it('works when lower is better, like rent', () => {
    // Walk away at 3450 on the left, target 3300 on the right.
    expect(positionOnScale(3300, 3450, 3300)).toBe(100)
    expect(positionOnScale(3375, 3450, 3300)).toBe(50)
  })

  it('formats amounts with prefix and suffix', () => {
    expect(formatAmount(6800, '$', '/month')).toBe('$6,800/month')
    expect(formatAmount(45, '', 'days')).toBe('45 days')
    expect(formatAmount(3.5, '', '%')).toBe('3.5%')
  })
})
