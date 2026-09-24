import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import {
  createPersonalAccount,
  updatePersonalAccount,
  type CreateOutcome,
  type UpdateOutcome,
} from '#/server/personal-account'

/**
 * What the browser is allowed to ask for.
 *
 * Note what is not in this schema: a user id. The brief asks the profile form
 * to send the signed-in person's id along with the changes so the Function
 * knows whose profile to update. Doing that would make identity something the
 * client asserts, and anything the client asserts it can change: a person could
 * edit the request in devtools and write somebody else's profile. On a
 * marketplace that is a realtor's contact address, and every enquiry meant for
 * them.
 *
 * The Function already refuses to work that way. It takes the caller from
 * `x-appwrite-user-id`, a header Appwrite injects and will not accept from a
 * caller, so the id it trusts cannot be forged. Nothing here needs to send one,
 * and a field that does not exist cannot be trusted by mistake.
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
 * The same three-state shape the Function uses: an absent key leaves a value
 * alone, `null` clears it, a value stores it. `""` is deliberately not
 * accepted, so an emptied field has to arrive as an explicit `null` rather than
 * quietly becoming an empty string in the table.
 *
 * This mirrors the Function's own schema on purpose. It is not a substitute for
 * it, the Function still validates everything, but rejecting a bad patch here
 * saves a round trip and an execution.
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
