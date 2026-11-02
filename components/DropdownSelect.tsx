'use client'

import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export type DropdownSelectOption = {
  value: string
  label: string
  icon?: ReactNode
  disabled?: boolean
}

export function DropdownSelect({
  value,
  options,
  onChange,
  ariaLabel,
  icon,
  size = 'compact',
  tone = 'neutral',
  className = '',
  menuMinWidth = 208,
  menuMaxWidth = 360,
  disabled = false,
}: {
  value: string
  options: DropdownSelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  icon?: ReactNode
  size?: 'compact' | 'regular'
  tone?: 'neutral' | 'brand'
  className?: string
  menuMinWidth?: number
  menuMaxWidth?: number
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const optionsRef = useRef(options)
  const optionCount = options.length
  optionsRef.current = options
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    if (!open) { setPlacement(null); return }
    const place = () => {
      const anchor = trigger.current?.getBoundingClientRect()
      if (!anchor) return

      const edge = 12
      const gap = 8
      const viewportWidth = Math.max(0, window.innerWidth - edge * 2)
      const width = Math.min(Math.max(anchor.width, menuMinWidth), menuMaxWidth, viewportWidth)
      const left = Math.min(Math.max(edge, anchor.left), window.innerWidth - width - edge)
      const height = menu.current?.scrollHeight || Math.max(40, optionCount * 40 + 8)
      const below = Math.max(0, window.innerHeight - anchor.bottom - gap - edge)
      const above = Math.max(0, anchor.top - gap - edge)
      const opensAbove = below < height && above > below
      const available = opensAbove ? above : below
      const maxHeight = Math.min(height, available)
      const top = opensAbove ? anchor.top - gap - maxHeight : anchor.bottom + gap

      setPlacement({ top, left, width, maxHeight })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [menuMaxWidth, menuMinWidth, open, optionCount])

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (!trigger.current?.contains(target) && !menu.current?.contains(target)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const currentOptions = optionsRef.current
    const selectedIndex = currentOptions.findIndex((option) => option.value === value && !option.disabled)
    const firstEnabledIndex = currentOptions.findIndex((option) => !option.disabled)
    const index = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex
    if (index < 0) return
    const frame = window.requestAnimationFrame(() => optionRefs.current[index]?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open, value])

  const closeAndPick = (option: DropdownSelectOption) => {
    if (option.disabled) return
    setOpen(false)
    onChange(option.value)
    trigger.current?.focus()
  }

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const enabled = optionsRef.current.map((option, index) => ({ option, index })).filter(({ option }) => !option.disabled)
    if (!enabled.length) return
    const active = enabled.findIndex(({ index }) => optionRefs.current[index] === document.activeElement)
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? enabled.length - 1
        : active < 0 ? 0
          : (active + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length
    optionRefs.current[enabled[next].index]?.focus()
  }

  const sizeClass = size === 'regular' ? 'h-10 px-3 text-sm' : 'h-8 px-2.5 text-[13px]'
  const toneClass = tone === 'brand'
    ? 'border-transparent bg-[#F1EBFF] text-[#5A2BE6] enabled:hover:bg-[#EDE6FF]'
    : 'border-[#E9DFFF] bg-white text-slate-700 enabled:hover:border-[#6C3BFF] enabled:hover:text-[#5A2BE6]'

  return <>
    <button
      ref={trigger}
      type="button"
      aria-label={ariaLabel}
      aria-haspopup="menu"
      aria-expanded={open}
      disabled={disabled}
      onClick={() => setOpen((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          setOpen(true)
        }
      }}
      className={`inline-flex min-w-0 items-center gap-2 rounded-lg border font-semibold text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]/25 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClass} ${toneClass} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1 truncate whitespace-nowrap">{selected?.label || 'Select'}</span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && typeof document !== 'undefined' && createPortal(<div
      ref={menu}
      role="menu"
      aria-label={ariaLabel}
      onKeyDown={handleMenuKeyDown}
      style={{
        position: 'fixed',
        top: placement?.top ?? 0,
        left: placement?.left ?? 0,
        width: placement?.width ?? Math.min(menuMinWidth, 320),
        maxHeight: placement?.maxHeight ?? 'calc(100vh - 24px)',
        visibility: placement ? 'visible' : 'hidden',
      }}
      className="z-[100] overflow-y-auto rounded-xl border border-[#E9DFFF] bg-white p-1 shadow-[0_18px_40px_-20px_rgba(70,35,117,.45)]"
    >
      {options.map((option, index) => <button
        key={option.value}
        ref={(element) => { optionRefs.current[index] = element }}
        type="button"
        role="menuitemradio"
        aria-checked={option.value === value}
        disabled={option.disabled}
        onClick={() => closeAndPick(option)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${option.disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#F8F5FF]'} ${option.value === value ? 'font-semibold text-[#5A2BE6]' : 'text-slate-700'}`}
      >
        {option.icon && <span className="shrink-0">{option.icon}</span>}
        <span className="min-w-0 flex-1 truncate whitespace-nowrap">{option.label}</span>
        {option.value === value && <Check className="h-4 w-4 shrink-0 text-[#6C3BFF]" />}
      </button>)}
    </div>, document.body)}
  </>
}
