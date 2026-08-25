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
    <div className="surface-panel-strong relative overflow-hidden rounded-[32px] px-6 py-8 sm:px-8 lg:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(214,163,79,0.12),transparent_24%),radial-gradient(circle_at_left,rgba(104,210,200,0.1),transparent_28%)]" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="eyebrow">Omni-channel command</div>
          <h1 className="section-heading mt-5 text-white">{title}</h1>
          <p className="section-copy mt-4">{description}</p>
        </div>
        {actionLabel && actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 self-start rounded-2xl border border-[#d6a34f]/30 bg-[#d6a34f]/12 px-5 py-3 text-sm font-semibold text-[#f4d39a] transition hover:bg-[#d6a34f]/18"
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
    <div className="surface-panel rounded-[28px] p-6 transition hover:-translate-y-0.5 hover:border-white/20">
      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-slate-100">
          <Icon className="h-5 w-5" />
        </div>
        <span className={`premium-badge ${active ? 'live' : 'pending'}`}>{status}</span>
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em] text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-400">{description}</p>
    </div>
  )
}

export function SimpleRows({ rows }: { rows: Row[] }) {
  return (
    <div className="surface-panel rounded-[28px]">
      <div className="divide-y divide-white/6">
        {rows.map((row) => (
          <div key={`${row.name || row.title}-${row.tag}`} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div className="flex-1">
              <div className="text-sm font-semibold tracking-[-0.02em] text-white">{row.name || row.title}</div>
              <div className="mt-1.5 text-sm leading-6 text-slate-400">{row.detail}</div>
            </div>
            <span className="premium-badge pending w-fit">{row.tag}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
