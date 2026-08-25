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
    <div className="surface-panel relative overflow-hidden rounded-[24px] px-6 py-6 sm:px-8">
      <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,#6c63ff,#b8b2ff,transparent)]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="section-heading">{title}</h1>
          <p className="section-copy mt-2">{description}</p>
        </div>
        {actionLabel && actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 self-start rounded-2xl border border-[#dcd8ff] bg-[#eeecff] px-5 py-3 text-sm font-semibold text-[#5e56d7] transition hover:bg-[#e4e1ff]"
          >
            {actionLabel}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
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
