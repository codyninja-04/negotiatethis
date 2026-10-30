import type { SupabaseClient } from '@supabase/supabase-js'
import type { Plan } from './types'

export const FREE_MONTHLY_SESSIONS = 3
export const FREE_HISTORY_LIMIT = 5

// The free plan limit only bites when ENFORCE_PRO is on, so local development and
// early testers aren't locked out before billing exists.
export function limitsEnforced(): boolean {
  return process.env.ENFORCE_PRO === 'true'
}

export function startOfMonthUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export interface Usage {
  plan: Plan
  used: number
  limit: number | null
  remaining: number | null
}

export async function getUsage(supabase: SupabaseClient, userId: string): Promise<Usage> {
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', userId).maybeSingle(),
    supabase
      .from('negotiation_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonthUTC().toISOString()),
  ])

  const plan: Plan = profile?.plan === 'pro' ? 'pro' : 'free'
  const used = count ?? 0
  const limit = plan === 'free' && limitsEnforced() ? FREE_MONTHLY_SESSIONS : null

  return { plan, used, limit, remaining: limit === null ? null : Math.max(0, limit - used) }
}

// Full debrief history and the ready made scenario templates are the Pro
// features. With limits off, everyone gets everything.
export function hasProFeatures(plan: Plan): boolean {
  return plan === 'pro' || !limitsEnforced()
}
