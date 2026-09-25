import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { CodeInput } from '#/components/code-input'
import { HomeIcon } from '#/components/icons'
import { usePreferences } from '#/components/preferences'
import { refreshShell } from '#/lib/shell'
import { requestSignInCode, verifySignInCode } from '#/server/auth'
import { redirectParam, safeRedirect } from '#/shared/redirect'

export const Route = createFileRoute('/signin')({
  // Declares the shape, and nothing more. It is tempting to sanitise here and
  // be done, but measured against this version of the router that does not
  // hold: validateSearch runs and returns the cleaned value, while
  // Route.useSearch() still hands the component the raw one. Every read below
  // goes through safeRedirect for that reason.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === 'string' ? { redirect: search.redirect } : {},

  // Somebody already signed in has nothing to do here. Leaving this open let
  // them sit on a sign-in form while the header showed their own name, which
  // reads like the session broke. `unknown` falls through: we cannot tell, and
  // guessing wrong would strand them on a page they cannot leave.
  beforeLoad: ({ context, search }) => {
    if (context.viewer.state === 'ready') {
      throw redirect({ to: safeRedirect(search.redirect) })
    }
    if (context.viewer.state === 'onboarding') {
      throw redirect({
        to: '/onboarding',
        search: { redirect: redirectParam(search.redirect) },
      })
    }
  },

  component: SignIn,
})

/**
 * One screen, two steps. New and returning people see the same thing, because
 * Appwrite creates the account the first time it sees an address, so there is
 * nothing for the UI to branch on.
 *
 * Only the step lives in component state. The user id that ties the two
 * requests together stays in an HttpOnly cookie, so there is nothing on this
 * page for the browser to tamper with and a refresh mid-flow strands nobody.
 */
function SignIn() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { t } = usePreferences()
  // Cleaned on the way out of the URL, never trusted as read.
  const next = safeRedirect(Route.useSearch().redirect)

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * A rejected mutation means the call never completed: the network dropped, or
   * the server function could not be reached. Without this the rejection goes
   * nowhere and the form just sits there, which is worse than an error, because
   * the person cannot tell whether it worked.
   */
  function reportFailure(cause: unknown) {
    console.error('[signin]', cause)
    setError(t('error.unreachable'))
  }

  const request = useMutation({
    mutationFn: (address: string) =>
      requestSignInCode({ data: { email: address } }),
    onError: reportFailure,
    onSuccess: (result, address) => {
      if (!result.ok) {
        setError(t(`error.${result.code}`))
        return
      }
      setError(null)
      setCode('')
      setSentTo(address)
    },
  })

  const verify = useMutation({
    mutationFn: (entered: string) =>
      verifySignInCode({ data: { code: entered } }),
    onError: reportFailure,
    onSuccess: async (result) => {
      if (!result.ok) {
        setError(t(`error.${result.code}`))
        // The parked user id is gone, so there is nothing left to redeem. Send
        // them back to the start rather than leaving them typing into a step
        // that can no longer succeed.
        if (result.code === 'expired') {
          setSentTo(null)
          setCode('')
        }
        return
      }

      setError(null)

      try {
        // The cookie changed, but the router still holds the state it was
        // rendered with. Re-resolve before navigating, or the next screen
        // renders as though nobody signed in.
        await refreshShell(router, queryClient)
        // Always onboarding, carrying where they were going. Its own guard
        // forwards anyone who already has an account, so there is one
        // destination here rather than a second lookup to choose between two.
        await router.navigate({
          to: '/onboarding',
          search: { redirect: redirectParam(next) },
        })
      } catch (cause) {
        // Signing in worked; only the move afterwards did not. Say so, and
        // leave a way through rather than a screen that does nothing.
        console.error('[signin] navigation after sign-in', cause)
        setError(t('error.signedInNoRoute'))
      }
    },
  })

  const busy = request.isPending || verify.isPending

  function submitCode(entered: string) {
    if (busy || entered.length !== 6) return
    setError(null)
    verify.mutate(entered)
  }

  return (
    <main className="auth">
      <p className="badge" aria-hidden="true">
        <HomeIcon size={20} />
      </p>

      <h1>{t('signin.title')}</h1>
      <p>{t('signin.subtitle')}</p>
      <p className="step">
        {t('signin.step', { current: sentTo === null ? '1' : '2', total: '2' })}
      </p>

      {sentTo === null ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (busy) return
            setError(null)
            request.mutate(email)
          }}
        >
          <div>
            <label htmlFor="email">{t('signin.email')}</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <button type="submit" disabled={busy}>
            {request.isPending ? t('signin.sending') : t('signin.send')}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submitCode(code)
          }}
        >
          <p>{t('signin.sentTo', { email: sentTo })}</p>

          <div>
            <label htmlFor="code">{t('signin.code')}</label>
            <CodeInput
              id="code"
              value={code}
              onChange={setCode}
              onComplete={submitCode}
              disabled={busy}
            />
          </div>

          <button type="submit" disabled={busy || code.length !== 6}>
            {verify.isPending ? t('signin.checking') : t('signin.continue')}
          </button>

          <button
            type="button"
            className="quiet"
            disabled={busy}
            onClick={() => {
              setError(null)
              setCode('')
              setSentTo(null)
            }}
          >
            {t('signin.otherEmail')}
          </button>
        </form>
      )}

      {error !== null && (
        <p role="alert" aria-live="polite">
          {error}
        </p>
      )}

      {sentTo !== null && <p className="note">{t('signin.spamNote')}</p>}
    </main>
  )
}
