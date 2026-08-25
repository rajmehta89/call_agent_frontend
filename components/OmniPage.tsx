'use client'

import Link from 'next/link'
import { ArrowUpRight, LucideIcon } from 'lucide-react'

type Row = {
  name?: string
  title?: string
  detail: string
  tag: string
}

export function PageHeader({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <div className="relative mb-1 flex flex-col gap-3 px-1 py-1 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="section-heading">{title}</h1>
        <p className="section-copy mt-1 max-w-3xl text-sm leading-6">{description}</p>
      </div>
        {actionLabel && actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex h-9 shrink-0 items-center gap-2 self-start rounded-md border border-[#fed7aa] bg-[#fff7ed] px-3.5 text-sm font-medium text-[#b45309] transition hover:bg-[#ffedd5]"
          >
            {actionLabel}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : null}
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
    <div className="surface-panel rounded-[28px] p-6 transition hover:-translate-y-0.5 hover:border-[#cfcaff]">
      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0efff] text-[#655de0]">
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
