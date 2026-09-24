import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { writeLocaleCookie, writeThemeCookie } from '#/server/cookies'

/**
 * Appearance and language, both stored server-side for the same reason: they
 * have to be known before the first byte of HTML. Kept in the browser and
 * applied after hydration, each would flash its old value on every hard
 * refresh, and the language would arrive too late for `<html lang>`.
 */

export const setTheme = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    z.object({ theme: z.enum(['system', 'light', 'dark']) }).parse(data),
  )
  .handler(async ({ data }) => {
    writeThemeCookie(data.theme)
    return { ok: true } as const
  })

export const setLocale = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    z.object({ locale: z.enum(['uz', 'ru', 'en']) }).parse(data),
  )
  .handler(async ({ data }) => {
    writeLocaleCookie(data.locale)
    return { ok: true } as const
  })
