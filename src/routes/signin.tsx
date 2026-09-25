import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { CodeInput } from '#/components/code-input'
import { HomeIcon } from '#/components/icons'
import { usePreferences } from '#/components/preferences'
import { refreshShell } from '#/lib/shell'
import { withTimeout } from '#/lib/timeout'
import { requestSignInCode, verifySignInCode } from '#/server/auth'
import { redirectParam, safeRedirect } from '#/shared/redirect'

export const Route = createFileRoute('/signin')({
  // Shape only. Measured: validateSearch returns the cleaned value while
  // Route.useSearch() still hands the component the raw one, so every read
  // below goes through safeRedirect.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === 'string' ? { redirect: search.redirect } : {},

  // A signed-in person sitting on a sign-in form reads like a broken session.
  // `unknown` falls through: guessing wrong would strand them.
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
 * Appwrite creates the account on first sight of an address. Only the step is
 * in component state; the user id stays in an HttpOnly cookie.
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

  /** Without this a rejection goes nowhere and the form just sits there. */
  function reportFailure(cause: unknown) {
    console.error('[signin]', cause)
    setError(t('error.unreachable'))
  }

  const request = useMutation({
    mutationFn: (address: string) =>
      withTimeout(requestSignInCode({ data: { email: address } })),
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
      withTimeout(verifySignInCode({ data: { code: entered } })),
    onError: reportFailure,
    onSuccess: async (result) => {
      if (!result.ok) {
        setError(t(`error.${result.code}`))
        // A rejected code is not worth editing around.
        setCode('')
        // Nothing left to redeem, so back to the start.
        if (result.code === 'expired') setSentTo(null)
        return
      }

      setError(null)

      try {
        // The cookie changed; the router still holds the old state.
        await refreshShell(router, queryClient)
        // Always onboarding: its own guard forwards anyone who has an account.
        await router.navigate({
          to: '/onboarding',
          search: { redirect: redirectParam(next) },
        })
      } catch (cause) {
        // Signing in worked; only the move after it did not.
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
