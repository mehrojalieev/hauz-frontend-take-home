import { createServerFn } from '@tanstack/react-start'
import { Account, AppwriteException, ID } from 'node-appwrite'
import { z } from 'zod'

import { adminClient, guestClient } from '#/server/appwrite'
import {
  clearPendingSignInCookie,
  readPendingSignInCookie,
  writePendingSignInCookie,
  writeSessionCookie,
} from '#/server/cookies'

/**
 * Sign-in is two requests: one that sends the six digit code, one that redeems
 * it. Both run here, on the server, and neither hands the browser anything it
 * could use to impersonate somebody.
 *
 * The two steps deliberately use different clients, and the reason is measured
 * rather than assumed:
 *
 *   createEmailToken, no API key   -> secret comes back empty
 *   createEmailToken, with API key -> secret comes back as the 6 digit code
 *   createSession                  -> secret only present with an API key
 *
 * So step one runs unauthenticated: if it ran as admin, the code a person is
 * supposed to read from their inbox would arrive in our own response body, and
 * anything that reaches this process can leak from it. Step two has to run as
 * admin, because the session secret we need for the cookie is only returned to
 * an API key request. That is also the only reason the key needs
 * `sessions.write`.
 */

/** Everything these functions return is safe to serialize to the browser. */
type Failure = {
  ok: false
  code: 'rate_limited' | 'invalid_code' | 'expired' | 'unavailable'
  message: string
}

type Success = { ok: true }

const fail = (code: Failure['code'], message: string): Failure => ({
  ok: false,
  code,
  message,
})

/**
 * Appwrite's own error text is not passed through. It is written for developers
 * and can describe internals; these messages are written for the person
 * waiting on the form.
 */
function describeFailure(error: unknown, whenUnauthorized: Failure): Failure {
  if (error instanceof AppwriteException) {
    if (error.code === 429) {
      return fail(
        'rate_limited',
        'Too many attempts. Wait a minute and try again.',
      )
    }
    if (error.code === 401) {
      return whenUnauthorized
    }
  }

  // Logged for us, not shown to them: the detail may name internals.
  console.error('[sign-in]', error)

  return fail('unavailable', 'Sign-in is unavailable right now. Try again.')
}

export const requestSignInCode = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    z.object({ email: z.email().max(254) }).parse(data),
  )
  .handler(async ({ data }): Promise<Success | Failure> => {
    try {
      // A fresh id for a new email; ignored when the address already has an
      // account, which is what makes new and returning people look the same.
      const token = await new Account(guestClient()).createEmailToken({
        userId: ID.unique(),
        email: data.email,
      })

      // Parked server-side so the browser never sees it and cannot swap it.
      writePendingSignInCookie(token.userId)

      return { ok: true }
    } catch (error) {
      return describeFailure(
        error,
        fail('unavailable', 'Sign-in is unavailable right now. Try again.'),
      )
    }
  })

export const verifySignInCode = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    z
      .object({ code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6 digit code.') })
      .parse(data),
  )
  .handler(async ({ data }): Promise<Success | Failure> => {
    const userId = readPendingSignInCookie()

    if (!userId) {
      return fail(
        'expired',
        'That code has expired. Enter your email to get a new one.',
      )
    }

    try {
      const session = await new Account(adminClient()).createSession(
        userId,
        data.code,
      )

      // Only the secret and its lifetime leave this function, and only into an
      // HttpOnly cookie. The session object itself is never returned: anything
      // a handler returns is serialized into the SSR payload.
      writeSessionCookie(session.secret, session.expire)
      clearPendingSignInCookie()

      return { ok: true }
    } catch (error) {
      return describeFailure(
        error,
        fail('invalid_code', 'That code is wrong or has expired.'),
      )
    }
  })
