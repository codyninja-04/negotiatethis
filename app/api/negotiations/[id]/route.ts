import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })

  const { error } = await supabase.from('negotiation_sessions').delete().eq('id', params.id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: 'Could not delete that session.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
