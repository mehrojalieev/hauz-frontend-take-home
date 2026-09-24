/**
 * The parts of the Personal Account that both sides need: the shapes, and the
 * two roles a form has to offer.
 *
 * This file exists because of how server code is stripped. TanStack Start
 * replaces a `createServerFn` export with an RPC stub, so a component importing
 * only server functions never pulls their module into the browser. An ordinary
 * export is different: importing one value from a module drags the whole module
 * in, `node-appwrite` and all. Keeping anything a component needs out of the
 * server modules is what stops that happening by accident.
 */

export type PersonalRole = 'property_owner' | 'realtor'

export const PERSONAL_ROLES = [
  { value: 'property_owner', label: 'Property Owner' },
  { value: 'realtor', label: 'Realtor' },
] as const satisfies ReadonlyArray<{ value: PersonalRole; label: string }>

export type PersonalAccount = {
  personalAccountId: string
  firstName: string
  lastName: string
  role: PersonalRole
  contactEmail: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
}

/** One entry of the Function's `issues` array: a field name and what is wrong. */
export type FieldIssue = {
  field: string
  message: string
}

/**
 * A partial edit. An absent key leaves the stored value alone, `null` clears
 * it. Role is not here and cannot be: the Function's update schema has no room
 * for it, so an account keeps the role it was created with.
 */
export type PersonalAccountPatch = {
  firstName?: string
  lastName?: string
  contactEmail?: string | null
  bio?: string | null
}

/** What the profile form holds. Inputs deal in strings, never in null. */
export type ProfileForm = {
  firstName: string
  lastName: string
  contactEmail: string
  bio: string
}

export function formFrom(account: PersonalAccount): ProfileForm {
  return {
    firstName: account.firstName,
    lastName: account.lastName,
    contactEmail: account.contactEmail ?? '',
    bio: account.bio ?? '',
  }
}

const REQUIRED = ['firstName', 'lastName'] as const
const OPTIONAL = ['contactEmail', 'bio'] as const

/**
 * Turns what is on screen into what the Function should be told, by comparing
 * against what was loaded.
 *
 * This exists because there are three states and a form only knows about two.
 * The Function reads an absent key as "leave it", `null` as "clear it", and a
 * value as "store it". An `<input>` that has been emptied hands back `""`,
 * which is none of those, and both obvious shortcuts get it wrong:
 *
 *   send the whole form          -> `bio: ""` -> 400, the Function rejects it
 *   drop the empty fields        -> bio absent -> 200, and the old bio survives
 *
 * The second is the dangerous one. It succeeds, looks right on screen, and the
 * cleared value comes back on the next load.
 *
 * So: unchanged fields are left out, an emptied optional field becomes `null`,
 * and an emptied required field is left out entirely because it cannot be
 * cleared at all, which is why the form marks those `required`.
 */
export function buildPatch(
  current: ProfileForm,
  initial: ProfileForm,
): PersonalAccountPatch {
  const patch: PersonalAccountPatch = {}

  for (const key of REQUIRED) {
    const next = current[key].trim()
    if (next !== initial[key].trim() && next !== '') {
      patch[key] = next
    }
  }

  for (const key of OPTIONAL) {
    const next = current[key].trim()
    if (next === initial[key].trim()) continue
    patch[key] = next === '' ? null : next
  }

  return patch
}
