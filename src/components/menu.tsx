import { useEffect, useId, useRef, useState } from 'react'

import { CheckIcon, ChevronDownIcon } from '#/components/icons'

/**
 * A small listbox menu, built rather than borrowed.
 *
 * A native <select> would have been free and correct, and it is what this
 * replaced. Once the menu has to be styled and animated, though, the platform
 * stops offering a way in, and everything the platform was doing quietly has to
 * be done again by hand. That is the actual cost of a custom dropdown, and it
 * is paid here rather than skipped:
 *
 *   - the trigger is a button that reports its state (aria-expanded) and what
 *     it opens (aria-haspopup, aria-controls)
 *   - the list is a listbox, each row an option that reports aria-selected, so
 *     a screen reader announces "2 of 3, selected" rather than reading buttons
 *   - the keyboard works: Enter, Space or ArrowDown opens onto the current
 *     choice, arrows move, Home and End jump, Escape closes and hands focus
 *     back, Tab closes rather than walking into a floating list
 *   - closed means `visibility: hidden`, which takes the rows out of the tab
 *     order for real instead of merely hiding them, while still allowing the
 *     open and close to animate
 *   - a pointer press anywhere else closes it
 *
 * It renders closed on the server and stays closed through hydration, so there
 * is nothing here for SSR to disagree about.
 */

export type MenuOption<T extends string> = {
  value: T
  label: string
}

export function Menu<T extends string>({
  label,
  value,
  options,
  onChange,
  leading,
}: {
  /** Names the control for assistive technology; never shown. */
  label: string
  value: T
  options: ReadonlyArray<MenuOption<T>>
  onChange: (next: T) => void
  leading?: React.ReactNode
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  // Whether the active row changed because of a key press. Hovering moves the
  // highlight, but it must not move focus: a pointer user who brushes the list
  // while typing should not have the caret yanked out from under them.
  const byKeyboard = useRef(true)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const rows = useRef<Array<HTMLButtonElement | null>>([])

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  const selected = options[selectedIndex]

  // Moving focus has to wait for the rows to become focusable, which only
  // happens once the open state has painted.
  useEffect(() => {
    if (open && byKeyboard.current) rows.current[active]?.focus()
  }, [open, active])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function openMenu(index = selectedIndex, keyboard = true) {
    byKeyboard.current = keyboard
    setActive(index)
    setOpen(true)
  }

  function closeMenu(returnFocus = true) {
    setOpen(false)
    if (returnFocus) trigger.current?.focus()
  }

  function choose(next: T) {
    closeMenu()
    if (next !== value) onChange(next)
  }

  function onTriggerKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openMenu()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu(options.length - 1)
    }
  }

  function onListKeyDown(event: React.KeyboardEvent) {
    byKeyboard.current = true

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActive((index) => (index + 1) % options.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setActive((index) => (index - 1 + options.length) % options.length)
        break
      case 'Home':
        event.preventDefault()
        setActive(0)
        break
      case 'End':
        event.preventDefault()
        setActive(options.length - 1)
        break
      case 'Escape':
        event.preventDefault()
        closeMenu()
        break
      case 'Tab':
        // Let focus leave, but do not leave a floating list behind it.
        closeMenu(false)
        break
    }
  }

  return (
    <div className="menu" ref={root}>
      <button
        type="button"
        className="menu-trigger"
        ref={trigger}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        {leading}
        <span className="menu-value">{selected?.label}</span>
        <ChevronDownIcon size={14} />
      </button>

      <div
        className="menu-list"
        id={listId}
        role="listbox"
        aria-label={label}
        data-open={open}
        onKeyDown={onListKeyDown}
      >
        {options.map((option, index) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={option.value === value}
            tabIndex={index === active ? 0 : -1}
            ref={(node) => {
              rows.current[index] = node
            }}
            onClick={() => choose(option.value)}
            onMouseEnter={() => {
              byKeyboard.current = false
              setActive(index)
            }}
          >
            <span>{option.label}</span>
            {option.value === value && <CheckIcon size={15} />}
          </button>
        ))}
      </div>
    </div>
  )
}
