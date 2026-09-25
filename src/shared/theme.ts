/**
 * Three states. `system` means follow the device and is the default; only an
 * explicit choice is stored, and only an explicit choice overrides
 * prefers-color-scheme.
 */
export const THEMES = ['system', 'light', 'dark'] as const

export type Theme = (typeof THEMES)[number]

export function parseTheme(raw: unknown): Theme {
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'
}
