import { useEffect, useRef } from 'react'

/**
 * Six digits, six boxes.
 *
 * One field would have been less code. It would also have been worse at the one
 * job it has: a code copied out of an email arrives with spaces or a
 * non-breaking space, phones offer the wrong keyboard for a text input, and a
 * wrong digit in the middle of a six character string is hard to spot.
 *
 * The value stays one string and the boxes are a view onto it, so the form
 * holds a single piece of state and the server validates the same thing the
 * person sees. Index `i` shows `value[i]`; there are never gaps, because typing
 * only ever fills left to right.
 *
 * Every handler reads and writes `latest` rather than the `value` prop. React
 * batches state updates, so during fast typing — or a paste that arrives as
 * six separate key events — each handler would otherwise see the value from
 * before the previous keystroke and overwrite it. That is not theoretical:
 * typing "866095" quickly produced "605".
 */

const LENGTH = 6

/** Anything that is not a digit is noise, wherever it came from. */
function digitsOnly(text: string) {
  return text.replace(/\D/g, '').slice(0, LENGTH)
}

export function CodeInput({
  id,
  value,
  onChange,
  onComplete,
  disabled,
}: {
  id: string
  value: string
  onChange: (next: string) => void
  onComplete?: (code: string) => void
  disabled?: boolean
}) {
  const boxes = useRef<Array<HTMLInputElement | null>>([])
  const latest = useRef(value)

  // Keeps the ref honest when the value changes from outside, such as the form
  // clearing it after a wrong code.
  useEffect(() => {
    latest.current = value
  }, [value])

  useEffect(() => {
    if (value.length === LENGTH) onComplete?.(value)
    // Fires for a finished code, not for every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function commit(next: string) {
    latest.current = next
    onChange(next)
  }

  function focusBox(index: number) {
    boxes.current[Math.max(0, Math.min(index, LENGTH - 1))]?.focus()
  }

  function handleDigit(index: number, digit: string) {
    const current = latest.current

    // Replace in place, or append if they are at the end of what is typed.
    const next =
      index < current.length
        ? current.slice(0, index) + digit + current.slice(index + 1)
        : (current + digit).slice(0, LENGTH)

    commit(next)
    focusBox(index + 1)
  }

  function handleBackspace(index: number) {
    const current = latest.current

    if (current[index]) {
      commit(current.slice(0, index) + current.slice(index + 1))
      return
    }

    if (index > 0) {
      commit(current.slice(0, index - 1) + current.slice(index))
      focusBox(index - 1)
    }
  }

  function handleFill(text: string, from: number) {
    const digits = digitsOnly(text)
    if (!digits) return

    const current = latest.current
    const next = (current.slice(0, from) + digits).slice(0, LENGTH)

    commit(next)
    focusBox(next.length)
  }

  return (
    <div className="code" role="group">
      {Array.from({ length: LENGTH }, (_, index) => (
        <input
          key={index}
          id={index === 0 ? id : `${id}-${index}`}
          ref={(node) => {
            boxes.current[index] = node
          }}
          type="text"
          inputMode="numeric"
          // Only the first box advertises it, or the browser offers to put the
          // whole code into every box.
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`${index + 1} / ${LENGTH}`}
          maxLength={1}
          disabled={disabled}
          value={value[index] ?? ''}
          onFocus={(event) => {
            event.target.select()
            // Clicking an empty box past the end would leave a gap, so the
            // caret goes to the first box still waiting for a digit.
            const end = Math.min(latest.current.length, LENGTH - 1)
            if (index > end) focusBox(end)
          }}
          onChange={(event) => {
            const typed = digitsOnly(event.target.value)
            if (!typed) return
            // Autofill and some browsers deliver a paste through onChange, so
            // anything longer than a digit is treated as a fill.
            if (typed.length > 1) handleFill(typed, index)
            else handleDigit(index, typed)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Backspace') {
              event.preventDefault()
              handleBackspace(index)
            } else if (event.key === 'ArrowLeft') {
              event.preventDefault()
              focusBox(index - 1)
            } else if (event.key === 'ArrowRight') {
              event.preventDefault()
              focusBox(index + 1)
            }
          }}
          onPaste={(event) => {
            event.preventDefault()
            // Pasting anywhere fills from the start: people copy the whole
            // code, not the tail of it.
            handleFill(event.clipboardData.getData('text'), 0)
          }}
        />
      ))}
    </div>
  )
}
