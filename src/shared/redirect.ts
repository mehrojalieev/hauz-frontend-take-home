/**
 * Where to send somebody after they sign in.
 *
 * Honouring the `redirect` parameter as written is an open redirect:
 * `?redirect=https://hauz-uz.com/login` signs you in on the real domain and
 * hands you to a copy. So the shape is checked, and then the result is matched
 * against the routes worth returning to — which makes the return type a union
 * of two literals, so the router gets `to` and TypeScript checks it exists.
 * See NOTES.md.
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
