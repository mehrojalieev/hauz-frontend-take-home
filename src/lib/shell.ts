import type { QueryClient } from '@tanstack/react-query'
import type { AnyRouter } from '@tanstack/react-router'

import { loadShell } from '#/server/session'

/**
 * Resolving the shell costs a call to Appwrite and an execution of the Function
 * — measured at 320ms and 490ms — so it goes through the query cache rather
 * than being paid again on every navigation.
 *
 * `refreshShell` removes the entry rather than invalidating it, and that is not
 * a style choice: `invalidateQueries` marks data stale, while `ensureQueryData`
 * returns whatever is cached and only fetches when there is nothing there.
 * Invalidating left onboarding finishing successfully and landing on a page
 * that still asked you to onboard.
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
  queryClient.removeQueries({ queryKey: SHELL_QUERY_KEY })
  await router.invalidate()
}
