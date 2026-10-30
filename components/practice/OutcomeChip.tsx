import { outcomeLabel } from '@/lib/negotiation'
import type { Outcome } from '@/lib/types'

export function OutcomeChip({ outcome }: { outcome: Outcome | null }) {
  const tone =
    outcome === 'deal'
      ? 'border-strength/40 text-strength'
      : outcome === 'walked_away' || outcome === 'no_deal'
        ? 'border-them/40 text-them'
        : 'border-line text-muted'
  return <span className={`chip ${tone}`}>{outcomeLabel(outcome)}</span>
}
