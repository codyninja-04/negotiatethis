import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeNegotiation } from '@/lib/claude/negotiation-analyzer'
import { isOutcome, userTurnCount } from '@/lib/negotiation'
import type { NegotiationSession } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Ends the session and writes the debrief. Safe to call twice: once a debrief
// exists it is returned as is, and a failed debrief can simply be retried. The
// outcome is only taken the first time, so a retry can't rewrite history.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })

  const { data } = await supabase.from('negotiation_sessions').select('*').eq('id', params.id).maybeSingle()
  const session = data as NegotiationSession | null
  if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })

  if (session.likely_outcome_assessment) return NextResponse.json({ session })

  const body = (await request.json().catch(() => ({}))) as { outcome?: unknown; final_terms?: unknown }
  const outcome = session.outcome ?? (isOutcome(body.outcome) ? body.outcome : 'paused')
  const finalTerms =
    session.final_terms ?? (typeof body.final_terms === 'string' ? body.final_terms.trim().slice(0, 300) || null : null)
  const endedAt = session.ended_at ?? new Date().toISOString()
  const closing = { ended_at: endedAt, outcome, final_terms: finalTerms }

  // Nothing to debrief if they never said a word. Close it quietly.
  if (userTurnCount(session.messages) === 0) {
    const { data: updated } = await supabase
      .from('negotiation_sessions')
      .update(closing)
      .eq('id', session.id)
      .select('*')
      .single()
    return NextResponse.json({ session: updated ?? { ...session, ...closing } })
  }

  try {
    const analysis = await analyzeNegotiation({ ...session, ...closing })
    const { data: updated, error } = await supabase
      .from('negotiation_sessions')
      .update({
        ...closing,
        approach_strengths: analysis.approach_strengths,
        approach_weaknesses: analysis.approach_weaknesses,
        tactics_used: Array.from(new Set(analysis.tactic_details.map((t) => t.name))),
        tactic_details: analysis.tactic_details,
        counter_tactics: analysis.counter_tactics,
        suggested_improvements: analysis.suggested_improvements,
        likely_outcome_assessment: analysis.likely_outcome_assessment,
        overall_score: analysis.overall_score,
        skill_scores: analysis.skill_scores,
        value_left: analysis.value_left,
        better_line: analysis.better_line,
        deal_numbers: analysis.deal_numbers,
      })
      .eq('id', session.id)
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ session: updated })
  } catch (err) {
    console.error('debrief failed', err)
    // Lock the session anyway so no more messages get added, then let them retry.
    await supabase.from('negotiation_sessions').update(closing).eq('id', session.id)
    return NextResponse.json(
      { error: 'The debrief could not be written just now. Try again in a moment.' },
      { status: 502 }
    )
  }
}
