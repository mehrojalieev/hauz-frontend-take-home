/**
 * Where to send somebody after they sign in.
 *
 * The brief says to send people to whatever page the `redirect` query parameter
 * names. Taken at its word that is an open redirect, and the attack is cheap:
 *
 *   https://hauz.uz/signin?redirect=https://hauz-uz.com/login
 *
 * The person checks the domain, sees the real HAUZ, signs in for real, and is
 * handed to a copy that tells them their session expired and asks again. The
 * domain was right the whole time, so nothing looked wrong. A marketplace where
 * people sign in to talk about money is exactly where that pays.
 *
 * So the parameter is a request, not an instruction. Only a path inside this
 * app is honoured, and anything else quietly becomes the home page. This is an
 * allowlist by shape rather than a blocklist of tricks, because the tricks are
 * endless: `//evil.com` is protocol relative and resolves off-site, a backslash
 * is treated as a slash by some parsers, a newline can split a header, and
 * `javascript:` does not need a host at all.
 *
 * The shape check alone is not the whole answer, and a bug made that concrete:
 * a checked path is still only a string, and handing a string to the router as
 * `href` produced a not-found instead of a navigation. So the check ends in a
 * list of the routes worth returning to. The result is one of two literals,
 * which means the router can be given `to` and TypeScript verifies the
 * destination exists.
 *
 * `/signin` and `/onboarding` are deliberately not returnable; sending someone
 * back to where they just came from is a loop, not a courtesy.
 */
const RETURNABLE = ['/', '/profile'] as const

export type ReturnTo = (typeof RETURNABLE)[number]

export function safeRedirect(raw: unknown): ReturnTo {
  if (typeof raw !== 'string' || raw === '') return '/'

  // One decode, because `%2F%2Fevil.com` is the same trick wearing a hat. Only
  // one: decoding repeatedly would unwrap escapes the browser never would.
  let path: string
  try {
    path = decodeURIComponent(raw)
  } catch {
    // Malformed escapes. Nothing good is on the other side of this.
    return '/'
  }

  if (!path.startsWith('/')) return '/' // absolute URL, or a scheme
  if (path.startsWith('//')) return '/' // protocol relative: resolves off-site
  if (path.includes('\\')) return '/' // some parsers read this as a slash
  if (path.includes('://')) return '/' // a scheme smuggled past the first check
  if (/[\u0000-\u001f\u007f]/.test(path)) return '/' // control chars, CRLF

  // The shape is fine. Now: is it somewhere we actually return people to?
  const route = path.split(/[?#]/)[0]

  return RETURNABLE.includes(route as ReturnTo) ? (route as ReturnTo) : '/'
}

/**
 * The same thing, shaped for a URL: the home page is the default, so saying so
 * in a query string is noise. `undefined` keeps `?redirect=%2F` off links that
 * have nowhere particular to return to.
 */
export function redirectParam(raw: unknown): ReturnTo | undefined {
  const path = safeRedirect(raw)
  return path === '/' ? undefined : path
}
