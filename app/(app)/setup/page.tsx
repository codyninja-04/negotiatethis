import type { Metadata } from 'next'
import { ScenarioForm } from '@/components/setup/ScenarioForm'
import { requireUser } from '@/lib/auth'
import { getUsage, hasProFeatures } from '@/lib/plan'

export const metadata: Metadata = { title: 'New session' }
export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const { supabase, user, profile } = await requireUser()
  const usage = await getUsage(supabase, user.id)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="label">New session</p>
      <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">
        Set the table <span className="italic text-muted">before you sit at it.</span>
      </h1>
      <p className="mt-3 max-w-xl text-muted">
        Describe the negotiation you are actually about to have. Claude plays the other side with their own interests and
        limits, and stays in character until you end it.
      </p>

      <div className="card mt-10 p-5 sm:p-8">
        <ScenarioForm remaining={usage.remaining} templatesUnlocked={hasProFeatures(profile.plan)} />
      </div>
    </div>
  )
}
