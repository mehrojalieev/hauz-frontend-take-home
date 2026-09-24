import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'

/**
 * Two cookies, both HttpOnly, both written and read only on the server.
 *
 * The session cookie holds the Appwrite session secret. That secret is a bearer
 * token: whoever holds it is that person. HttpOnly does not stop an XSS bug,
 * but it stops the token being copied out of the page, which turns a permanent
 * account takeover into something that ends when the tab closes.
 *
 * `__Host-` would be the stronger name. It forces Secure, pins the cookie to
 * this exact origin and forbids a Domain attribute, so a hostile subdomain
 * cannot overwrite it. It cannot be used in development, though: the prefix
 * requires Secure, and over plain http://localhost Chrome rejects `__Host-`
 * cookies outright while Safari rejects Secure cookies altogether. Only Firefox
 * accepts both. Hard-coding the prefix would leave the app broken for anyone
 * running `npm run dev` in Chrome or Safari, so the name and the Secure flag
 * are decided together, per environment.
 */

const SESSION = 'hauz_session'
const PENDING_SIGN_IN = 'hauz_pending_sign_in'

/** Appwrite's emailed code is valid for 15 minutes; the cookie matches it. */
const PENDING_SIGN_IN_MAX_AGE = 15 * 60

function isSecure() {
  return process.env.NODE_ENV === 'production'
}

function named(base: string) {
  return isSecure() ? `__Host-${base}` : base
}

function options(maxAge: number) {
  return {
    httpOnly: true,
    secure: isSecure(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

/** Seconds from now until `expiresAt`, floored at zero. */
function secondsUntil(expiresAt: string) {
  const seconds = Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0
}

/**
 * The cookie is given the session's own lifetime. Letting it outlive the
 * session would leave people looking signed in while every request answers 401.
 */
export function writeSessionCookie(secret: string, expiresAt: string) {
  setCookie(named(SESSION), secret, options(secondsUntil(expiresAt)))
}

export function readSessionCookie() {
  return getCookie(named(SESSION))
}

export function clearSessionCookie() {
  deleteCookie(named(SESSION), options(0))
}

/**
 * Sign-in takes two requests: one that sends the code, one that redeems it.
 * Appwrite needs the user id from the first in the second, so the server parks
 * it here rather than handing it to the browser. The id never reaches client
 * code and the browser cannot swap it for somebody else's, which keeps this
 * consistent with the rest of the app: identity is never something the client
 * gets to assert.
 */
export function writePendingSignInCookie(userId: string) {
  setCookie(
    named(PENDING_SIGN_IN),
    userId,
    options(PENDING_SIGN_IN_MAX_AGE),
  )
}

export function readPendingSignInCookie() {
  return getCookie(named(PENDING_SIGN_IN))
}

export function clearPendingSignInCookie() {
  deleteCookie(named(PENDING_SIGN_IN), options(0))
}
