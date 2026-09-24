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
