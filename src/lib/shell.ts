import type { QueryClient } from '@tanstack/react-query'
import type { AnyRouter } from '@tanstack/react-router'

import { loadShell } from '#/server/session'

/**
 * The shell costs a round trip to Appwrite and an execution of the Function,
 * measured at roughly 320ms and 490ms. That is a fair price for knowing who is
 * signed in, and much too high to pay again on every client-side navigation
 * between four screens.
 *
 * So it goes through the query cache, which is already in the router's context
 * for exactly this. Fresh for half a minute, which is long enough to cover
 * moving around the app and short enough that a session revoked elsewhere is
 * noticed soon.
 *
 * Anything that changes who is signed in has to clear it, which is what
 * `refreshShell` is for. Calling `router.invalidate()` alone would re-run the
 * loader against a cache that still holds the person who just signed out.
 */
export const SHELL_QUERY_KEY = ['shell'] as const

export function shellQueryOptions() {
  return {
    queryKey: SHELL_QUERY_KEY,
    queryFn: () => loadShell(),
    staleTime: 30_000,
  }
}

export async function refreshShell(router: AnyRouter, queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: SHELL_QUERY_KEY })
  await router.invalidate()
}
