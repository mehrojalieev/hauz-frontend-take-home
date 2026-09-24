import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'

import { SiteHeader } from '#/components/site-header'
import { loadViewer } from '#/server/session'
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
      // Loaded at runtime, not at build time, so a slow or blocked font host
      // delays glyphs and nothing else. Both families have a real fallback
      // stack in the stylesheet.
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),

  // This HTML names the person looking at it, so it is not something a CDN or
  // proxy may keep and hand to whoever asks next.
  headers: () => ({ 'Cache-Control': 'private, no-store' }),

  // Runs on the server while the page is being rendered, before any HTML
  // exists. That is what makes the header right on the first paint instead of
  // corrected after hydration. Every child route reads this same value, so no
  // two parts of the page can disagree about who is signed in.
  beforeLoad: async () => ({ viewer: await loadViewer() }),

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
  return (
    <html lang="en">
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
