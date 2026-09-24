import { AppwriteException, ExecutionMethod, Functions } from 'node-appwrite'
import { z } from 'zod'

import { userClient } from '#/server/appwrite'
import { readSessionCookie } from '#/server/cookies'

/**
 * The only way this app touches profile data. The table itself is unreachable
 * from here by design: it is pushed with no permissions and row security off,
 * so nothing but the Function can read or write a row.
 *
 * Two things about calling a Function are easy to get wrong, and both are
 * handled below.
 *
 * First, `createExecution` does not throw when the Function answers 404 or 409.
 * The execution completed; its response merely says 404. A try/catch never sees
 * it. The status has to be read off `responseStatusCode` by hand, which is why
 * every route's meaning is mapped explicitly here rather than inferred from
 * whether a promise rejected.
 *
 * Second, it can still throw, and for a different reason: the Function is
 * deployed with execute access `users`, so Appwrite rejects the call before the
 * Function runs at all when the session is expired or missing. Both layers need
 * handling, and they mean different things.
 */

export type PersonalRole = 'property_owner' | 'realtor'

export const PERSONAL_ROLES = [
  { value: 'property_owner', label: 'Property Owner' },
  { value: 'realtor', label: 'Realtor' },
] as const satisfies ReadonlyArray<{ value: PersonalRole; label: string }>

const accountSchema = z.object({
  personalAccountId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(['property_owner', 'realtor']),
  contactEmail: z.string().nullable(),
  bio: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type PersonalAccount = z.infer<typeof accountSchema>

export type FieldIssue = { field: string; message: string }

const errorSchema = z.object({
  error: z.string(),
  message: z.string(),
  issues: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .optional(),
})

/** Sent back when the Function is reachable but said no. */
type Refusal = { message: string; issues: FieldIssue[] }

const GENERIC_REFUSAL: Refusal = {
  message: 'That did not work. Try again.',
  issues: [],
}

function readRefusal(body: unknown): Refusal {
  const parsed = errorSchema.safeParse(body)

  return parsed.success
    ? { message: parsed.data.message, issues: parsed.data.issues ?? [] }
    : GENERIC_REFUSAL
}

/** `502` is this module's own marker for "we never got an answer". */
type Reply = { code: number; body: unknown }

const NO_ANSWER: Reply = { code: 502, body: null }

async function call(
  sessionSecret: string,
  method: ExecutionMethod,
  payload?: unknown,
): Promise<Reply> {
  const functionId = process.env.APPWRITE_FUNCTION_ID

  if (!functionId) {
    throw new Error('APPWRITE_FUNCTION_ID must be set. See .env.example.')
  }

  try {
    const execution = await new Functions(
      userClient(sessionSecret),
    ).createExecution({
      functionId,
      xpath: '/personal-account',
      method,
      body: payload === undefined ? undefined : JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      async: false,
    })

    if (execution.status !== 'completed') {
      // The container failed or ran out of its 15 seconds. There is no HTTP
      // status to read, so this is not a refusal, it is an absence.
      console.error(
        '[personal-account] execution',
        execution.status,
        execution.errors,
      )
      return NO_ANSWER
    }

    let body: unknown = null
    try {
      body = execution.responseBody ? JSON.parse(execution.responseBody) : null
    } catch {
      console.error('[personal-account] response was not JSON')
      return NO_ANSWER
    }

    return { code: execution.responseStatusCode, body }
  } catch (error) {
    if (error instanceof AppwriteException) {
      // Appwrite turned the call away before the Function ran. With execute
      // access `users` that is what an expired session looks like.
      return { code: error.code || 502, body: null }
    }

    console.error('[personal-account]', error)
    return NO_ANSWER
  }
}

function parseAccount(body: unknown): PersonalAccount | null {
  const parsed = accountSchema.safeParse(body)

  if (!parsed.success) {
    console.error('[personal-account] unexpected account shape')
    return null
  }

  return parsed.data
}

export type FetchOutcome =
  | { state: 'found'; account: PersonalAccount }
  /** 404 is not a failure here. It is how the Function says "onboard them". */
  | { state: 'not-onboarded' }
  | { state: 'signed-out' }
  | { state: 'unavailable' }

export async function fetchPersonalAccount(): Promise<FetchOutcome> {
  const secret = readSessionCookie()
  if (!secret) return { state: 'signed-out' }

  const { code, body } = await call(secret, ExecutionMethod.GET)

  if (code === 200) {
    const account = parseAccount(body)
    return account ? { state: 'found', account } : { state: 'unavailable' }
  }
  if (code === 404) return { state: 'not-onboarded' }
  if (code === 401 || code === 403) return { state: 'signed-out' }

  return { state: 'unavailable' }
}

export type CreateOutcome =
  /**
   * 201 and 200 are the same news: the account exists and it is theirs. The
   * Function answers 200 when a row is already there, which is how a repeated
   * submit stays harmless, so treating 200 as anything but success would break
   * the case it was written for.
   */
  | { state: 'ready'; account: PersonalAccount }
  | { state: 'role-conflict'; message: string }
  | { state: 'invalid'; message: string; issues: FieldIssue[] }
  | { state: 'signed-out' }
  | { state: 'unavailable' }

export async function createPersonalAccount(input: {
  firstName: string
  lastName: string
  role: PersonalRole
}): Promise<CreateOutcome> {
  const secret = readSessionCookie()
  if (!secret) return { state: 'signed-out' }

  const { code, body } = await call(secret, ExecutionMethod.POST, input)

  if (code === 201 || code === 200) {
    const account = parseAccount(body)
    return account ? { state: 'ready', account } : { state: 'unavailable' }
  }
  if (code === 409) return { state: 'role-conflict', ...readRefusal(body) }
  if (code === 400) return { state: 'invalid', ...readRefusal(body) }
  if (code === 401 || code === 403) return { state: 'signed-out' }

  return { state: 'unavailable' }
}

export type UpdateOutcome =
  | { state: 'saved'; account: PersonalAccount }
  | { state: 'invalid'; message: string; issues: FieldIssue[] }
  | { state: 'not-onboarded' }
  | { state: 'signed-out' }
  | { state: 'unavailable' }

/**
 * `null` clears a field, an absent key leaves it alone. Role is not here and
 * cannot be: it is absent from the Function's update schema too, so an account
 * keeps the role it was created with.
 */
export type PersonalAccountPatch = {
  firstName?: string
  lastName?: string
  contactEmail?: string | null
  bio?: string | null
}

export async function updatePersonalAccount(
  patch: PersonalAccountPatch,
): Promise<UpdateOutcome> {
  const secret = readSessionCookie()
  if (!secret) return { state: 'signed-out' }

  const { code, body } = await call(secret, ExecutionMethod.PATCH, patch)

  if (code === 200) {
    const account = parseAccount(body)
    return account ? { state: 'saved', account } : { state: 'unavailable' }
  }
  if (code === 400) return { state: 'invalid', ...readRefusal(body) }
  if (code === 404) return { state: 'not-onboarded' }
  if (code === 401 || code === 403) return { state: 'signed-out' }

  return { state: 'unavailable' }
}
