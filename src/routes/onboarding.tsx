import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { refreshShell } from '#/lib/shell'
import { withTimeout } from '#/lib/timeout'
import { usePreferences } from '#/components/preferences'

import { createAccount } from '#/server/profile'
import { PERSONAL_ROLES, type PersonalRole } from '#/shared/personal-account'
import { redirectParam, safeRedirect } from '#/shared/redirect'

export const Route = createFileRoute('/onboarding')({
  // Declares the shape, and nothing more. It is tempting to sanitise here and
  // be done, but measured against this version of the router that does not
  // hold: validateSearch runs and returns the cleaned value, while
  // Route.useSearch() still hands the component the raw one straight off the
  // URL. Every read below goes through safeRedirect for that reason.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === 'string' ? { redirect: search.redirect } : {},
  beforeLoad: ({ context, search }) => {
    const next = safeRedirect(search.redirect)
    // Route UX only; the server function checks the session itself.
    if (context.viewer.state === 'signed-out') {
      throw redirect({ to: '/signin', search: { redirect: redirectParam(next) } })
    }
    // Already onboarded, so this screen has nothing to ask. Send them on to
    // wherever they were originally headed.
    if (context.viewer.state === 'ready') {
      // `to`, not `href`: a bare string got answered with a not-found.
      throw redirect({ to: next })
    }
    // `unknown` falls through: create is idempotent, so submitting is safe.
  },
  component: Onboarding,
})

function Onboarding() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { t } = usePreferences()
  // Cleaned here too. beforeLoad cleaning it does not clean what this reads.
  const next = safeRedirect(Route.useSearch().redirect)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<PersonalRole | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<Record<string, string>>({})

  const submit = useMutation({
    mutationFn: (input: {
      firstName: string
      lastName: string
      role: PersonalRole
    }) => withTimeout(createAccount({ data: input })),
    // Without this the form sits there and nobody can tell what happened.
    onError: (cause) => {
      console.error('[onboarding]', cause)
      setIssues({})
      setError(t('error.unreachable'))
    },
    onSuccess: async (outcome) => {
      if (outcome.state === 'ready') {
        await refreshShell(router, queryClient)
        await router.navigate({ to: next })
        return
      }

      if (outcome.state === 'invalid') {
        setError(t('error.invalid'))
        setIssues(
          Object.fromEntries(outcome.issues.map((i) => [i.field, i.message])),
        )
        return
      }

      if (outcome.state === 'signed-out') {
        await refreshShell(router, queryClient)
        await router.navigate({ to: '/signin' })
        return
      }

      setIssues({})
      setError(
        t(
          outcome.state === 'role-conflict'
            ? 'error.role_conflict'
            : 'error.unavailable',
        ),
      )
    },
  })

  /**
   * The courtesy, not the mechanism: this covers one button in one tab, and a
   * slow network or a second tab gets past it. What holds is the unique index
   * on the table, which turns the loser of the race into the same 200 the
   * winner saw.
   */
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submit.isPending || role === null) return

    setError(null)
    setIssues({})
    submit.mutate({ firstName, lastName, role })
  }

  return (
    <main className="auth">
      <h1>{t('onboarding.title')}</h1>
      <p>{t('onboarding.subtitle')}</p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="firstName">{t('onboarding.firstName')}</label>
          <input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            required
            maxLength={100}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            aria-describedby={issues.firstName ? 'firstName-error' : undefined}
          />
          {issues.firstName && <p id="firstName-error">{issues.firstName}</p>}
        </div>

        <div>
          <label htmlFor="lastName">{t('onboarding.lastName')}</label>
          <input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            required
            maxLength={100}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            aria-describedby={issues.lastName ? 'lastName-error' : undefined}
          />
          {issues.lastName && <p id="lastName-error">{issues.lastName}</p>}
        </div>

        <fieldset>
          <legend>{t('onboarding.roleLegend')}</legend>
          {PERSONAL_ROLES.map((option) => (
            <label key={option.value} htmlFor={`role-${option.value}`}>
              <input
                id={`role-${option.value}`}
                type="radio"
                name="role"
                value={option.value}
                required
                checked={role === option.value}
                onChange={() => setRole(option.value)}
              />
              {t(`onboarding.role.${option.value}`)}
            </label>
          ))}
          {issues.role && <p>{issues.role}</p>}
          {/* The only screen that asks: the Function cannot change a role. */}
          <p>{t('onboarding.roleWarning')}</p>
        </fieldset>

        <button type="submit" disabled={submit.isPending}>
          {submit.isPending ? t('onboarding.saving') : t('onboarding.continue')}
        </button>
      </form>

      {error !== null && (
        <p role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </main>
  )
}
