import { describe, expect, it, vi } from 'vitest'

// The analyser module creates an Anthropic client on import. Nothing here calls it.
vi.mock('@/lib/claude/client', () => ({ anthropic: {}, CLAUDE_MODEL: 'test' }))

const { normalizeAnalysis } = await import('@/lib/claude/negotiation-analyzer')

describe('normalizeAnalysis', () => {
  it('keeps a well formed debrief intact', () => {
    const result = normalizeAnalysis(
      {
        approach_strengths: ['Named the competing offer'],
        approach_weaknesses: ['Conceded twice without getting anything back'],
        tactics_used: [{ name: 'BATNA reference', turn: 2, quote: 'I have an offer at $6,600', note: 'Moved them.' }],
        counter_tactics: [{ name: 'Budget limit', quote: 'That is the top of the band', handled: 'poorly', note: 'You folded.' }],
        suggested_improvements: ['Trade, do not give.'],
        better_line: { turn: 1, original: 'Maybe 7k?', rewrite: "I'm looking at $7,200.", why: 'No hedging.' },
        skill_scores: { anchoring: 4, discovery: 2, concessions: 3, composure: 5 },
        overall_score: 7,
        value_left: 'About $300 a month.',
        likely_outcome_assessment: 'You would likely land near $6,600.',
        deal_numbers: { prefix: '$', suffix: '/month', walk_away: 6500, target: 7000, their_opening: 6200, final: 6600 },
      },
      3
    )

    expect(result.overall_score).toBe(7)
    expect(result.tactic_details[0]).toMatchObject({ name: 'BATNA reference', turn: 2 })
    expect(result.counter_tactics[0].handled).toBe('poorly')
    expect(result.better_line?.rewrite).toBe("I'm looking at $7,200.")
    expect(result.deal_numbers).toMatchObject({ walk_away: 6500, target: 7000, final: 6600 })
  })

  it('cleans up bad input instead of trusting it', () => {
    const result = normalizeAnalysis(
      {
        tactics_used: [{ name: 'Anchoring', turn: 9 }, { name: '' }],
        counter_tactics: [{ name: 'Flinch', handled: 'sort of' }],
        skill_scores: { anchoring: 11, discovery: 0 },
        overall_score: 'eleven',
        deal_numbers: { walk_away: '$3,450', target: null, final: 3400 },
      },
      2
    )

    expect(result.tactic_details).toEqual([{ name: 'Anchoring', turn: null, quote: '', note: '' }])
    expect(result.counter_tactics[0].handled).toBe('partly')
    expect(result.skill_scores.anchoring).toBe(5)
    expect(result.skill_scores.discovery).toBe(3)
    expect(result.overall_score).toBe(5)
    expect(result.better_line).toBeNull()
    // Without a target there is no range to draw.
    expect(result.deal_numbers).toBeNull()
  })

  it('parses numbers written as text', () => {
    const result = normalizeAnalysis({ deal_numbers: { walk_away: '$3,450', target: '3,300', final: null } }, 1)
    expect(result.deal_numbers).toMatchObject({ walk_away: 3450, target: 3300, final: null })
  })
})
