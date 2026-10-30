import type { Opener, ScenarioType, Stance } from './types'

export interface ScenarioMeta {
  id: ScenarioType
  label: string
  // Who Claude becomes, used in the prompt and the live header.
  counterpartyRole: string
  // Short label shown above their lines in the transcript.
  themLabel: string
  situationHint: string
  targetHint: string
  walkAwayHint: string
  counterpartyHint: string
  defaultOpener: Opener
}

export const SCENARIOS: ScenarioMeta[] = [
  {
    id: 'salary',
    label: 'Salary',
    counterpartyRole: 'the hiring manager or recruiter',
    themLabel: 'Hiring manager',
    situationHint:
      'e.g. Offered $6,200/month as a mid level data analyst at a logistics firm. I have 4 years of experience and a competing offer at $6,600 that I prefer less.',
    targetHint: 'e.g. $7,000/month',
    walkAwayHint: 'e.g. $6,500, or $6,300 with an extra week of leave',
    counterpartyHint:
      'e.g. Hiring manager who wants me, but the band tops out around $6,800 and HR has to sign off on anything above $6,500.',
    defaultOpener: 'me',
  },
  {
    id: 'rent',
    label: 'Rent',
    counterpartyRole: 'the landlord or their agent',
    themLabel: 'Landlord',
    situationHint:
      'e.g. Renewing a 2 bedroom lease at $3,200/month. Landlord wants $3,600. I have been a reliable tenant for 2 years and similar units nearby list at $3,350 to $3,500.',
    targetHint: 'e.g. Stay at $3,300 on a 2 year lease',
    walkAwayHint: 'e.g. $3,450, otherwise I move',
    counterpartyHint:
      'e.g. Private landlord, has a mortgage on the unit, hates vacancy months but has heard rents are rising.',
    defaultOpener: 'them',
  },
  {
    id: 'freelance_rate',
    label: 'Freelance rate',
    counterpartyRole: 'the prospective client',
    themLabel: 'Client',
    situationHint:
      'e.g. Quoting a 6 week website rebuild for a small clinic. My usual day rate is $650. They mentioned their budget is "around $15k" for the whole thing.',
    targetHint: 'e.g. $22,000 fixed, 50% upfront',
    walkAwayHint: 'e.g. $18,000 with reduced scope',
    counterpartyHint: 'e.g. Clinic owner, cost conscious, has a cheaper quote from an agency but liked my portfolio.',
    defaultOpener: 'me',
  },
  {
    id: 'purchase',
    label: 'Purchase',
    counterpartyRole: 'the seller',
    themLabel: 'Seller',
    situationHint:
      'e.g. Buying a 2019 Honda Civic listed at $78,000 from a used car dealer. It has 62,000 km and a small dent on the rear bumper.',
    targetHint: 'e.g. $72,000 with the dent fixed',
    walkAwayHint: 'e.g. $75,000',
    counterpartyHint: 'e.g. Dealer salesperson with a monthly target, the car has been on the lot for 7 weeks.',
    defaultOpener: 'me',
  },
  {
    id: 'contract_terms',
    label: 'Contract terms',
    counterpartyRole: 'the other party to the contract',
    themLabel: 'Other party',
    situationHint:
      'e.g. Supplier wants to move us from 60 day to 30 day payment terms on a $40k/year contract, and add a 5% price increase.',
    targetHint: 'e.g. Keep 60 days, cap the increase at 2%',
    walkAwayHint: 'e.g. 45 days and 3.5%',
    counterpartyHint: 'e.g. Account manager under pressure on cash flow, but we are one of their larger accounts.',
    defaultOpener: 'them',
  },
  {
    id: 'other',
    label: 'Other',
    counterpartyRole: 'the other party',
    themLabel: 'Counterparty',
    situationHint:
      'e.g. Asking my manager for a 4 day work week at 90% pay. Nobody on the team has done it before.',
    targetHint: 'e.g. 4 days at 90%, starting next quarter',
    walkAwayHint: 'e.g. A 3 month trial',
    counterpartyHint: 'e.g. Supportive manager, but worried about setting a precedent and covering Fridays.',
    defaultOpener: 'me',
  },
]

export function getScenario(id: string | null | undefined): ScenarioMeta {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[SCENARIOS.length - 1]
}

export function isScenarioType(v: unknown): v is ScenarioType {
  return typeof v === 'string' && SCENARIOS.some((s) => s.id === v)
}

export interface StanceMeta {
  id: Stance
  label: string
  blurb: string
  // How the counterparty is told to behave.
  style: string
}

export const STANCES: StanceMeta[] = [
  {
    id: 'flexible',
    label: 'Flexible',
    blurb: 'Wants this to work and moves for a decent reason.',
    style:
      'You genuinely want to reach a deal and you are not looking for a fight. You still have real limits, but a reasonable, well supported ask can move you a fair way. Concede in sensible steps, not all at once.',
  },
  {
    id: 'realistic',
    label: 'Realistic',
    blurb: 'Like most people. Has limits, moves only when given a reason.',
    style:
      'Behave like a typical person in this role. You protect your interests, open with a position that favours you, and only move when they give you a reason. Small, slow concessions, each one traded for something.',
  },
  {
    id: 'tough',
    label: 'Tough',
    blurb: 'Hard anchors, time pressure, makes you earn every inch.',
    style:
      'You are a hard, experienced negotiator. Anchor aggressively, use time pressure and alternatives, test their resolve, and make every concession expensive. You are never rude or unfair, but weak or vague arguments get nothing from you.',
  },
]

export function getStance(id: string | null | undefined): StanceMeta {
  return STANCES.find((s) => s.id === id) ?? STANCES[1]
}

export function isStance(v: unknown): v is Stance {
  return typeof v === 'string' && STANCES.some((s) => s.id === v)
}

// Ready made scenarios people can load and tweak. One per type, written with
// real numbers so the practice feels like a real conversation from the start.
export interface ScenarioTemplate {
  id: string
  scenario_type: ScenarioType
  title: string
  situation_description: string
  my_target: string
  my_walk_away_point: string
  counterparty_context: string
  opener: Opener
}

export const TEMPLATES: ScenarioTemplate[] = SCENARIOS.map((s) => ({
  id: `${s.id}-example`,
  scenario_type: s.id,
  title: s.label,
  situation_description: stripExample(s.situationHint),
  my_target: stripExample(s.targetHint),
  my_walk_away_point: stripExample(s.walkAwayHint),
  counterparty_context: stripExample(s.counterpartyHint),
  opener: s.defaultOpener,
}))

function stripExample(hint: string): string {
  return hint.replace(/^e\.g\.\s*/, '')
}
