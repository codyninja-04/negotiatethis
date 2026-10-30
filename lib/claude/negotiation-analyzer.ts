import type Anthropic from '@anthropic-ai/sdk'
import { outcomeLabel, transcriptToText, userTurnCount } from '@/lib/negotiation'
import { getScenario, getStance } from '@/lib/scenarios'
import type {
  BetterLine,
  CounterTactic,
  DealNumbers,
  NegotiationSession,
  SkillScores,
  TacticUsed,
} from '@/lib/types'
import { anthropic, CLAUDE_MODEL } from './client'

export interface NegotiationAnalysis {
  approach_strengths: string[]
  approach_weaknesses: string[]
  tactic_details: TacticUsed[]
  counter_tactics: CounterTactic[]
  suggested_improvements: string[]
  likely_outcome_assessment: string
  overall_score: number
  skill_scores: SkillScores
  value_left: string
  better_line: BetterLine | null
  deal_numbers: DealNumbers | null
}

const nullableNumber = (description: string) => ({ type: ['number', 'null'], description })

const ANALYSIS_TOOL: Anthropic.Tool = {
  name: 'submit_negotiation_debrief',
  description: "Submit the debrief of the user's negotiation approach from the practice session.",
  input_schema: {
    type: 'object',
    properties: {
      approach_strengths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Two to four specific things they did well, each tied to something they actually said.',
      },
      approach_weaknesses: {
        type: 'array',
        items: { type: 'string' },
        description: 'Two to four specific weaknesses, each tied to something they actually said or failed to do.',
      },
      tactics_used: {
        type: 'array',
        description:
          'Named negotiation tactics they used, even if they did not know the name. Only ones that clearly happened.',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'Standard name, e.g. Anchoring, Labelling, Mirroring, Bracketing, Silence, Walk away signal, Trading concessions, Calibrated question, Appeal to market data, BATNA reference, Nibble, Splitting the difference.',
            },
            turn: { type: 'integer', description: 'Which of their turns, using the [You, turn N] labels.' },
            quote: { type: 'string', description: 'Their exact words, or a short excerpt.' },
            note: { type: 'string', description: 'One sentence on whether it helped them and why.' },
          },
          required: ['name', 'turn', 'quote', 'note'],
        },
      },
      counter_tactics: {
        type: 'array',
        description: 'Tactics the counterparty used on them, and how well they handled each one.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            quote: { type: 'string', description: "The counterparty's words, short excerpt." },
            handled: { type: 'string', enum: ['well', 'partly', 'poorly'] },
            note: { type: 'string', description: 'One sentence on how they responded and what would have worked.' },
          },
          required: ['name', 'quote', 'handled', 'note'],
        },
      },
      suggested_improvements: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Three to five concrete things to do differently in the real conversation. Phrase them as actions, ideally with example wording.',
      },
      better_line: {
        type: 'object',
        description: 'The single message of theirs that most needed to be different, rewritten.',
        properties: {
          turn: { type: 'integer' },
          original: { type: 'string', description: 'What they said, quoted or tightly trimmed.' },
          rewrite: { type: 'string', description: 'What they could have said instead, in their voice, ready to use.' },
          why: { type: 'string', description: 'One sentence on why the rewrite works better.' },
        },
        required: ['turn', 'original', 'rewrite', 'why'],
      },
      skill_scores: {
        type: 'object',
        description: 'Each scored 1 to 5. 3 means competent, 5 means a skilled professional negotiator.',
        properties: {
          anchoring: { type: 'integer', minimum: 1, maximum: 5, description: 'Did they set or reset the anchor well?' },
          discovery: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
            description: "Did they ask questions to learn the other side's constraints?",
          },
          concessions: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
            description: 'Did they concede slowly, in small steps, and get something back each time?',
          },
          composure: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
            description: 'Did they stay calm and firm under pressure, without over explaining?',
          },
        },
        required: ['anchoring', 'discovery', 'concessions', 'composure'],
      },
      overall_score: { type: 'integer', minimum: 1, maximum: 10, description: 'Overall quality of their negotiating.' },
      value_left: {
        type: 'string',
        description:
          'One or two sentences on what value, if any, they left on the table, with numbers when possible. Say plainly if they left nothing.',
      },
      likely_outcome_assessment: {
        type: 'string',
        description:
          'Two or three honest sentences, in second person, on how this approach would likely go in the real conversation.',
      },
      deal_numbers: {
        type: 'object',
        description:
          'The key numbers, on one shared scale, so they can be drawn on a bar. Use null for any you cannot pin down. If the negotiation is not really about one number, set every number to null.',
        properties: {
          prefix: { type: 'string', description: 'Text before the number, like "$" or "S$". Empty if none.' },
          suffix: { type: 'string', description: 'Text after the number, like "/month", "%" or "days". Empty if none.' },
          walk_away: nullableNumber('Their stated walk-away point.'),
          target: nullableNumber('Their stated target.'),
          their_opening: nullableNumber("The counterparty's first concrete offer."),
          final: nullableNumber('Where it ended up: the agreed figure, or the last offer on the table.'),
        },
        required: ['prefix', 'suffix', 'walk_away', 'target', 'their_opening', 'final'],
      },
    },
    required: [
      'approach_strengths',
      'approach_weaknesses',
      'tactics_used',
      'counter_tactics',
      'suggested_improvements',
      'better_line',
      'skill_scores',
      'overall_score',
      'value_left',
      'likely_outcome_assessment',
      'deal_numbers',
    ],
  },
}

export async function analyzeNegotiation(session: NegotiationSession): Promise<NegotiationAnalysis> {
  const turns = userTurnCount(session.messages)
  const scenario = getScenario(session.scenario_type)
  const stance = getStance(session.stance)

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2500,
    system: `You debrief someone's negotiation approach from a practice session transcript. They are preparing for a real conversation with real stakes, so be specific and honest. Flattery costs them money.

Judge only the turns labelled [You, turn N]. The counterparty's turns are context: use them to judge whether the person answered what was put to them, spotted the tactics used on them, and moved for good reasons.

Look for: anchoring effectiveness, whether they conceded too early or too often, whether each concession got something back, use of silence and patience, whether they asked good questions to understand the other side's constraints, whether they left value on the table, whether they revealed their walk-away point, and emotional control under pressure.

Rules:
- Quote or closely paraphrase their real words. Never invent something they did not say.
- Only list a tactic if it clearly happened. Empty lists are fine.
- They faced a ${stance.label.toLowerCase()} counterparty. Do not grade on a curve for that, but you may mention it.
- If the session was short, judge what is there and say the sample was short.
- This is practice, not legal or financial advice. Do not tell them what their situation is worth beyond what they told you.
- Write in plain prose with no markdown.`,
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: 'tool', name: ANALYSIS_TOOL.name },
    messages: [
      {
        role: 'user',
        content: `Scenario: ${scenario.label}
Situation: ${session.situation_description}
Their target: ${session.my_target || 'not stated'}
Their walk-away point: ${session.my_walk_away_point || 'not stated'}
Counterparty, as they described them: ${session.counterparty_context || 'not described'}
Who opened: ${session.opener === 'them' ? 'the counterparty' : 'they did'}
Their turns: ${turns}
How they say it ended: ${outcomeLabel(session.outcome)}${session.final_terms ? `, final terms: ${session.final_terms}` : ''}

<transcript>
${transcriptToText(session.messages)}
</transcript>`,
      },
    ],
  })

  const block = response.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') throw new Error('Claude did not return a debrief')

  return normalizeAnalysis(block.input, turns)
}

// Tool input is typed as unknown, so coerce it into a shape the UI can trust and
// drop turn references that point past the end of the session.
export function normalizeAnalysis(input: unknown, turns: number): NegotiationAnalysis {
  const raw = obj(input)
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const list = (v: unknown) => (Array.isArray(v) ? v.map(text).filter(Boolean) : [])
  const turn = (v: unknown) => {
    if (v === null || v === undefined || v === '') return null
    const n = Math.round(Number(v))
    return Number.isFinite(n) && n >= 1 && n <= turns ? n : null
  }
  const score = (v: unknown, max: number) => Math.min(max, Math.max(1, Math.round(Number(v)) || Math.ceil(max / 2)))
  const num = (v: unknown) => {
    if (v === null || v === undefined || v === '') return null
    const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.-]/g, ''))
    return Number.isFinite(n) ? n : null
  }

  const tactics: TacticUsed[] = (Array.isArray(raw.tactics_used) ? raw.tactics_used : [])
    .map(obj)
    .map((t) => ({ name: text(t.name), turn: turn(t.turn), quote: text(t.quote), note: text(t.note) }))
    .filter((t) => t.name)

  const counters: CounterTactic[] = (Array.isArray(raw.counter_tactics) ? raw.counter_tactics : [])
    .map(obj)
    .map(
      (t): CounterTactic => ({
        name: text(t.name),
        quote: text(t.quote),
        handled: t.handled === 'well' || t.handled === 'poorly' ? t.handled : 'partly',
        note: text(t.note),
      })
    )
    .filter((t) => t.name)

  const line = obj(raw.better_line)
  const better_line: BetterLine | null =
    text(line.rewrite) && text(line.original)
      ? { turn: turn(line.turn), original: text(line.original), rewrite: text(line.rewrite), why: text(line.why) }
      : null

  const deal = obj(raw.deal_numbers)
  const numbers: DealNumbers = {
    prefix: text(deal.prefix).slice(0, 6),
    suffix: text(deal.suffix).slice(0, 16),
    walk_away: num(deal.walk_away),
    target: num(deal.target),
    their_opening: num(deal.their_opening),
    final: num(deal.final),
  }
  // The bar needs both ends of your range to mean anything.
  const deal_numbers = numbers.walk_away !== null && numbers.target !== null ? numbers : null

  const skills = obj(raw.skill_scores)

  return {
    approach_strengths: list(raw.approach_strengths),
    approach_weaknesses: list(raw.approach_weaknesses),
    tactic_details: tactics,
    counter_tactics: counters,
    suggested_improvements: list(raw.suggested_improvements),
    likely_outcome_assessment: text(raw.likely_outcome_assessment),
    overall_score: score(raw.overall_score, 10),
    skill_scores: {
      anchoring: score(skills.anchoring, 5),
      discovery: score(skills.discovery, 5),
      concessions: score(skills.concessions, 5),
      composure: score(skills.composure, 5),
    },
    value_left: text(raw.value_left),
    better_line,
    deal_numbers,
  }
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}
