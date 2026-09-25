import { Client } from 'node-appwrite'

/**
 * Every Appwrite call happens through one of these, on the server. No component
 * may import this file.
 *
 * A Client is built per call, never at module scope: `setSession()` mutates the
 * instance, so a shared one would carry a visitor's session into the next
 * request. `process.env` is read inside the functions for the same reason a
 * bundler should never see it at module scope.
 */

function configured() {
  const endpoint = process.env.APPWRITE_ENDPOINT
  const projectId = process.env.APPWRITE_PROJECT_ID

  if (!endpoint || !projectId) {
    throw new Error(
      'APPWRITE_ENDPOINT and APPWRITE_PROJECT_ID must be set. See .env.example.',
    )
  }

  return new Client().setEndpoint(endpoint).setProject(projectId)
}

/**
 * No credentials. `createEmailToken` returns the one-time code in its response
 * body when called with an API key, and a code that reaches this process can
 * leak from it.
 */
export function guestClient() {
  return configured()
}

/** Bypasses every permission check. Only for sign-in, before a session exists. */
export function adminClient() {
  const apiKey = process.env.APPWRITE_API_KEY

  if (!apiKey) {
    throw new Error('APPWRITE_API_KEY must be set. See .env.example.')
  }

  return configured().setKey(apiKey)
}

/**
 * Acts as the signed-in person and nothing more. Also how the Function is
 * called: with execute access `users`, an API key execution carries no
 * principal and is answered 401.
 */
export function userClient(sessionSecret: string) {
  return configured().setSession(sessionSecret)
}
