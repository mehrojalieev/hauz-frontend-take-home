import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { requestSignInCode, verifySignInCode } from '#/server/auth'

export const Route = createFileRoute('/signin')({ component: SignIn })

/**
 * One screen, two steps. New and returning people see exactly this, because
 * Appwrite creates the account on first sight of an email address and there is
 * nothing for the UI to branch on.
 *
 * The step is the only thing held in component state. The user id that ties the
 * two requests together stays in an HttpOnly cookie on the server, so there is
 * nothing here for the browser to tamper with.
 */
function SignIn() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const request = useMutation({
    mutationFn: (address: string) =>
      requestSignInCode({ data: { email: address } }),
    onSuccess: (result, address) => {
      if (!result.ok) {
        setError(result.message)
        return
      }
      setError(null)
      setCode('')
      setSentTo(address)
    },
  })

  const verify = useMutation({
    mutationFn: (entered: string) => verifySignInCode({ data: { code: entered } }),
    onSuccess: async (result) => {
      if (!result.ok) {
        setError(result.message)
        // The parked user id is gone, so there is nothing left to redeem.
        // Send them back to the start rather than leaving them typing into a
        // step that can no longer succeed.
        if (result.code === 'expired') setSentTo(null)
        return
      }

      setError(null)

      // The cookie changed, but the router still holds the auth state it was
      // rendered with. Re-run the root beforeLoad before navigating, or the
      // next screen renders as though nobody signed in.
      await router.invalidate()
      await router.navigate({ to: '/' })
    },
  })

  const busy = request.isPending || verify.isPending

  return (
    <main>
      <h1>Sign in</h1>

      {sentTo === null ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (busy) return
            setError(null)
            request.mutate(email)
          }}
        >
          <p>Enter your email and we will send you a six digit code.</p>

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <button type="submit" disabled={busy}>
            {request.isPending ? 'Sending…' : 'Send code'}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (busy) return
            setError(null)
            verify.mutate(code)
          }}
        >
          <p>
            We sent a code to <strong>{sentTo}</strong>. It is good for 15
            minutes.
          </p>

          <label htmlFor="code">Six digit code</label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />

          <button type="submit" disabled={busy}>
            {verify.isPending ? 'Checking…' : 'Continue'}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null)
              setCode('')
              setSentTo(null)
            }}
          >
            Use a different email
          </button>
        </form>
      )}

      {error !== null && (
        <p role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </main>
  )
}
