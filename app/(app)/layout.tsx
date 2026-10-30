import { Header } from '@/components/layout/Header'
import { requireUser } from '@/lib/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireUser()
  const name = profile.full_name || user.email || 'You'

  return (
    <div className="min-h-screen">
      <Header name={name} plan={profile.plan} />
      <main>{children}</main>
    </div>
  )
}
