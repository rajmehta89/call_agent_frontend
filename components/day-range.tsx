'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown, X } from 'lucide-react'

/** A day filter shared by the inbox, status views, tasks and call history. Days are the viewer's local days. */
export type DayRange = { id: 'any' | 'today' | 'yesterday' | '7d' | '30d' | 'date'; date?: string }
export const ANY_TIME: DayRange = { id: 'any' }

const OPTIONS: { id: DayRange['id']; label: string }[] = [
  { id: 'any', label: 'Any time' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
]

const midnight = (daysAgo: number) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - daysAgo); return date }
const localIso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Start (inclusive) and end (exclusive) of the range; both undefined for "Any time". */
export function rangeBounds(range: DayRange): { since?: Date; until?: Date } {
  switch (range.id) {
    case 'today': return { since: midnight(0) }
    case 'yesterday': return { since: midnight(1), until: midnight(0) }
    case '7d': return { since: midnight(6) }
    case '30d': return { since: midnight(29) }
    case 'date': {
      if (!range.date) return {}
      const since = new Date(`${range.date}T00:00:00`)
      const until = new Date(since); until.setDate(until.getDate() + 1)
      return { since, until }
    }
    default: return {}
  }
}

/** Query-string part for the inbox API (`&since=…&until=…`, UTC ISO); empty for "Any time". */
export function rangeQuery(range: DayRange): string {
  const { since, until } = rangeBounds(range)
  return `${since ? `&since=${encodeURIComponent(since.toISOString())}` : ''}${until ? `&until=${encodeURIComponent(until.toISOString())}` : ''}`
}

/** Whether a time falls in the range. */
export function inRange(range: DayRange, value?: string | null): boolean {
  const { since, until } = rangeBounds(range)
  if (!since && !until) return true
  if (!value) return false
  const at = new Date(value)
  return (!since || at >= since) && (!until || at < until)
}

/** Short label, e.g. "Today", "Last 7 days", "Mon 20 Oct". */
export function rangeLabel(range: DayRange): string {
  if (range.id === 'date' && range.date) return new Date(`${range.date}T12:00:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
  return OPTIONS.find((option) => option.id === range.id)?.label || 'Any time'
}

/** Dropdown button: preset days plus "Pick a date". */
export function DayRangeMenu({ value, onChange, className = '', compact = false }: { value: DayRange; onChange: (range: DayRange) => void; className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape) }
  }, [open])
  const pick = (range: DayRange) => { onChange(range); setOpen(false) }
  const active = value.id !== 'any'

  return <div ref={box} className={`relative ${className}`}>
    <div className={`flex ${compact ? 'h-9 text-[13px]' : 'h-10 text-sm'} items-center rounded-xl border font-semibold transition ${active ? 'border-[#6C3BFF] bg-[#F1EBFF] text-[#5A2BE6]' : 'border-[#E9DFFF] bg-white text-slate-600 hover:border-[#D8C8FF]'}`}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} className="flex h-full min-w-0 flex-1 items-center gap-2 pl-3 pr-2">
        <CalendarDays className="h-4 w-4 shrink-0" /><span className="truncate">{rangeLabel(value)}</span>{!active && <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-400" />}
      </button>
      {active && <button type="button" aria-label="Clear the day filter" title="Show any time" onClick={() => onChange(ANY_TIME)} className="mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-white"><X className="h-3.5 w-3.5" /></button>}
    </div>
    {open && <div role="menu" className="absolute left-0 z-30 mt-1.5 w-60 max-w-[calc(100vw-32px)] rounded-xl border border-[#E9DFFF] bg-white p-1.5 shadow-[0_18px_40px_-20px_rgba(70,35,117,.45)]">
      {OPTIONS.map((option) => <button key={option.id} type="button" role="menuitemradio" aria-checked={value.id === option.id} onClick={() => pick({ id: option.id })}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[#F8F5FF] ${value.id === option.id ? 'font-semibold text-[#5A2BE6]' : 'text-slate-700'}`}>{option.label}{value.id === option.id && <Check className="h-4 w-4" />}</button>)}
      <label className="mt-1 block border-t border-[#F1EBFF] px-3 pb-1.5 pt-2.5 text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">Pick a date
        <input type="date" max={localIso(new Date())} value={value.id === 'date' ? value.date || '' : ''} onChange={(event) => event.target.value && pick({ id: 'date', date: event.target.value })}
          className="mt-1.5 h-9 w-full rounded-lg border border-[#E9DFFF] px-2 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-[#6C3BFF]" />
      </label>
    </div>}
  </div>
}
