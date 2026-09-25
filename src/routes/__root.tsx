import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from '@tanstack/react-router'

import { PreferencesProvider } from '#/components/preferences'
import { SiteHeader } from '#/components/site-header'
import { shellQueryOptions } from '#/lib/shell'
import { parseLocale, translator } from '#/shared/i18n'
import appCss from '../styles.css?url'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'HAUZ' },
    ],
    links: [
      // At runtime, not build time, so a blocked font host costs glyphs only.
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),

  // This HTML names the person looking at it, so it is not something a CDN or
  // proxy may keep and hand to whoever asks next.
  headers: () => ({ 'Cache-Control': 'private, no-store' }),

  // Runs on the server before any HTML exists, which is what makes the header
  // and the palette right on the first paint. Every child route reads the same
  // value. Cached, because resolving it costs a call to Appwrite and a Function
  // execution.
  beforeLoad: async ({ context }) =>
    await context.queryClient.ensureQueryData(shellQueryOptions()),

  component: RootLayout,
  errorComponent: Fault,
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

/**
 * The root loader failed, which means the server function was unreachable —
 * anything Appwrite refuses is already handled inside it. The session is still
 * good, so the screen says so rather than implying otherwise.
 */
function Fault() {
  const locale = useRouterState({
    select: (state) => parseLocale(state.matches[0]?.context.locale),
  })
  const t = translator(locale)

  return (
    <main>
      <h1>{t('fault.title')}</h1>
      <p>{t('fault.body')}</p>
      <button type="button" onClick={() => window.location.reload()}>
        {t('fault.retry')}
      </button>
    </main>
  )
}

/** Replaces the root component, so there is no header and no preferences
 * context here; the language comes off the router state instead. */
function NotFound() {
  const locale = useRouterState({
    select: (state) => parseLocale(state.matches[0]?.context.locale),
  })
  const t = translator(locale)

  return (
    <main>
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.body')}</p>
      <Link to="/" className="cta">
        {t('notFound.home')}
      </Link>
    </main>
  )
}

/** Context-dependent UI belongs here, not in the shell, which also wraps the
 * error and not-found components. */
function RootLayout() {
  const { theme, locale } = Route.useRouteContext()

  // Long enough that saying nothing reads as a dead click.
  const busy = useRouterState({
    select: (state) => state.isLoading || state.status === 'pending',
  })

  return (
    <PreferencesProvider theme={theme} locale={locale}>
      <div className="progress" data-busy={busy} aria-hidden="true" />
      <SiteHeader />
      <Outlet />
    </PreferencesProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  // Router state rather than useRouteContext: the shell also wraps the error
  // and not-found components, which can render without root context.
  const preferences = useRouterState({
    select: (state) => ({
      theme: state.matches[0]?.context.theme,
      locale: state.matches[0]?.context.locale,
    }),
  })

  return (
    // No attribute for `system`, which is what hands the decision to the
    // device. Anything else, including a shell rendered without context, gets
    // the stored choice or the light default.
    <html
      lang={preferences.locale ?? 'uz'}
      data-theme={
        (preferences.theme ?? 'light') === 'system'
          ? undefined
          : (preferences.theme ?? 'light')
      }
    >
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
