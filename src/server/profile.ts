import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import {
  createPersonalAccount,
  updatePersonalAccount,
  type CreateOutcome,
  type UpdateOutcome,
} from '#/server/personal-account'

/**
 * Note what is missing: a user id. The brief asks the form to send one, which
 * would make identity something the client asserts and therefore can change.
 * The Function takes the caller from `x-appwrite-user-id` instead, and a field
 * that does not exist cannot be trusted by mistake. See NOTES.md.
 */
const onboardingInput = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  role: z.enum(['property_owner', 'realtor']),
})

export const createAccount = createServerFn({ method: 'POST' })
  .validator((data: unknown) => onboardingInput.parse(data))
  .handler(async ({ data }): Promise<CreateOutcome> => createPersonalAccount(data))

/**
 * Absent leaves a value alone, `null` clears it, `""` is refused. Mirrors the
 * Function's own schema — which still validates everything — so a bad patch
 * costs no round trip.
 */
const patchInput = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    contactEmail: z.email().max(254).nullable().optional(),
    bio: z.string().trim().min(1).max(2000).nullable().optional(),
  })
  .refine((fields) => Object.keys(fields).length > 0, {
    message: 'Nothing has changed.',
  })

export const saveProfile = createServerFn({ method: 'POST' })
  .validator((data: unknown) => patchInput.parse(data))
  .handler(async ({ data }): Promise<UpdateOutcome> => updatePersonalAccount(data))
