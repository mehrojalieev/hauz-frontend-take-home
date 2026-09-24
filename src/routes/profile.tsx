import { useMutation } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { saveProfile } from '#/server/profile'
import {
  buildPatch,
  formFrom,
  PERSONAL_ROLES,
  type PersonalAccount,
  type ProfileForm,
} from '#/shared/personal-account'

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ context }) => {
    // Route UX, not the security boundary. saveProfile checks the session
    // itself, and the Function checks it again.
    if (context.viewer.state === 'signed-out') {
      throw redirect({ to: '/signin' })
    }
    if (context.viewer.state === 'onboarding') {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: Profile,
})

function Profile() {
  const { viewer } = Route.useRouteContext()

  if (viewer.state !== 'ready') {
    // Only reachable when the viewer is `unknown`: signed-out and onboarding
    // were redirected above. We cannot show a profile we could not load, and
    // we will not pretend they are signed out to get out of saying so.
    return (
      <main>
        <h1>Profile</h1>
        <p role="alert">
          We could not load your profile just now. Reload in a moment; you are
          still signed in.
        </p>
      </main>
    )
  }

  return <ProfileForm account={viewer.account} />
}

function ProfileForm({ account }: { account: PersonalAccount }) {
  const router = useRouter()

  // What was loaded. Every decision about what to send is made against this,
  // which is the only way to tell "left alone" from "cleared".
  const [initial, setInitial] = useState<ProfileForm>(() => formFrom(account))
  const [form, setForm] = useState<ProfileForm>(() => formFrom(account))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [issues, setIssues] = useState<Record<string, string>>({})

  const patch = buildPatch(form, initial)
  const changed = Object.keys(patch).length > 0

  const save = useMutation({
    mutationFn: () => saveProfile({ data: patch }),
    onSuccess: async (outcome) => {
      if (outcome.state === 'saved') {
        // The stored values are the ones that count. Taking them from the
        // response rather than from the form means the next edit is compared
        // against what is really there.
        const stored = formFrom(outcome.account)
        setInitial(stored)
        setForm(stored)
        setIssues({})
        setError(null)
        setSaved(true)
        // The header shows the first name, so it has to be told too.
        await router.invalidate()
        return
      }

      setSaved(false)

      if (outcome.state === 'invalid') {
        setError(outcome.message)
        setIssues(
          Object.fromEntries(outcome.issues.map((i) => [i.field, i.message])),
        )
        return
      }

      setIssues({})

      if (outcome.state === 'signed-out') {
        await router.invalidate()
        await router.navigate({ to: '/signin' })
        return
      }

      setError(
        outcome.state === 'not-onboarded'
          ? 'Your profile is gone. Sign in again to set it up.'
          : 'That did not save. Try again.',
      )
    },
  })

  function update(field: keyof ProfileForm, value: string) {
    setSaved(false)
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const role = PERSONAL_ROLES.find((r) => r.value === account.role)

  return (
    <main>
      <h1>Your profile</h1>
      <p>This is what other people on HAUZ see.</p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          // Nothing changed means nothing to say. The Function rejects an empty
          // patch, so sending one would turn a no-op into an error message.
          if (save.isPending || !changed) return
          setError(null)
          setIssues({})
          save.mutate()
        }}
      >
        <div>
          <label htmlFor="firstName">First name</label>
          <input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            required
            maxLength={100}
            value={form.firstName}
            onChange={(event) => update('firstName', event.target.value)}
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
            value={form.lastName}
            onChange={(event) => update('lastName', event.target.value)}
            aria-describedby={issues.lastName ? 'lastName-error' : undefined}
          />
          {issues.lastName && <p id="lastName-error">{issues.lastName}</p>}
        </div>

        <div>
          <label htmlFor="contactEmail">Contact email</label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={form.contactEmail}
            onChange={(event) => update('contactEmail', event.target.value)}
            aria-describedby={
              issues.contactEmail ? 'contactEmail-error' : 'contactEmail-hint'
            }
          />
          {issues.contactEmail ? (
            <p id="contactEmail-error">{issues.contactEmail}</p>
          ) : (
            <p id="contactEmail-hint">
              Optional, and not the address you sign in with. Empty it to remove
              it.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            name="bio"
            maxLength={2000}
            value={form.bio}
            onChange={(event) => update('bio', event.target.value)}
            aria-describedby={issues.bio ? 'bio-error' : 'bio-hint'}
          />
          {issues.bio ? (
            <p id="bio-error">{issues.bio}</p>
          ) : (
            <p id="bio-hint">Optional. Empty it to remove it.</p>
          )}
        </div>

        <div>
          <label htmlFor="role">Role</label>
          <input id="role" value={role?.label ?? account.role} disabled />
          {/*
            Shown, never edited. A role is chosen once at onboarding and the
            Function's update schema has no field for it, so an input that
            looked editable would be lying.
          */}
          <p id="role-hint">Set when you joined and cannot be changed.</p>
        </div>

        <button type="submit" disabled={save.isPending || !changed}>
          {save.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      {error !== null && (
        <p role="alert" aria-live="polite">
          {error}
        </p>
      )}

      {saved && !changed && <p role="status">Saved.</p>}
    </main>
  )
}
