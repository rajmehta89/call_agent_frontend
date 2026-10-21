'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, AlertTriangle, ArrowRight, AtSign, BarChart3, CheckCircle2, Clock3, Headphones, Inbox, PhoneCall, PhoneIncoming, PhoneMissed, Radio, Sparkles, Timer, UserPlus, Users, UserX } from 'lucide-react'
import { api, titleCase, userFacingError } from '../../components/PlatformUI'
import { AreaChart, Avatar, EmptyHint, Panel, PanelLink, ShareList, Skeleton, Stat, duration, timeAgo } from '../../components/premium'
import { stageInfo } from '../../components/stages'

type Thread = { kind: 'live' | 'failed' | 'unassigned'; key: string; name: string; at: string; text: string; assigned_to_name?: string; stage?: string }
type Overview = {
  scope: 'workspace' | 'mine'
  kpis: { calls_today: number; calls_yesterday: number; calls_7d: number; calls_7d_change: number | null; avg_duration_7d: number; avg_duration_change: number | null; answered_rate_7d: number | null; failed_7d: number; live_now: number; open_conversations: number; unassigned: number; mentions: number; leads_new_7d: number; leads_total: number }
  daily: { date: string; calls: number; failed: number }[]
  hours: number[]
  attention: Thread[]
  recent: { id: string; key: string; name: string; at: string; status: string; duration: number; provider?: string; summary: string; failed: boolean }[]
  pipeline: { id: string; label: string; count: number }[]
  team: { id: string; name: string; open: number; live: number; leads: number }[]
  voice: { active_provider: string; ready: boolean }
}

/** Browser-console trace; filter by "[dashboard]". */
const log = (message: string, ...details: unknown[]) => console.info(`[dashboard] ${message}`, ...details)
const openLink = (key: string) => `/inbox?open=${encodeURIComponent(key)}`
const greeting = () => { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening' }
const ATTENTION = {
  live: { icon: Radio, label: 'Live call', tone: 'bg-[#6C3BFF] text-white' },
  failed: { icon: PhoneMissed, label: 'Missed / failed', tone: 'bg-[#F1EBFF] text-[#6C3BFF]' },
  unassigned: { icon: UserX, label: 'Needs an owner', tone: 'bg-[#F1EBFF] text-[#6C3BFF]' },
}

/** Home: what needs attention now, how calls are trending, and who is working on what. Updates live. */
export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const timer = useRef<number>()

  const load = useCallback(async (quiet = false) => {
    if (!quiet) log('loading overview')
    try { setData((await api<any>(`/api/overview?tz_offset=${-new Date().getTimezoneOffset()}`)).data); setError('') }
    catch (err) { log('overview failed', err); if (!quiet) setError(userFacingError(err)) }
  }, [])
  useEffect(() => {
    load()
    api<any>('/api/auth/me').then((result) => { setName(titleCase((result.data?.name || '').split(' ')[0])); const permissions: string[] = result.data?.permissions || []; setIsAdmin(permissions.includes('*') || permissions.includes('assign_conversations')) }).catch(() => {})
    // Live: calls, assignments and notes arrive over the realtime stream; refresh at most every 2s, plus a 30s backup.
    const onChange = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => load(true), 2000) }
    window.addEventListener('inbox:refresh', onChange)
    const backup = window.setInterval(() => load(true), 30000)
    return () => { window.removeEventListener('inbox:refresh', onChange); window.clearInterval(backup); window.clearTimeout(timer.current) }
  }, [load])

  if (error) return <div className="rounded-2xl border border-[#E9DFFF] bg-white p-8 text-center"><p className="text-sm text-slate-600">{error}</p><button type="button" onClick={() => load()} className="mt-4 rounded-lg bg-[#6C3BFF] px-4 py-2 text-sm font-semibold text-white">Try again</button></div>
  const k = data?.kpis
  const mine = data?.scope === 'mine'
  const spark = data?.daily.map((day) => day.calls) || []
  const busiest = data ? data.hours.indexOf(Math.max(...data.hours)) : -1
  const hourLabel = (hour: number) => new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: 'numeric' })

  return <div className="space-y-6">
    {/* Hero */}
    <section className="premium-dark relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_88%_8%,rgba(255,255,255,.28)_0%,transparent_38%),radial-gradient(circle_at_8%_110%,rgba(255,255,255,.16)_0%,transparent_45%),linear-gradient(120deg,#5A2BE6_0%,#6C3BFF_38%,#8B5CF6_72%,#9747FF_100%)] p-6 text-white shadow-[0_30px_60px_-30px_rgba(108,59,255,.75)] sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-6 -top-10 h-44 w-44 rounded-full border border-white/10" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-white/60">{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{greeting()}{name ? `, ${name}` : ''}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
            {!k ? 'Loading your workspace…' : k.live_now ? <><b className="text-white">{k.live_now} call{k.live_now === 1 ? '' : 's'} live right now.</b> Open the inbox to follow the transcript as it happens.</>
              : mine ? <>You have <b className="text-white">{k.open_conversations} open conversation{k.open_conversations === 1 ? '' : 's'}</b>{k.mentions ? <> and <b className="text-white">{k.mentions} unread mention{k.mentions === 1 ? '' : 's'}</b></> : null}.</>
              : <>{k.calls_today} call{k.calls_today === 1 ? '' : 's'} today{k.unassigned ? <>, <b className="text-white">{k.unassigned} conversation{k.unassigned === 1 ? '' : 's'} waiting for an owner</b></> : ', every conversation has an owner'}.</>}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-semibold ring-1 ring-white/15"><span className={`h-2 w-2 rounded-full ${data?.voice.ready === false ? 'bg-white/40' : 'bg-[#A78BFA] shadow-[0_0_10px_#A78BFA]'}`} />Answering with {data?.voice.active_provider || '…'}</span>
            {mine && <span className="rounded-full bg-white/10 px-3 py-1 font-semibold ring-1 ring-white/15">Showing your conversations and leads</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inbox" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#5A2BE6] shadow-lg transition hover:-translate-y-0.5"><Inbox className="h-4 w-4" />Open inbox</Link>
          <Link href="/voice/browser-test" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold ring-1 ring-white/25 transition hover:bg-white/20"><Headphones className="h-4 w-4" />Test call</Link>
          {isAdmin && <Link href="/settings/team" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold ring-1 ring-white/25 transition hover:bg-white/20"><UserPlus className="h-4 w-4" />Invite</Link>}
        </div>
      </div>
    </section>

    {/* KPIs */}
    {!k ? <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-32" />)}</div>
      : <div className="keep-cols grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        <Stat icon={PhoneIncoming} label="Calls today" value={k.calls_today} hint={`${k.calls_yesterday} yesterday`} spark={spark} href="/calls" />
        <Stat icon={BarChart3} label="Last 7 days" value={k.calls_7d} delta={k.calls_7d_change} href="/calls" />
        <Stat icon={Timer} label="Avg call" value={duration(k.avg_duration_7d)} delta={k.avg_duration_change} />
        <Stat icon={CheckCircle2} label="Answered" value={k.answered_rate_7d === null ? '—' : `${k.answered_rate_7d}%`} hint={k.failed_7d ? `${k.failed_7d} missed or failed` : 'No missed calls this week'} href={k.failed_7d ? '/inbox/failed' : undefined} />
        {mine ? <Stat icon={Inbox} label="Assigned to you" value={k.open_conversations} hint="open conversations" href="/inbox/mine" />
          : <Stat icon={UserX} label="Unassigned" value={k.unassigned} hint={k.unassigned ? 'need an owner — assign now' : 'all conversations owned'} href="/inbox/unassigned" tone={k.unassigned ? 'alert' : 'default'} />}
        {k.live_now ? <Stat icon={Radio} label="Live now" value={k.live_now} hint="calls in progress" href="/inbox" tone="live" />
          : <Stat icon={AtSign} label="Mentions" value={k.mentions} hint={k.mentions ? 'unread — reply in the inbox' : 'nothing unread'} href="/inbox/mentioned" tone={k.mentions ? 'alert' : 'default'} />}
      </div>}

    {/* Activity + attention */}
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel icon={Activity} title="Call activity" subtitle={data ? `${data.daily.reduce((sum, day) => sum + day.calls, 0)} calls in the last 14 days${busiest >= 0 && data.hours[busiest] ? ` · busiest around ${hourLabel(busiest)}` : ''}` : 'Last 14 days'} action={<PanelLink href="/calls">Call history</PanelLink>}>
        {data ? <>
          <AreaChart data={data.daily.map((day) => { const date = new Date(`${day.date}T12:00:00`); return { label: date.toLocaleDateString([], { month: 'short', day: 'numeric' }), value: day.calls, secondary: day.failed, title: date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) } })} primaryLabel="Calls" secondaryLabel="Missed or failed" />
          <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[#6C3BFF]" />Calls</span><span className="inline-flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-[#A78BFA]" />Missed or failed</span></div>
          <div className="mt-5 border-t border-[#E9DFFF] pt-4"><div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Clock3 className="h-3.5 w-3.5 text-[#6C3BFF]" />When people call (last 28 days)</div><HourStrip hours={data.hours} /></div>
        </> : <Skeleton className="h-64" />}
      </Panel>

      <Panel icon={AlertTriangle} title="Needs attention" subtitle={data ? (data.attention.length ? `${data.attention.length} conversation${data.attention.length === 1 ? '' : 's'}` : 'Nothing waiting') : ' '} bodyClassName="p-3">
        {!data ? <Skeleton className="h-64" /> : data.attention.length ? <ul className="space-y-1">{data.attention.map((item) => { const meta = ATTENTION[item.kind]; const Icon = meta.icon; return <li key={`${item.kind}-${item.key}`}>
          <Link href={openLink(item.key)} className="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-[#F8F5FF]">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}><Icon className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className="flex items-baseline justify-between gap-2"><span className="truncate text-sm font-semibold text-slate-900">{item.name}</span><span className="shrink-0 text-[11px] text-slate-400">{timeAgo(item.at)}</span></span><span className="block truncate text-xs text-slate-500">{meta.label} · {item.text}</span></span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#6C3BFF]" />
          </Link></li> })}</ul>
          : <EmptyHint text="You're all caught up. New calls, missed calls and unassigned conversations show up here." />}
      </Panel>
    </div>

    {/* Recent calls + pipeline */}
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel icon={PhoneCall} title="Latest calls" subtitle="What callers asked, summarised by the AI" action={<PanelLink href="/calls">See all</PanelLink>} bodyClassName="divide-y divide-[#F1EBFF]">
        {!data ? <div className="p-5"><Skeleton className="h-56" /></div> : data.recent.length ? data.recent.map((call) => <Link key={call.id} href={openLink(call.key)} className="group flex gap-3 px-5 py-4 transition hover:bg-[#F8F5FF]">
          <Avatar name={call.name} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2"><span className="truncate text-sm font-semibold text-slate-900">{call.name}</span><span className="text-[11px] text-slate-400">{timeAgo(call.at)}{call.duration ? ` · ${duration(call.duration)}` : ''}</span>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${call.failed ? 'bg-[#6C3BFF] text-white' : call.status === 'in_progress' ? 'bg-[#6C3BFF] text-white' : 'bg-[#F1EBFF] text-[#6C3BFF]'}`}>{call.failed ? 'Missed' : call.status === 'in_progress' ? 'Live' : 'Completed'}</span></div>
            <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-600">{call.summary || (call.failed ? 'The call did not connect.' : 'No summary yet.')}</p>
          </div>
        </Link>) : <div className="p-5"><EmptyHint text="No calls yet. Make a test call to see it here." action={<Link href="/voice/browser-test" className="rounded-lg bg-[#6C3BFF] px-3 py-1.5 text-xs font-semibold text-white">Start a test call</Link>} /></div>}
      </Panel>

      <div className="space-y-6">
        <Panel icon={Sparkles} title="Pipeline" subtitle="Open conversations by status">
          {data ? <ShareList emptyText="No open conversations." items={data.pipeline.filter((stage) => stage.count).map((stage) => ({ id: stage.id, label: <span className="inline-flex items-center gap-2"><StageGlyph id={stage.id} />{stage.label}</span>, value: stage.count, href: `/inbox/status/${stage.id}` }))} /> : <Skeleton className="h-40" />}
        </Panel>
        {data && data.scope === 'workspace' && <Panel icon={Users} title="Team workload" subtitle="Open conversations per team member" action={<PanelLink href="/inbox/assigned">Assign</PanelLink>}>
          {data.team.length ? <ul className="space-y-3">{data.team.map((member) => <li key={member.id} className="flex items-center gap-3"><Avatar name={member.name} size="sm" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between text-sm"><span className="truncate font-medium text-slate-700">{titleCase(member.name)}</span><span className="text-xs text-slate-500"><b className="text-slate-900">{member.open}</b> open · {member.leads} leads</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F1EBFF]"><div className="h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#6C3BFF]" style={{ width: `${(member.open / Math.max(...data.team.map((row) => row.open), 1)) * 100}%` }} /></div></div>{member.live > 0 && <span className="rounded-full bg-[#6C3BFF] px-2 py-0.5 text-[10px] font-bold text-white">on a call</span>}</li>)}</ul>
            : <EmptyHint text="No team members yet." action={<Link href="/settings/team" className="rounded-lg bg-[#6C3BFF] px-3 py-1.5 text-xs font-semibold text-white">Invite a teammate</Link>} />}
        </Panel>}
        {data && <Panel icon={UserPlus} title="Leads" subtitle={`${data.kpis.leads_new_7d} new this week · ${data.kpis.leads_total} total`} action={<PanelLink href="/leads">Open leads</PanelLink>}>
          <p className="text-sm leading-6 text-slate-600">Every caller becomes a lead automatically. {data.scope === 'mine' ? 'These are the leads assigned to you.' : 'Give each lead an owner on the Leads page — assigning a conversation does it too.'}</p>
        </Panel>}
      </div>
    </div>
  </div>
}

/** Pipeline status icon (Lucide, no emoji — design system). */
function StageGlyph({ id }: { id: string }) {
  const Icon = stageInfo(id).icon
  return <Icon aria-hidden="true" className="h-4 w-4 text-[#6C3BFF]" />
}

/** 24 cells, one per hour; darker = more calls. */
function HourStrip({ hours }: { hours: number[] }) {
  const max = Math.max(...hours, 1)
  return <div>
    <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[3px]">{hours.map((count, hour) => <span key={hour} title={`${new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: 'numeric' })}: ${count} call${count === 1 ? '' : 's'}`} className="h-6 rounded-[4px]" style={{ background: count ? `rgba(122,63,209,${0.15 + (count / max) * 0.85})` : '#F1EBFF' }} />)}</div>
    <div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>
  </div>
}
