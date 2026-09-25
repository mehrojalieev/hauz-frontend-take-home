import { createContext, useContext, useMemo, useState } from 'react'

import { setLocale, setTheme } from '#/server/preferences'
import { translator, type Locale, type Translate } from '#/shared/i18n'
import type { Theme } from '#/shared/theme'

/**
 * Both start on the server, so a hard refresh cannot flash the wrong one.
 * Changing them afterwards used to re-run the root loader, which asked Appwrite
 * who was signed in — 814ms to pick a colour. Now the choice applies here and
 * the cookie is written in the background, with nobody waiting on it.
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
  // Seeded once, then the source of truth: nothing else writes either
  // preference, so a later render cannot contradict it.
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

        // React does not own <html> after hydration, so this is by hand.
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
