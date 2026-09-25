import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { refreshShell } from '#/lib/shell'
import { withTimeout } from '#/lib/timeout'
import { usePreferences } from '#/components/preferences'
import { saveProfile } from '#/server/profile'
import { redirectParam } from '#/shared/redirect'
import {
  buildPatch,
  formFrom,
  PERSONAL_ROLES,
  type PersonalAccount,
  type ProfileForm,
} from '#/shared/personal-account'

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ context, location }) => {
    // Route UX only. Both hops carry where they were going, so signing in
    // comes back here rather than dropping them home.
    if (context.viewer.state === 'signed-out') {
      throw redirect({ to: '/signin', search: { redirect: redirectParam(location.href) } })
    }
    if (context.viewer.state === 'onboarding') {
      throw redirect({
        to: '/onboarding',
        search: { redirect: redirectParam(location.href) },
      })
    }
  },
  component: Profile,
})

function Profile() {
  const { viewer } = Route.useRouteContext()
  const { t } = usePreferences()

  if (viewer.state !== 'ready') {
    // Only `unknown` reaches here. We will not pretend they are signed out.
    return (
      <main>
        <h1>{t('profile.title')}</h1>
        <p role="alert">{t('profile.loadFailed')}</p>
      </main>
    )
  }

  return <ProfileForm account={viewer.account} />
}

function ProfileForm({ account }: { account: PersonalAccount }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { t } = usePreferences()

  // The only way to tell "left alone" from "cleared".
  const [initial, setInitial] = useState<ProfileForm>(() => formFrom(account))
  const [form, setForm] = useState<ProfileForm>(() => formFrom(account))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [issues, setIssues] = useState<Record<string, string>>({})

  const patch = buildPatch(form, initial)
  const changed = Object.keys(patch).length > 0

  const save = useMutation({
    mutationFn: () => withTimeout(saveProfile({ data: patch })),
    // A rejection means the call never landed. Without this the form sits
    // there and nobody can tell whether it worked.
    onError: (cause) => {
      console.error('[profile]', cause)
      setIssues({})
      setError(t('error.unreachable'))
    },
    onSuccess: async (outcome) => {
      if (outcome.state === 'saved') {
        // From the response, so the next edit compares against what is stored.
        const stored = formFrom(outcome.account)
        setInitial(stored)
        setForm(stored)
        setIssues({})
        setError(null)
        setSaved(true)
        // The header shows the first name, so it has to be told too.
        await refreshShell(router, queryClient)
        return
      }

      setSaved(false)

      if (outcome.state === 'invalid') {
        setError(t('error.invalid'))
        setIssues(
          Object.fromEntries(outcome.issues.map((i) => [i.field, i.message])),
        )
        return
      }

      setIssues({})

      if (outcome.state === 'signed-out') {
        await refreshShell(router, queryClient)
        await router.navigate({ to: '/signin' })
        return
      }

      setError(
        t(
          outcome.state === 'not-onboarded'
            ? 'error.not_onboarded'
            : 'error.unavailable',
        ),
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
      <h1>{t('profile.title')}</h1>
      <p>{t('profile.intro')}</p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          // The Function rejects an empty patch, so a no-op would become an error.
          if (save.isPending || !changed) return
          setError(null)
          setIssues({})
          save.mutate()
        }}
      >
        <div>
          <label htmlFor="firstName">{t('onboarding.firstName')}</label>
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
          <label htmlFor="lastName">{t('onboarding.lastName')}</label>
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
          <label htmlFor="contactEmail">{t('profile.contactEmail')}</label>
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
            <p id="contactEmail-hint">{t('profile.contactEmailHint')}</p>
          )}
        </div>

        <div>
          <label htmlFor="bio">{t('profile.bio')}</label>
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
            <p id="bio-hint">{t('profile.bioHint')}</p>
          )}
        </div>

        <div>
          <label htmlFor="role">{t('profile.role')}</label>
          <input
            id="role"
            value={role ? t(`onboarding.role.${role.value}`) : account.role}
            disabled
          />
          {/* Shown, never edited: the update schema has no field for it. */}
          <p id="role-hint">{t('profile.roleHint')}</p>
        </div>

        <button type="submit" disabled={save.isPending || !changed}>
          {save.isPending ? t('profile.saving') : t('profile.save')}
        </button>
      </form>

      {error !== null && (
        <p role="alert" aria-live="polite">
          {error}
        </p>
      )}

      {saved && !changed && <p role="status">{t('profile.saved')}</p>}
    </main>
  )
}
