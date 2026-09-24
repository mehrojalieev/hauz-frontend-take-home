import { Link, useRouteContext, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { signOut } from '#/server/session'

/**
 * Reads the auth state the root route resolved during SSR, so this renders
 * correctly in the very first HTML rather than after hydration. Fetching in an
 * effect would paint "Sign in" first and correct it a moment later, which is
 * the flash the brief rules out.
 */
export function SiteHeader() {
  const { auth } = useRouteContext({ from: '__root__' })
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)

  async function handleSignOut() {
    if (leaving) return
    setLeaving(true)

    try {
      await signOut()
      // Re-runs the root beforeLoad. Without it the header keeps rendering the
      // person who just left.
      await router.invalidate()
      await router.navigate({ to: '/' })
    } finally {
      setLeaving(false)
    }
  }

  return (
    <header>
      <Link to="/">HAUZ</Link>

      {auth.status === 'signed-in' && (
        <>
          <span>{auth.user.email}</span>
          <button type="button" onClick={handleSignOut} disabled={leaving}>
            {leaving ? 'Logging out…' : 'Log out'}
          </button>
        </>
      )}

      {auth.status === 'signed-out' && <Link to="/signin">Sign in</Link>}

      {/*
        We asked and did not get an answer. Offering "Sign in" here would be a
        guess, and a wrong guess costs somebody a session they still have, so
        say only what is true.
      */}
      {auth.status === 'unknown' && (
        <span role="status">Sign-in state unavailable</span>
      )}
    </header>
  )
}
