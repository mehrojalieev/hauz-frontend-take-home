/**
 * A request that never answers is neither a refusal nor a rejection: the
 * promise stays pending and the button sits on "Saving…" until someone
 * reloads. Calls get a deadline, reported like any other unreachable server.
 */
/**
 * Thirty seconds is where Appwrite gives up on a synchronous execution, so
 * anything shorter would call a request failed while the platform was still
 * working on it. A warm Function answers in ~300ms; a cold start measured 12s.
 */
const DEFAULT_MS = 30_000

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`No answer within ${ms}ms`)
    this.name = 'TimeoutError'
  }
}

export function withTimeout<T>(work: Promise<T>, ms = DEFAULT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms)

    work.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (cause) => {
        clearTimeout(timer)
        reject(cause)
      },
    )
  })
}
