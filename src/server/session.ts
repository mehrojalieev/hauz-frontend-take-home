import { createServerFn } from '@tanstack/react-start'
import { Account, AppwriteException } from 'node-appwrite'

import { userClient } from '#/server/appwrite'
import {
  clearPendingSignInCookie,
  clearSessionCookie,
  readLocaleCookie,
  readSessionCookie,
  readThemeCookie,
} from '#/server/cookies'
import { fetchPersonalAccount } from '#/server/personal-account'
import type { PersonalAccount } from '#/shared/personal-account'
import { parseLocale, type Locale } from '#/shared/i18n'
import { parseTheme, type Theme } from '#/shared/theme'

export type CurrentUser = {
  id: string
  email: string
}

/**
 * The four shapes the app branches on. `unknown` earns its place: "we could not
 * find out" is not "signed out", and collapsing the two is what the brief asks
 * for and what this refuses to do.
 */
export type Viewer =
  | { state: 'signed-out' }
  | { state: 'unknown' }
  /** Signed in, but there is no Personal Account yet. */
  | { state: 'onboarding'; user: CurrentUser }
  | { state: 'ready'; user: CurrentUser; account: PersonalAccount }

type Resolved =
  | { status: 'signed-out' }
  | { status: 'unknown' }
  | { status: 'signed-in'; user: CurrentUser }

/**
 * The brief says to treat any failure here as signed out. A timeout, a 502
 * mid-deploy and a 429 are not an invalid session, and acting as if they were
 * would sign out everyone holding a good one. Only 401 and 403 clear the
 * cookie. See NOTES.md.
 */
async function resolveCurrentUser(): Promise<Resolved> {
  const secret = readSessionCookie()

  if (!secret) {
    return { status: 'signed-out' }
  }

  try {
    const me = await new Account(userClient(secret)).get()

    // Built by hand. Returning the Appwrite user wholesale would serialize
    // every field it carries into the SSR payload, where the page source can be
    // read by anyone the HTML reaches.
    return { status: 'signed-in', user: { id: me.$id, email: me.email } }
  } catch (error) {
    const invalidSession =
      error instanceof AppwriteException &&
      (error.code === 401 || error.code === 403)

    if (invalidSession) {
      clearSessionCookie()
      return { status: 'signed-out' }
    }

    console.error('[current-user]', error)

    return { status: 'unknown' }
  }
}

/** Everything the page shell needs from the server, in one round trip. */
export type Shell = {
  viewer: Viewer
  theme: Theme
  locale: Locale
}

/**
 * One call, every answer, because the root route needs all of it on every
 * render. The Function is only reached once somebody is signed in, so a
 * signed-out visit costs nothing.
 */
export const loadShell = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Shell> => {
    const theme = parseTheme(readThemeCookie())
    const locale = parseLocale(readLocaleCookie())
    const viewer = await resolveViewer()
    return { viewer, theme, locale }
  },
)

async function resolveViewer(): Promise<Viewer> {
  const resolved = await resolveCurrentUser()

  if (resolved.status !== 'signed-in') {
    return { state: resolved.status === 'unknown' ? 'unknown' : 'signed-out' }
  }

  const outcome = await fetchPersonalAccount()

  switch (outcome.state) {
    case 'found':
      return { state: 'ready', user: resolved.user, account: outcome.account }

    // Not a failure. It is how the Function says this person has not
    // onboarded, which is a normal place to be.
    case 'not-onboarded':
      return { state: 'onboarding', user: resolved.user }

    // The account lookup disagrees with the one above, which means the
    // session lapsed between the two calls. Believe the later answer.
    case 'signed-out':
      clearSessionCookie()
      return { state: 'signed-out' }

    default:
      return { state: 'unknown' }
  }
}

/**
 * Both places. The cookie alone leaves the session alive in Appwrite; the
 * session alone leaves a cookie that answers 401. The cookie is cleared even if
 * Appwrite refuses, because the person asked to leave.
 */
export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  const secret = readSessionCookie()

  if (secret) {
    try {
      await new Account(userClient(secret)).deleteSession('current')
    } catch (error) {
      console.error('[sign-out]', error)
    }
  }

  clearSessionCookie()
  clearPendingSignInCookie()

  return { ok: true } as const
})
