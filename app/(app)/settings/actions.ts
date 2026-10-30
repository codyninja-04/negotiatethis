'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateName(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const name = String(formData.get('full_name') ?? '').trim().slice(0, 80)
  await supabase.from('profiles').update({ full_name: name || null }).eq('id', user.id)
  revalidatePath('/', 'layout')
}

export async function deleteAllSessions() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('negotiation_sessions').delete().eq('user_id', user.id)
  revalidatePath('/history')
  revalidatePath('/settings')
}
