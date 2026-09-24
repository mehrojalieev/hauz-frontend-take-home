import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { refreshShell } from '#/lib/shell'
import { HomeIcon } from '#/components/icons'
import { usePreferences } from '#/components/preferences'

import { requestSignInCode, verifySignInCode } from '#/server/auth'
import { redirectParam, safeRedirect } from '#/shared/redirect'

export const Route = createFileRoute('/signin')({
  // Declares the shape, and nothing more. It is tempting to sanitise here and
  // be done, but measured against this version of the router that does not
  // hold: validateSearch runs and returns the cleaned value, while
  // Route.useSearch() still hands the component the raw one straight off the
  // URL. Every read below goes through safeRedirect for that reason.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === 'string' ? { redirect: search.redirect } : {},
  component: SignIn,
})

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
  const queryClient = useQueryClient()
  const { t } = usePreferences()
  // Cleaned on the way out of the URL, never trusted as read.
  const next = safeRedirect(Route.useSearch().redirect)

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const request = useMutation({
    mutationFn: (address: string) =>
      requestSignInCode({ data: { email: address } }),
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
    mutationFn: (entered: string) => verifySignInCode({ data: { code: entered } }),
    onSuccess: async (result) => {
      if (!result.ok) {
        setError(t(`error.${result.code}`))
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
      await refreshShell(router, queryClient)
      // Always onboarding, carrying where they were going. Its own guard sends
      // people who already have an account straight on, so there is one
      // destination here instead of a second lookup to choose between two.
      await router.navigate({ to: '/onboarding', search: { redirect: redirectParam(next) } })
    },
  })

  const busy = request.isPending || verify.isPending

  return (
    <main className="auth">
      <p className="badge" aria-hidden="true">
        <HomeIcon size={20} />
      </p>

      <h1>{t('signin.title')}</h1>
      <p>{t('signin.subtitle')}</p>
      <p className="step">
        {t('signin.step', {
          current: sentTo === null ? '1' : '2',
          total: '2',
        })}
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

          <button type="submit" disabled={busy}>
            {request.isPending ? t('signin.sending') : t('signin.send')}
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
          <p>{t('signin.sentTo', { email: sentTo })}</p>

          <label htmlFor="code">{t('signin.code')}</label>
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
