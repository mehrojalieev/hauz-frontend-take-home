/**
 * What both sides need. This file exists because importing one ordinary value
 * from a server module drags the whole module into the browser, `node-appwrite`
 * and all — while importing a server function does not, since Start replaces it
 * with an RPC stub. The two look identical at the import site.
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

/** Absent leaves a value alone, `null` clears it. Role is not here: the
 * Function's update schema has no room for it either. */
export type PersonalAccountPatch = {
  firstName?: string
  lastName?: string
  contactEmail?: string | null
  bio?: string | null
}

/** Inputs deal in strings, never in null. */
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
 * Three states, and a form only knows two. An emptied input hands back `""`,
 * which the Function reads as neither "leave it" nor "clear it":
 *
 *   send the whole form   -> bio: "" -> 400
 *   drop the empty fields -> bio absent -> 200, and the old bio survives
 *
 * The second is the dangerous one: it succeeds and looks right. So unchanged
 * fields are left out, an emptied optional field becomes `null`, and a required
 * one is left out because it cannot be cleared at all.
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
