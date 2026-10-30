import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="label">404</p>
        <h1 className="mt-3 font-display text-5xl">Nobody at this table.</h1>
        <p className="mt-2 text-muted">That page or session doesn&apos;t exist, or it isn&apos;t yours.</p>
        <Link href="/setup" className="btn-primary mt-8">
          Start a session
        </Link>
      </div>
    </div>
  )
}
