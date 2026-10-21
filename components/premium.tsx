'use client'

import Link from 'next/link'
import { ReactNode, useState } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, LucideIcon } from 'lucide-react'

/** Shared premium building blocks: every dashboard page uses these so they look and behave the same. */

export const initials = (name = '') => name.replace(/^\+/, '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'sm' ? 'h-7 w-7 text-[10px]' : size === 'lg' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs'
  return <span className={`flex ${box} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#5A2BE6] font-bold text-white shadow-[0_6px_14px_-8px_rgba(95,52,126,.9)]`}>{initials(name)}</span>
}

/** "+12% vs last week" pill; green-ish purple when up, muted when down. `invert` for metrics where down is good. */
export function Delta({ value, label = 'vs last week', invert = false }: { value?: number | null; label?: string; invert?: boolean }) {
  if (value === null || value === undefined) return <span className="text-[11px] text-slate-400">No earlier data</span>
  const up = value >= 0
  const good = invert ? !up : up
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold ${good ? 'bg-[#F1EBFF] text-[#6C3BFF]' : 'bg-slate-100 text-slate-500'}`}><Icon className="h-3 w-3" />{Math.abs(value)}%</span>{label}</span>
}

/** Tiny line chart for a stat card. */
export function Sparkline({ values, className = '' }: { values: number[]; className?: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${30 - (value / max) * 26}`).join(' ')
  return <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={`h-8 w-full ${className}`} aria-hidden="true">
    <defs><linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6C3BFF" stopOpacity=".28" /><stop offset="100%" stopColor="#6C3BFF" stopOpacity="0" /></linearGradient></defs>
    <polygon points={`0,32 ${points} 100,32`} fill="url(#spark-fill)" />
    <polyline points={points} fill="none" stroke="#6C3BFF" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
}

/** KPI card: icon, value, context line (delta or hint), optional sparkline, clickable when it has an href. */
export function Stat({ icon: Icon, label, value, delta, deltaInvert, hint, spark, href, tone = 'default' }: { icon: LucideIcon; label: string; value: ReactNode; delta?: number | null; deltaInvert?: boolean; hint?: ReactNode; spark?: number[]; href?: string; tone?: 'default' | 'alert' | 'live' }) {
  const body = <>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">{label}</div>
        <div className="mt-1.5 flex items-baseline gap-2 text-[28px] font-extrabold leading-none tracking-tight text-[#32136B]">{value}{tone === 'live' && <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8B5CF6] opacity-70" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#6C3BFF]" /></span>}</div>
      </div>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone === 'alert' ? 'bg-[#6C3BFF] text-white' : 'bg-[#F1EBFF] text-[#6C3BFF]'}`}><Icon className="h-5 w-5" /></span>
    </div>
    <div className="mt-3 min-h-[20px]">{delta !== undefined ? <Delta value={delta} invert={deltaInvert} /> : <span className="text-[11px] text-slate-500">{hint}</span>}</div>
    {spark && <Sparkline values={spark} className="mt-2" />}
  </>
  const style = 'premium-stat group relative block overflow-hidden rounded-2xl border border-[#E9DFFF] bg-white p-4 shadow-[0_18px_40px_-34px_rgba(73,35,117,.55)] transition'
  return href ? <Link href={href} className={`${style} hover:-translate-y-0.5 hover:border-[#D8C8FF] hover:shadow-[0_22px_44px_-30px_rgba(110,50,180,.55)]`}>{body}<ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-[#6C3BFF] opacity-0 transition group-hover:opacity-100" /></Link> : <div className={style}>{body}</div>
}

/** Card section with a title row (icon, title, subtitle, action). */
export function Panel({ icon: Icon, title, subtitle, action, children, className = '', bodyClassName = 'p-5' }: { icon?: LucideIcon; title: string; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return <section className={`overflow-hidden rounded-2xl border border-[#E9DFFF] bg-white shadow-[0_18px_40px_-34px_rgba(73,35,117,.55)] ${className}`}>
    <header className="flex items-center justify-between gap-3 border-b border-[#E9DFFF] px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1EBFF] text-[#6C3BFF]"><Icon className="h-[18px] w-[18px]" /></span>}
        <div className="min-w-0"><h2 className="truncate text-[15px] font-bold text-slate-900">{title}</h2>{subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
    <div className={bodyClassName}>{children}</div>
  </section>
}

export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#6C3BFF] transition hover:bg-[#F1EBFF]">{children}<ArrowRight className="h-3.5 w-3.5" /></Link>
}

/** Bar chart with hover tooltips. `secondary` draws a second (darker) bar inside each bar, e.g. failed calls. */
export function BarChart({ data, height = 180, secondaryLabel }: { data: { label: string; value: number; secondary?: number; title?: string }[]; height?: number; secondaryLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...data.map((item) => item.value), 1)
  const ticks = [max, Math.round(max / 2), 0]
  return <div className="relative">
    <div className="flex" style={{ height }}>
      <div className="flex w-7 shrink-0 flex-col justify-between pb-6 text-right text-[10px] text-slate-400">{ticks.map((tick, index) => <span key={index} className="pr-2">{tick}</span>)}</div>
      <div className="relative flex flex-1 items-end gap-[3px] border-l border-[#E9DFFF] pb-6 pl-1 sm:gap-1.5">
        {[0, 1, 2].map((line) => <span key={line} className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-[#E9DFFF]" style={{ bottom: `calc(24px + ${(line / 2) * (100)}% - ${line * 12}px)` }} />)}
        {data.map((item, index) => <button key={index} type="button" onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(index)} onBlur={() => setHover(null)} aria-label={item.title || `${item.label}: ${item.value}`} className="group relative flex h-full flex-1 flex-col items-center justify-end">
          <span className={`relative w-full max-w-[34px] overflow-hidden rounded-t-md transition ${hover === index ? 'bg-[#6C3BFF]' : 'bg-gradient-to-t from-[#A78BFA] to-[#6C3BFF]'}`} style={{ height: `${Math.max((item.value / max) * 100, item.value ? 4 : 1.5)}%` }}>
            {!!item.secondary && <span className="absolute bottom-0 left-0 right-0 bg-[#6C3BFF]" style={{ height: `${(item.secondary / Math.max(item.value, 1)) * 100}%` }} />}
          </span>
          <span className="absolute -bottom-5 text-[9px] text-slate-400 sm:text-[10px]">{item.label}</span>
          {hover === index && <span className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg bg-[#6C3BFF] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg">{item.title || item.label}: {item.value}{item.secondary ? ` · ${item.secondary} ${secondaryLabel || ''}` : ''}</span>}
        </button>)}
      </div>
    </div>
  </div>
}

/** Trend over time (skill: line/area chart for time series). Series one is a solid line with a soft fill, series two is
    dashed so the two never differ by colour alone. Every point is focusable and shows its values (keyboard + hover). */
export function AreaChart({ data, height = 220, primaryLabel = 'Calls', secondaryLabel = 'Missed' }: { data: { label: string; value: number; secondary?: number; title?: string }[]; height?: number; primaryLabel?: string; secondaryLabel?: string }) {
  const [active, setActive] = useState<number | null>(null)
  const width = 640, top = 14, bottom = 26, left = 30, right = 10
  const max = Math.max(4, ...data.map((item) => Math.max(item.value, item.secondary || 0)))
  const ceiling = Math.ceil(max / 2) * 2
  const x = (index: number) => left + (data.length > 1 ? (index / (data.length - 1)) * (width - left - right) : 0)
  const y = (value: number) => top + (1 - value / ceiling) * (height - top - bottom)
  const smooth = (values: number[]) => values.map((value, index) => {
    if (index === 0) return `M${x(0)},${y(value)}`
    const [x0, y0, x1, y1] = [x(index - 1), y(values[index - 1]), x(index), y(value)]
    const mid = (x0 + x1) / 2
    return `C${mid},${y0} ${mid},${y1} ${x1},${y1}`
  }).join(' ')
  const line = smooth(data.map((item) => item.value))
  const missed = smooth(data.map((item) => item.secondary || 0))
  const ticks = [ceiling, ceiling / 2, 0]
  return <div className="relative">
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" role="img" aria-label={`${primaryLabel} per day: ${data.map((item) => `${item.title || item.label} ${item.value}`).join(', ')}`}>
      <defs>
        <linearGradient id="rd-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8B5CF6" stopOpacity=".28" /><stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" /></linearGradient>
        <linearGradient id="rd-line" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor="#6C3BFF" /><stop offset="100%" stopColor="#9747FF" /></linearGradient>
      </defs>
      {ticks.map((tick) => <g key={tick}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#F1EBFF" strokeDasharray="4 6" /><text x={left - 8} y={y(tick) + 3} textAnchor="end" className="fill-[#9C8FB5] text-[10px]">{tick}</text></g>)}
      <path d={`${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#rd-area)" />
      <path d={line} fill="none" stroke="url(#rd-line)" strokeWidth="2.5" strokeLinecap="round" />
      {data.some((item) => item.secondary) && <path d={missed} fill="none" stroke="#A78BFA" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />}
      {active !== null && <line x1={x(active)} x2={x(active)} y1={top} y2={height - bottom} stroke="#D8C8FF" strokeDasharray="3 4" />}
      {data.map((item, index) => <g key={index}>
        <circle cx={x(index)} cy={y(item.value)} r={active === index ? 5.5 : item.value ? 3.5 : 0} fill="#fff" stroke="#6C3BFF" strokeWidth="2.5" />
        {(index % Math.ceil(data.length / 7) === 0 || index === data.length - 1) && <text x={x(index)} y={height - 6} textAnchor="middle" className="fill-[#9C8FB5] text-[10px]">{item.label}</text>}
      </g>)}
    </svg>
    {/* Focus/hover targets laid over the SVG, one per day. */}
    <div className="absolute inset-0 flex" style={{ paddingLeft: `${(left / width) * 100}%`, paddingRight: `${(right / width) * 100}%` }}>
      {data.map((item, index) => <button key={index} type="button" aria-label={`${item.title || item.label}: ${item.value} ${primaryLabel.toLowerCase()}${item.secondary ? `, ${item.secondary} ${secondaryLabel.toLowerCase()}` : ''}`}
        onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(index)} onBlur={() => setActive(null)} className="h-full flex-1 rounded-md focus-visible:bg-[#F1EBFF]/40" />)}
    </div>
    {active !== null && <div className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl border border-[#E9DFFF] bg-white px-3 py-2 text-xs shadow-[0_24px_48px_-24px_rgba(108,59,255,.45)]" style={{ left: `${(x(active) / width) * 100}%`, top: 0 }}>
      <div className="font-bold text-[#32136B]">{data[active].title || data[active].label}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[#75658F]"><span className="h-2 w-2 rounded-full bg-[#6C3BFF]" />{data[active].value} {primaryLabel.toLowerCase()}</div>
      {data[active].secondary ? <div className="flex items-center gap-1.5 text-[#75658F]"><span className="h-0 w-3 border-t-2 border-dashed border-[#A78BFA]" />{data[active].secondary} {secondaryLabel.toLowerCase()}</div> : null}
    </div>}
  </div>
}

/** Horizontal share bar list (pipeline, workload). */
export function ShareList({ items, emptyText }: { items: { id: string; label: ReactNode; value: number; href?: string; extra?: ReactNode }[]; emptyText: string }) {
  const max = Math.max(...items.map((item) => item.value), 1)
  if (!items.length) return <EmptyHint text={emptyText} />
  return <ul className="space-y-3">{items.map((item) => {
    const row = <><div className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium text-slate-700">{item.label}</span><span className="flex shrink-0 items-center gap-2">{item.extra}<b className="text-slate-900">{item.value}</b></span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F1EBFF]"><div className="h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#6C3BFF]" style={{ width: `${(item.value / max) * 100}%` }} /></div></>
    return <li key={item.id}>{item.href ? <Link href={item.href} className="block rounded-lg transition hover:opacity-80">{row}</Link> : row}</li>
  })}</ul>
}

export function EmptyHint({ text, action }: { text: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E9DFFF] bg-[#F8F5FF] px-4 py-8 text-center text-sm text-slate-500">{text}{action && <div className="mt-3">{action}</div>}</div>
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gradient-to-r from-[#F1EBFF] via-[#F8F5FF] to-[#F1EBFF] ${className}`} />
}

/** "3m ago", "2h ago", "Oct 17". */
export const timeAgo = (value?: string) => {
  const date = new Date(value || ''); if (Number.isNaN(date.getTime())) return ''
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
export const duration = (seconds = 0) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`
