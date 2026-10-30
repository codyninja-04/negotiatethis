import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildNegotiationPrompt, streamNegotiation } from '@/lib/claude/counterparty-roleplay'
import { MAX_MESSAGE_LENGTH, awaiting, isSessionFull, toApiMessages, userTurnCount } from '@/lib/negotiation'
import type { NegotiationMessage, NegotiationSession } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// One exchange: the user's line goes in, the counterparty's reply streams back as
// plain text, and both are saved together once the reply is complete. With an
// empty transcript and the counterparty opening, no content is sent and only
// their opening line comes back.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })

  const { data } = await supabase.from('negotiation_sessions').select('*').eq('id', params.id).maybeSingle()
  const session = data as NegotiationSession | null
  if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })

  if (session.ended_at || isSessionFull(session.messages)) {
    return NextResponse.json({ error: 'This session has already ended.' }, { status: 409 })
  }

  const history = session.messages
  const turn = awaiting(history, session.opener)
  const body = (await request.json().catch(() => ({}))) as { content?: unknown }
  const content = typeof body.content === 'string' ? body.content.trim() : ''

  let messages: NegotiationMessage[]
  if (turn === 'counterparty') {
    // Only an opening line can be requested this way. Anything else means the
    // last reply never saved, so the client should reload.
    if (history.length > 0) {
      return NextResponse.json({ error: 'Still waiting on their reply. Refresh and try again.' }, { status: 409 })
    }
    messages = []
  } else {
    if (!content) return NextResponse.json({ error: 'Say something first.' }, { status: 400 })
    if (content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Keep each message under ${MAX_MESSAGE_LENGTH} characters.` }, { status: 400 })
    }
    messages = [...history, { role: 'user', content, at: new Date().toISOString() }]
  }

  const system = buildNegotiationPrompt({
    scenario_type: session.scenario_type,
    situation_description: session.situation_description,
    counterparty_context: session.counterparty_context,
    stance: session.stance,
    exchange: userTurnCount(messages),
  })

  const stream = streamNegotiation(system, toApiMessages(messages))
  const encoder = new TextEncoder()

  const responseBody = new ReadableStream<Uint8Array>({
    async start(controller) {
      let text = ''
      let open = true
      const send = (chunk: string) => {
        if (!open) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          // The tab closed. Keep reading so the exchange still saves.
          open = false
        }
      }

      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            text += event.delta.text
            send(event.delta.text)
          }
        }

        if (text.trim()) {
          const { error } = await supabase
            .from('negotiation_sessions')
            .update({
              messages: [...messages, { role: 'assistant', content: text.trim(), at: new Date().toISOString() }],
            })
            .eq('id', session.id)
          if (error) throw error
        } else {
          send('\n\n[[error]]')
        }
      } catch (err) {
        console.error('negotiation stream failed', err)
        send('\n\n[[error]]')
      } finally {
        if (open) controller.close()
      }
    },
  })

  return new Response(responseBody, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
