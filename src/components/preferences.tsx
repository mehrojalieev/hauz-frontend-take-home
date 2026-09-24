import { createContext, useContext, useMemo, useState } from 'react'

import { setLocale, setTheme } from '#/server/preferences'
import { translator, type Locale, type Translate } from '#/shared/i18n'
import type { Theme } from '#/shared/theme'

/**
 * Appearance and language, applied the instant they are chosen.
 *
 * They start life on the server: the shell renders `data-theme` and `lang` from
 * cookies during SSR, which is what stops a hard refresh flashing the wrong
 * palette or the wrong language. Changing one afterwards is a different
 * problem, and the first attempt solved it the same way, by writing the cookie
 * and re-running the root loader. Measured, that cost about a second of
 * nothing happening:
 *
 *   account.get          324ms
 *   function execution   490ms
 *
 * Both of those answer "who is signed in", which cannot change because somebody
 * picked a different colour. So the preference is applied here and the cookie
 * is written in the background. The server is told, but nobody waits for it,
 * and the viewer is never asked again.
 */

type Preferences = {
  theme: Theme
  locale: Locale
  t: Translate
  chooseTheme: (next: Theme) => void
  chooseLocale: (next: Locale) => void
}

const PreferencesContext = createContext<Preferences | null>(null)

export function PreferencesProvider({
  theme: initialTheme,
  locale: initialLocale,
  children,
}: {
  theme: Theme
  locale: Locale
  children: React.ReactNode
}) {
  // Seeded from the server once. After that this is the source of truth: it is
  // the only thing that writes either preference, so there is nothing to sync
  // back from and a later render cannot contradict it.
  const [theme, setThemeState] = useState(initialTheme)
  const [locale, setLocaleState] = useState(initialLocale)

  const value = useMemo<Preferences>(
    () => ({
      theme,
      locale,
      t: translator(locale),

      chooseTheme(next) {
        if (next === theme) return
        setThemeState(next)

        // The shell put this attribute on <html> during SSR. React does not own
        // that element after hydration, so it is kept in step by hand.
        const root = document.documentElement
        if (next === 'system') root.removeAttribute('data-theme')
        else root.dataset.theme = next

        void setTheme({ data: { theme: next } })
      },

      chooseLocale(next) {
        if (next === locale) return
        setLocaleState(next)
        document.documentElement.lang = next

        void setLocale({ data: { locale: next } })
      },
    }),
    [theme, locale],
  )

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const value = useContext(PreferencesContext)

  if (!value) {
    throw new Error('usePreferences must be used inside PreferencesProvider')
  }

  return value
}
