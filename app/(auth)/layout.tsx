// The right side shows a slice of a real session so people know what they are
// signing up for before they see the app.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">{children}</div>
      <div className="table-grain relative hidden flex-col justify-center overflow-hidden border-l border-line/60 bg-surface/30 px-12 lg:flex">
        <div className="max-w-md">
          <p className="label">Rent renewal · Realistic landlord</p>
          <p className="mt-2 font-display text-3xl leading-snug">$3,200 now. They want $3,600.</p>

          <div className="mt-8 space-y-4">
            <div className="animate-rise-in border-l-2 border-them pl-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-them">Landlord</p>
              <p className="mt-1 text-[15px] leading-relaxed text-text/90">
                Rents around here have gone up a lot. $3,600 is still below what I&apos;d get from a new tenant.
              </p>
            </div>
            <div className="animate-rise-in border-l-2 border-text/70 pl-4" style={{ animationDelay: '160ms' }}>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">You</p>
              <p className="mt-1 text-[15px] leading-relaxed text-text/90">
                Three units on this street are listed at $3,350 to $3,500 right now. What would a month empty and agent
                fees cost you?
              </p>
            </div>
          </div>

          <div
            className="mt-8 animate-rise-in rounded-xl border border-strength/30 bg-strength/5 p-4"
            style={{ animationDelay: '320ms' }}
          >
            <span className="chip border-strength/40 text-strength">Market data + calibrated question</span>
            <p className="mt-2 text-sm text-muted">
              You reset their anchor with real listings, then made them price their own alternative out loud.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
