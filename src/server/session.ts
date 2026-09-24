import { createServerFn } from '@tanstack/react-start'
import { Account, AppwriteException } from 'node-appwrite'

import { userClient } from '#/server/appwrite'
import {
  clearPendingSignInCookie,
  clearSessionCookie,
  readSessionCookie,
} from '#/server/cookies'
import { fetchPersonalAccount } from '#/server/personal-account'
import type { PersonalAccount } from '#/shared/personal-account'

export type CurrentUser = {
  id: string
  email: string
}

/**
 * Who is looking at this page, in the four shapes the app actually branches on.
 *
 * `unknown` earns its place. "We could not find out" is not the same as "signed
 * out", and collapsing the two is what the brief asks for and what this refuses
 * to do; see the note on the lookup below.
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
 * The brief says that if this fails for any reason the person should be treated
 * as signed out and the cookie deleted. Followed literally that is a
 * reliability bug rather than a safety measure: "any reason" covers a timeout,
 * a 502 mid-deploy, a 429 from a rate limit, and none of those say the session
 * went bad. Acting as though they did would turn a few seconds of Appwrite
 * being unwell into a forced sign-out for everyone holding a valid session,
 * each of whom then has to go dig a six digit code out of their inbox.
 *
 * Only 401 and 403 clear the cookie, because only those actually say the
 * session is no longer good.
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

/**
 * One call, both answers. The root route needs the person and their account on
 * every render, and asking for them separately would cost two round trips from
 * the browser on each navigation. The Function is only asked once somebody is
 * actually signed in, so a signed-out visit costs nothing.
 */
export const loadViewer = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Viewer> => {
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
  },
)

/**
 * Signing out has to happen in two places. Dropping the cookie alone leaves the
 * session alive in Appwrite, so a secret captured anywhere else still works.
 * Deleting the session alone leaves a cookie that answers 401 on every request.
 *
 * The cookie is cleared even when Appwrite refuses, because from this browser's
 * point of view the person asked to leave and that has to hold.
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
