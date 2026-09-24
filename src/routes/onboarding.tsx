import { useMutation } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { PERSONAL_ROLES, type PersonalRole } from '#/server/personal-account'
import { createAccount } from '#/server/profile'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: ({ context }) => {
    // Route UX, not a security boundary: the server function checks the session
    // itself, because it is a reachable endpoint whatever this says.
    if (context.viewer.state === 'signed-out') {
      throw redirect({ to: '/signin' })
    }
    if (context.viewer.state === 'ready') {
      throw redirect({ to: '/' })
    }
    // `unknown` falls through on purpose. We cannot tell whether they have an
    // account, and the create route is idempotent, so letting them submit is
    // both safe and more useful than an error page.
  },
  component: Onboarding,
})

function Onboarding() {
  const router = useRouter()

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
    }) => createAccount({ data: input }),
    onSuccess: async (outcome) => {
      if (outcome.state === 'ready') {
        await router.invalidate()
        await router.navigate({ to: '/' })
        return
      }

      if (outcome.state === 'invalid') {
        setError(outcome.message)
        setIssues(
          Object.fromEntries(outcome.issues.map((i) => [i.field, i.message])),
        )
        return
      }

      if (outcome.state === 'signed-out') {
        await router.invalidate()
        await router.navigate({ to: '/signin' })
        return
      }

      setIssues({})
      setError(
        outcome.state === 'role-conflict'
          ? outcome.message
          : 'That did not work. Try again.',
      )
    },
  })

  /**
   * Two clicks on Continue must not make two accounts.
   *
   * This guard is the courtesy, not the mechanism. It only covers this one
   * button in this one tab; a slow network, a second tab or a retry all slip
   * past it. What actually holds is the unique index on the table: the loser of
   * the race gets a conflict, and the Function turns that into the same 200 the
   * winner saw, so both requests end with one account and neither sees an
   * error. Verified with two overlapping requests.
   */
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submit.isPending || role === null) return

    setError(null)
    setIssues({})
    submit.mutate({ firstName, lastName, role })
  }

  return (
    <main>
      <h1>Tell us who you are</h1>
      <p>You need this before you can use HAUZ.</p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="firstName">First name</label>
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
          <label htmlFor="lastName">Last name</label>
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
          <legend>I am a</legend>
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
              {option.label}
            </label>
          ))}
          {issues.role && <p>{issues.role}</p>}
          {/*
            Chosen once and kept. The Function has no way to change a role
            afterwards, so this is the only screen that ever asks.
          */}
          <p>You cannot change this later.</p>
        </fieldset>

        <button type="submit" disabled={submit.isPending}>
          {submit.isPending ? 'Saving…' : 'Continue'}
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
