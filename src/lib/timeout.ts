/**
 * A server call that never answers.
 *
 * Every mutation here handles a refusal and a rejection, but a request that
 * simply hangs is neither: the promise stays pending, the button stays on
 * "Saving…", and there is no way out but a reload. It happens for ordinary
 * reasons — a connection dropped mid-flight, a dev server restarting under an
 * in-flight request — and from the other side it looks like the app died.
 *
 * So calls are given a deadline. Passing it is reported the same way a network
 * failure is, because to the person waiting they are the same thing.
 */
const DEFAULT_MS = 20_000

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
