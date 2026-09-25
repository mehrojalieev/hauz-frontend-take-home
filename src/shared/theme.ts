/**
 * Three states, and light is the default: somebody arriving without a stored
 * choice gets the light palette whatever their device is set to. `system` is
 * still offered, and choosing it is what hands the decision back to
 * prefers-color-scheme.
 */
export const THEMES = ['light', 'dark', 'system'] as const

export type Theme = (typeof THEMES)[number]

export function parseTheme(raw: unknown): Theme {
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'light'
}
