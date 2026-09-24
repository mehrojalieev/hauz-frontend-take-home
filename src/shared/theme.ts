/**
 * Three states, not two, which is what makes this worth storing at all.
 *
 * `system` is a real answer: it means "follow the device", and it is the
 * default. Only an explicit choice is written down, and only an explicit choice
 * overrides prefers-color-scheme. Collapsing this to a boolean would force
 * everyone into a decision they never made.
 */
export const THEMES = ['system', 'light', 'dark'] as const

export type Theme = (typeof THEMES)[number]

export function parseTheme(raw: unknown): Theme {
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'
}
