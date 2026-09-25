import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'

/**
 * HttpOnly, written and read only on the server. The session secret is a bearer
 * token, and HttpOnly is what stops an XSS bug copying it out of the page.
 *
 * `__Host-` is the stronger name but cannot be hard-coded: it requires Secure,
 * and over http://localhost Chrome rejects `__Host-` while Safari rejects
 * Secure entirely. So the name and the flag are chosen together, per
 * environment, or `npm run dev` would be broken in two browsers out of three.
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

/** Given the session's own lifetime, or people look signed in while every
 * request answers 401. */
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
 * The user id that ties the two sign-in requests together is parked here rather
 * than handed to the browser: identity is never something the client asserts.
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

/**
 * Not secrets, but read on the server so both are settled before the first byte
 * of HTML — the same reason the header knows who is signed in.
 */
const THEME = 'hauz_theme'
const LOCALE = 'hauz_locale'
const PREFERENCE_MAX_AGE = 365 * 24 * 60 * 60

export function writeThemeCookie(theme: string) {
  setCookie(named(THEME), theme, options(PREFERENCE_MAX_AGE))
}

export function readThemeCookie() {
  return getCookie(named(THEME))
}

export function writeLocaleCookie(locale: string) {
  setCookie(named(LOCALE), locale, options(PREFERENCE_MAX_AGE))
}

export function readLocaleCookie() {
  return getCookie(named(LOCALE))
}
