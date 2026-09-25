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
      // One family, loaded at runtime rather than at build time, so a slow or
      // blocked font host costs glyphs and nothing else. There is a real
      // fallback stack in the stylesheet.
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

  // Runs on the server while the page is being rendered, before any HTML
  // exists. That is what makes both the header and the palette right on the
  // first paint rather than corrected after hydration. Every child route reads
  // this same value, so no two parts of the page can disagree.
  //
  // Through the query cache, because resolving it costs a call to Appwrite and
  // an execution of the Function, and moving between four screens should not
  // pay that each time.
  beforeLoad: async ({ context }) =>
    await context.queryClient.ensureQueryData(shellQueryOptions()),

  component: RootLayout,
  errorComponent: Fault,
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

/**
 * The root loader failed, which in practice means the server function itself
 * could not be reached; anything Appwrite refuses is already handled inside it
 * and comes back as `unknown`. Saying so is the point: the session is still
 * good, and an error screen that implies otherwise would send people to sign in
 * again for nothing.
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

/**
 * Replaces the root component rather than rendering inside it, so there is no
 * header here and no preferences context to read from. The language is taken
 * off the router state the same way the shell takes it, which is the one thing
 * still available this far out.
 */
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

/**
 * Anything that depends on route context belongs here rather than in the shell
 * below: the shell also wraps the error and not-found components, which render
 * in situations where the context this needs may never have been produced.
 */
function RootLayout() {
  const { theme, locale } = Route.useRouteContext()

  // Resolving a route can mean a call to Appwrite and an execution of the
  // Function. That is long enough that saying nothing reads as a dead click.
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
  // Read off the router state rather than with useRouteContext, because the
  // shell also wraps the error and not-found components, and those render in
  // situations where the root context may never have been produced. Missing
  // values fall back to the device's own palette and the default language,
  // which beats the error page failing to render at all.
  const preferences = useRouterState({
    select: (state) => ({
      theme: state.matches[0]?.context.theme,
      locale: state.matches[0]?.context.locale,
    }),
  })

  return (
    // Only an explicit choice is stamped. Leaving the attribute off for
    // `system` is what lets prefers-color-scheme decide, which is the point of
    // having three states rather than a boolean.
    <html
      lang={preferences.locale ?? 'uz'}
      data-theme={
        preferences.theme === 'system' ? undefined : preferences.theme
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
