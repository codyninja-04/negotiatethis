import { redirect } from 'next/navigation'
import { createClient } from './supabase/server'
import type { Profile } from './types'

// Server components behind the app layout call this to get the signed in user
// and their profile in one go.
export async function requireUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined
  const profile: Profile = {
    id: user.id,
    full_name: data?.full_name ?? meta?.full_name ?? meta?.name ?? null,
    plan: data?.plan === 'pro' ? 'pro' : 'free',
    created_at: data?.created_at ?? user.created_at,
  }

  return { supabase, user, profile }
}
