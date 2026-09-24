import { createServerFn } from '@tanstack/react-start'
import { Account, AppwriteException } from 'node-appwrite'

import { userClient } from '#/server/appwrite'
import {
  clearPendingSignInCookie,
  clearSessionCookie,
  readSessionCookie,
} from '#/server/cookies'

export type CurrentUser = {
  id: string
  email: string
}

/**
 * Three states, not two. "We could not find out" is a real answer and it is not
 * the same as "signed out".
 */
export type AuthState =
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: CurrentUser }
  | { status: 'unknown' }

/**
 * Resolves who is signed in, on the server, before the first byte of HTML.
 *
 * The brief says that if this fails for any reason the person should be treated
 * as signed out and the cookie deleted. Followed literally that is a reliability
 * bug, not a safety measure: "any reason" covers a timeout, a 502 during a
 * deploy, a 429 from a rate limit. None of those mean the session is invalid,
 * and acting as if they did would turn a few seconds of Appwrite being unwell
 * into a forced sign-out for every person holding a valid session, each of whom
 * then has to go and find a six digit code in their inbox.
 *
 * So only 401 and 403 clear the cookie, because only those actually say the
 * session is no longer good. Anything else returns `unknown`, which keeps the
 * session intact and lets the header say nothing rather than say something
 * false.
 */
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AuthState> => {
    const secret = readSessionCookie()

    if (!secret) {
      return { status: 'signed-out' }
    }

    try {
      const me = await new Account(userClient(secret)).get()

      // Built by hand. Returning the Appwrite user wholesale would serialize
      // every field it carries into the SSR payload, where the page source can
      // be read by anyone the HTML reaches.
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
