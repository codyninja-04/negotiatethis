export type Plan = 'free' | 'pro'

export type ScenarioType = 'salary' | 'rent' | 'freelance_rate' | 'purchase' | 'contract_terms' | 'other'

export type Stance = 'flexible' | 'realistic' | 'tough'

export type Opener = 'me' | 'them'

export type Outcome = 'deal' | 'no_deal' | 'walked_away' | 'paused'

export interface Profile {
  id: string
  full_name: string | null
  plan: Plan
  created_at: string
}

export interface NegotiationMessage {
  role: 'user' | 'assistant'
  content: string
  at: string
}

export interface TacticUsed {
  name: string
  // 1 based index into the user's own turns, or null if it ran across the session.
  turn: number | null
  quote: string
  note: string
}

export interface CounterTactic {
  name: string
  quote: string
  handled: 'well' | 'partly' | 'poorly'
  note: string
}

export interface SkillScores {
  anchoring: number
  discovery: number
  concessions: number
  composure: number
}

export interface BetterLine {
  turn: number | null
  original: string
  rewrite: string
  why: string
}

export interface DealNumbers {
  // e.g. "$" and "/month", so 6800 reads as $6,800/month.
  prefix: string
  suffix: string
  walk_away: number | null
  target: number | null
  their_opening: number | null
  final: number | null
}

export interface NegotiationSession {
  id: string
  user_id: string
  created_at: string
  ended_at: string | null
  scenario_type: ScenarioType
  situation_description: string
  my_target: string | null
  my_walk_away_point: string | null
  counterparty_context: string | null
  stance: Stance
  opener: Opener
  messages: NegotiationMessage[]
  outcome: Outcome | null
  final_terms: string | null
  approach_strengths: string[] | null
  approach_weaknesses: string[] | null
  tactics_used: string[] | null
  tactic_details: TacticUsed[] | null
  counter_tactics: CounterTactic[] | null
  suggested_improvements: string[] | null
  likely_outcome_assessment: string | null
  overall_score: number | null
  skill_scores: SkillScores | null
  value_left: string | null
  better_line: BetterLine | null
  deal_numbers: DealNumbers | null
}
