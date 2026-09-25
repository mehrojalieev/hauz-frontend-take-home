import { useEffect, useRef } from 'react'

/**
 * Six boxes over one string: index `i` shows `value[i]`, and typing only fills
 * left to right so there are never gaps.
 *
 * Handlers read and write `latest` rather than the `value` prop because React
 * batches, and a fast burst would otherwise see the value from before the
 * previous keystroke. Typing "866095" quickly produced "605".
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

  // Honest when the value changes from outside, such as a rejected code.
  useEffect(() => {
    latest.current = value
  }, [value])

  // The step just opened, or a code was rejected and cleared. Both want the
  // caret in the first box rather than nowhere.
  useEffect(() => {
    if (!value && !disabled) boxes.current[0]?.focus()
  }, [value, disabled])

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
          // Only the first box, or the browser fills every box with all six.
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
            // Autofill can arrive through onChange, so more than one digit is
            // treated as a fill.
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
            // From the start: people copy the whole code, not its tail.
            handleFill(event.clipboardData.getData('text'), 0)
          }}
        />
      ))}
    </div>
  )
}
