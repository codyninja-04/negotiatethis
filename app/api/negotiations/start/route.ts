import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUsage } from '@/lib/plan'
import { isScenarioType, isStance } from '@/lib/scenarios'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to start a session.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const situation = typeof body.situation_description === 'string' ? body.situation_description.trim() : ''
  if (situation.length < 20) {
    return NextResponse.json(
      { error: 'Tell us a bit more about the situation. Real numbers and context make the practice useful.' },
      { status: 400 }
    )
  }
  if (situation.length > 2000) {
    return NextResponse.json({ error: 'Keep the situation under 2,000 characters.' }, { status: 400 })
  }

  const usage = await getUsage(supabase, user.id)
  if (usage.remaining === 0) {
    return NextResponse.json(
      { error: `You've used your ${usage.limit} free sessions this month. Upgrade to Pro for unlimited practice.` },
      { status: 402 }
    )
  }

  const { data, error } = await supabase
    .from('negotiation_sessions')
    .insert({
      user_id: user.id,
      scenario_type: isScenarioType(body.scenario_type) ? body.scenario_type : 'other',
      situation_description: situation,
      my_target: clean(body.my_target, 200) || null,
      my_walk_away_point: clean(body.my_walk_away_point, 200) || null,
      counterparty_context: clean(body.counterparty_context, 1200) || null,
      stance: isStance(body.stance) ? body.stance : 'realistic',
      opener: body.opener === 'them' ? 'them' : 'me',
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not set up the session. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
