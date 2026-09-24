import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from '@tanstack/react-router'

import { SiteHeader } from '#/components/site-header'
import { loadShell } from '#/server/session'
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
  beforeLoad: async () => await loadShell(),

  component: RootLayout,
  shellComponent: RootDocument,
})

/**
 * Anything that depends on route context belongs here rather than in the shell
 * below: the shell also wraps the error and not-found components, which render
 * in situations where the context this needs may never have been produced.
 */
function RootLayout() {
  return (
    <>
      <SiteHeader />
      <Outlet />
    </>
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
