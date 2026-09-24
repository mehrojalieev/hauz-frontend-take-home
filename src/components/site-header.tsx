import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouteContext, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import {
  GlobeIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from '#/components/icons'
import { Menu } from '#/components/menu'
import { refreshShell } from '#/lib/shell'
import { usePreferences } from '#/components/preferences'
import { signOut } from '#/server/session'
import { LOCALES, LOCALE_LABELS } from '#/shared/i18n'
import { THEMES, type Theme } from '#/shared/theme'

/** The leading icon says which one is in effect without reading the label. */
const THEME_ICONS: Record<Theme, typeof SunIcon> = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
}

/**
 * Reads what the root route resolved during SSR, so all of this renders
 * correctly in the very first HTML rather than after hydration. Fetching the
 * person in an effect would paint "Sign in" and correct it a moment later,
 * which is the flash the brief rules out.
 */
export function SiteHeader() {
  const { viewer } = useRouteContext({ from: '__root__' })
  const { theme, locale, t, chooseTheme, chooseLocale } = usePreferences()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [leaving, setLeaving] = useState(false)
  const ThemeIcon = THEME_ICONS[theme]

  async function handleSignOut() {
    if (leaving) return
    setLeaving(true)

    try {
      await signOut()
      // Re-runs the root beforeLoad. Without it the header keeps rendering the
      // person who just left.
      await refreshShell(router, queryClient)
      await router.navigate({ to: '/' })
    } finally {
      setLeaving(false)
    }
  }

  return (
    <header>
      <Link to="/" className="brand">
        HAUZ
      </Link>

      <div className="tools">
        {/* Naming all three states beats a cycling button, which hid two of
            them behind a guess about what came next. */}
        <Menu
          label={t('nav.appearance')}
          value={theme}
          options={THEMES.map((option) => ({
            value: option,
            label: t(`theme.${option}`),
          }))}
          onChange={chooseTheme}
          leading={<ThemeIcon />}
        />

        <Menu
          label={t('nav.language')}
          value={locale}
          options={LOCALES.map((option) => ({
            value: option,
            label: LOCALE_LABELS[option],
          }))}
          onChange={chooseLocale}
          leading={<GlobeIcon />}
        />
      </div>

      {viewer.state === 'ready' && (
        <>
          <span className="who">{viewer.account.firstName}</span>
          <button type="button" onClick={handleSignOut} disabled={leaving}>
            <LogOutIcon />
            {leaving ? t('nav.loggingOut') : t('nav.logOut')}
          </button>
        </>
      )}

      {/* Signed in, but they have not told us their name yet. The address they
          signed in with beats an empty space, and the way out still has to be
          there. */}
      {viewer.state === 'onboarding' && (
        <>
          <span className="who">{viewer.user.email}</span>
          <button type="button" onClick={handleSignOut} disabled={leaving}>
            <LogOutIcon />
            {leaving ? t('nav.loggingOut') : t('nav.logOut')}
          </button>
        </>
      )}

      {viewer.state === 'signed-out' && (
        <Link to="/signin" className="cta">
          {t('nav.signIn')}
        </Link>
      )}

      {/* We asked and did not get an answer. Offering "Sign in" here would be a
          guess, and a wrong guess costs somebody a session they still have, so
          say only what is true. */}
      {viewer.state === 'unknown' && (
        <span role="status">{t('nav.authUnavailable')}</span>
      )}
    </header>
  )
}
