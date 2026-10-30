import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NegotiationChat } from '@/components/practice/NegotiationChat'
import { requireUser } from '@/lib/auth'
import type { NegotiationSession } from '@/lib/types'

export const metadata: Metadata = { title: 'Practice' }
export const dynamic = 'force-dynamic'

export default async function PracticePage({ params }: { params: { id: string } }) {
  const { supabase } = await requireUser()
  const { data } = await supabase.from('negotiation_sessions').select('*').eq('id', params.id).maybeSingle()
  if (!data) notFound()

  return <NegotiationChat initial={data as NegotiationSession} />
}
