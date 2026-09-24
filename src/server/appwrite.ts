import { Client } from 'node-appwrite'

/**
 * Every Appwrite call this app makes goes through one of these clients, and all
 * of them run on the server. Nothing in this file may be imported by a
 * component: the API key and the session secret must never reach the browser.
 *
 * Three rules are encoded here.
 *
 * 1. A Client is built per call and never held at module scope. `setSession()`
 *    mutates the instance, so a shared client would carry one visitor's session
 *    into the next request. Appwrite's own guidance is to never share a Client
 *    between two requests.
 *
 * 2. `process.env` is read inside the functions rather than at module scope. A
 *    module-scope read is easier for a bundler to inline into the client
 *    bundle, and on edge runtimes the environment is injected per request, so
 *    it is not populated when the module first evaluates.
 *
 * 3. The admin key is the exception, not the default. Once somebody is signed
 *    in, every call uses `userClient()`, which can only ever act as them.
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
 * Carries no credentials at all.
 *
 * This exists for the first step of sign-in. `createEmailToken` returns the
 * one-time code in its response body when it is called with an API key, and a
 * code that reaches our server is a code that can leak from it. Called without
 * a key, the returned secret stays empty and only the inbox has the code.
 */
export function guestClient() {
  return configured()
}

/**
 * Acts as the project itself and bypasses every permission check. Reserved for
 * the parts of sign-in that happen before a session exists.
 */
export function adminClient() {
  const apiKey = process.env.APPWRITE_API_KEY

  if (!apiKey) {
    throw new Error('APPWRITE_API_KEY must be set. See .env.example.')
  }

  return configured().setKey(apiKey)
}

/**
 * Acts as the signed-in person and nothing more.
 *
 * This is also how the Function gets called. It is deployed with execute access
 * `users`, so an execution made with an API key would arrive carrying no
 * principal and be answered 401.
 */
export function userClient(sessionSecret: string) {
  return configured().setSession(sessionSecret)
}
