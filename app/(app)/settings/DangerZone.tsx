'use client'

import { useState, useTransition } from 'react'
import { deleteAllSessions } from './actions'

export function DangerZone() {
  const [armed, setArmed] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!armed) {
    return (
      <button onClick={() => setArmed(true)} className="btn-danger">
        Delete all sessions
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">This can&apos;t be undone.</span>
      <button
        className="btn-danger"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await deleteAllSessions()
            setArmed(false)
          })
        }
      >
        {pending ? 'Deleting…' : 'Yes, delete everything'}
      </button>
      <button onClick={() => setArmed(false)} className="btn-ghost">
        Cancel
      </button>
    </div>
  )
}
