import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { FREE_HISTORY_LIMIT, FREE_MONTHLY_SESSIONS, getUsage, limitsEnforced } from '@/lib/plan'
import { DangerZone } from './DangerZone'
import { updateName } from './actions'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

const FREE = [
  `${FREE_MONTHLY_SESSIONS} practice sessions a month`,
  'Full debrief after every session',
  `Your ${FREE_HISTORY_LIMIT} latest sessions in history`,
]
const PRO = [
  'Unlimited practice sessions',
  'Full debrief history with score and tactic trends',
  'Ready made scenario templates for every type',
]

export default async function SettingsPage() {
  const { supabase, user, profile } = await requireUser()
  const usage = await getUsage(supabase, user.id)
  const isPro = profile.plan === 'pro'

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="label">Settings</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Your account</h1>

      <section className="card mt-8 p-5 sm:p-6">
        <h2 className="font-medium">Profile</h2>
        <form action={updateName} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="full_name" className="label">
              Display name
            </label>
            <input
              id="full_name"
              name="full_name"
              defaultValue={profile.full_name ?? ''}
              maxLength={80}
              className="input mt-2"
              placeholder="Your name"
            />
          </div>
          <button className="btn-ghost">Save</button>
        </form>
        <p className="mt-3 text-xs text-faint">Signed in with Google as {user.email}</p>
      </section>

      <section className="card mt-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-medium">Plan</h2>
            <p className="mt-1 text-sm text-muted">
              {isPro ? 'Pro. Thanks for backing NegotiateThis.' : 'Free'}
              {!isPro && usage.limit !== null && ` · ${usage.used} of ${usage.limit} sessions used this month`}
              {!isPro && !limitsEnforced() && ' · limits are switched off right now, so everything is unlocked'}
            </p>
          </div>
          <span className="font-mono text-xs text-faint">{usage.used} this month</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <PlanCard name="Free" price="$0" items={FREE} current={!isPro} />
          <PlanCard name="Pro" price="$8/month" items={PRO} current={isPro} highlight />
        </div>
        {!isPro && (
          <p className="mt-4 text-xs text-faint">
            Online upgrades are coming soon. Free sessions reset on the 1st of each month (UTC).
          </p>
        )}
      </section>

      <section className="card mt-4 p-5 sm:p-6">
        <h2 className="font-medium">Data</h2>
        <p className="mt-1 text-sm text-muted">
          Your sessions are private to you, including your targets and walk-away points. Deleting them removes every transcript and debrief for good.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <DangerZone />
          <form action="/auth/signout" method="post">
            <button className="btn-ghost">Sign out</button>
          </form>
        </div>
      </section>
    </div>
  )
}

function PlanCard({
  name,
  price,
  items,
  current,
  highlight = false,
}: {
  name: string
  price: string
  items: string[]
  current: boolean
  highlight?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-primary/40 bg-primary/[0.05]' : 'border-line bg-background/40'}`}>
      <div className="flex items-baseline justify-between">
        <p className="font-medium">{name}</p>
        <p className="font-mono text-sm text-muted">{price}</p>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm text-muted">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className={highlight ? 'text-primary' : 'text-faint'}>✓</span>
            {item}
          </li>
        ))}
      </ul>
      {current && <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-faint">Current plan</p>}
    </div>
  )
}
