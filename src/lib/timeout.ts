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
/**
 * Thirty seconds, because that is where Appwrite gives up on a synchronous
 * execution. Anything shorter and we would call a call failed while the
 * platform was still working on it, which is a lie that costs somebody their
 * form. It is a long time to look at a spinner, and the progress bar and the
 * disabled button are what carry that; this is the ceiling, not the target. A
 * warm Function answers in about 300ms. A cold one was measured at 12 seconds.
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
