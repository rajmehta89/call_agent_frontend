'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { ArrowUpRight, LucideIcon } from 'lucide-react'
import { navigationGroups } from './omni-data'

type Row = {
  name?: string
  title?: string
  detail: string
  tag: string
}

/** The sidebar entry for this page (longest matching href), for the header's icon and section label. */
function navEntry(pathname: string) {
  const entries = navigationGroups.flatMap((group) => group.items.map((item) => ({ ...item, section: group.label })))
  return entries.filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]
}

/** Page title block used by every page: icon and section from the sidebar, title, description, and actions on the right. */
export function PageHeader({
  title,
  description,
  actionLabel,
  actionHref,
  actions,
  icon,
}: {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  actions?: ReactNode
  icon?: LucideIcon
}) {
  const entry = navEntry(usePathname() || '')
  const Icon = icon || entry?.icon
  return (
    <div className="premium-page-header relative mb-1 flex flex-col gap-4 pb-5 pt-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        {Icon && <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#5A2BE6] text-white shadow-[0_14px_28px_-16px_rgba(95,52,126,.95)] sm:flex"><Icon className="h-[22px] w-[22px]" /></span>}
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-[#32136B] sm:text-[28px]">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      {(actions || (actionLabel && actionHref)) && <div className="flex shrink-0 flex-wrap gap-2">
        {actions}
        {actionLabel && actionHref && <Link href={actionHref} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6C3BFF] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_-14px_rgba(150,77,234,.9)] transition hover:bg-[#5A2BE6]">{actionLabel}<ArrowUpRight className="h-4 w-4" /></Link>}
      </div>}
    </div>
  )
}

export function ChannelCard({
  title,
  description,
  status,
  icon: Icon,
}: {
  title: string
  description: string
  status: string
  icon: LucideIcon
}) {
  const active = ['connected', 'live', 'enabled', 'active', 'ready'].includes(status.toLowerCase())

  return (
    <div className="surface-panel rounded-[28px] p-6 transition hover:-translate-y-0.5 hover:border-[#D8C8FF]">
      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D8C8FF] bg-[#F1EBFF] text-[#6C3BFF]">
          <Icon className="h-5 w-5" />
        </div>
        <span className={`premium-badge ${active ? 'live' : 'pending'}`}>{status}</span>
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em] text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p>
    </div>
  )
}

export function SimpleRows({ rows }: { rows: Row[] }) {
  return (
    <div className="surface-panel rounded-[28px]">
      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={`${row.name || row.title}-${row.tag}`} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div className="flex-1">
              <div className="text-sm font-semibold tracking-[-0.02em] text-slate-900">{row.name || row.title}</div>
              <div className="mt-1.5 text-sm leading-6 text-slate-500">{row.detail}</div>
            </div>
            <span className="premium-badge pending w-fit">{row.tag}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
