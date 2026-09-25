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
 * Two requests, two different clients, and the split is measured:
 *
 *   createEmailToken, no API key   -> secret empty
 *   createEmailToken, with API key -> secret is the 6 digit code
 *   createSession                  -> secret only present for an API key
 *
 * So step one runs unauthenticated — as admin, the code meant for an inbox
 * would arrive in our own response body — and step two must run as admin,
 * which is the only reason the key needs `sessions.write`.
 */

/**
 * A code, not a sentence. Appwrite's error text can describe internals, and the
 * wording is not the server's to choose anyway: the reader picked a language.
 */
type FailureCode = 'rate_limited' | 'invalid_code' | 'expired' | 'unavailable'

type Failure = { ok: false; code: FailureCode }

type Success = { ok: true }

const fail = (code: FailureCode): Failure => ({ ok: false, code })

function describeFailure(error: unknown, whenUnauthorized: Failure): Failure {
  if (error instanceof AppwriteException) {
    if (error.code === 429) return fail('rate_limited')
    if (error.code === 401) return whenUnauthorized
  }

  // Logged for us, not shown to them: the detail may name internals.
  console.error('[sign-in]', error)

  return fail('unavailable')
}

export const requestSignInCode = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    z.object({ email: z.email().max(254) }).parse(data),
  )
  .handler(async ({ data }): Promise<Success | Failure> => {
    try {
      // Ignored when the address already has an account, which is what makes
      // new and returning people look the same.
      const token = await new Account(guestClient()).createEmailToken({
        userId: ID.unique(),
        email: data.email,
      })

      // Parked server-side so the browser never sees it and cannot swap it.
      writePendingSignInCookie(token.userId)

      return { ok: true }
    } catch (error) {
      return describeFailure(error, fail('unavailable'))
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
      return fail('expired')
    }

    try {
      const session = await new Account(adminClient()).createSession(
        userId,
        data.code,
      )

      // Only the secret leaves, and only into an HttpOnly cookie: whatever a
      // handler returns is serialized into the SSR payload.
      writeSessionCookie(session.secret, session.expire)
      clearPendingSignInCookie()

      return { ok: true }
    } catch (error) {
      return describeFailure(error, fail('invalid_code'))
    }
  })
