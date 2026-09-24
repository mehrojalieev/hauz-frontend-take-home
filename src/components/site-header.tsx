import { Link, useRouteContext, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import {
  ChevronDownIcon,
  GlobeIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from '#/components/icons'
import { setLocale, setTheme } from '#/server/preferences'
import { signOut } from '#/server/session'
import {
  LOCALES,
  LOCALE_LABELS,
  translator,
  type Locale,
} from '#/shared/i18n'
import { THEMES, type Theme } from '#/shared/theme'

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
  const { viewer, theme, locale } = useRouteContext({ from: '__root__' })
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)
  const t = translator(locale)

  // Both preferences live in cookies the server reads, so the page is
  // re-resolved rather than patched in the browser. That is also what stops a
  // later hard refresh from flashing the setting they just left.
  async function chooseTheme(next: Theme) {
    if (next === theme) return
    await setTheme({ data: { theme: next } })
    await router.invalidate()
  }

  async function chooseLocale(next: Locale) {
    if (next === locale) return
    await setLocale({ data: { locale: next } })
    await router.invalidate()
  }

  async function handleSignOut() {
    if (leaving) return
    setLeaving(true)

    try {
      await signOut()
      // Re-runs the root beforeLoad. Without it the header keeps rendering the
      // person who just left.
      await router.invalidate()
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
        {/* Three states shown as three targets. A cycling button hides two of
            them behind guesswork about what comes next. */}
        <div className="segmented" role="group" aria-label={t('nav.appearance')}>
          {THEMES.map((option) => {
            const Icon = THEME_ICONS[option]
            return (
              <button
                key={option}
                type="button"
                aria-pressed={option === theme}
                aria-label={t(`theme.${option}`)}
                title={t(`theme.${option}`)}
                onClick={() => chooseTheme(option)}
              >
                <Icon />
              </button>
            )
          })}
        </div>

        <div className="select">
          <GlobeIcon />
          <select
            aria-label={t('nav.language')}
            value={locale}
            onChange={(event) => chooseLocale(event.target.value as Locale)}
          >
            {LOCALES.map((option) => (
              <option key={option} value={option}>
                {LOCALE_LABELS[option]}
              </option>
            ))}
          </select>
          <ChevronDownIcon size={14} />
        </div>
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
