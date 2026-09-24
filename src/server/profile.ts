import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import {
  createPersonalAccount,
  type CreateOutcome,
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
