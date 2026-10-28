'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Headphones, Inbox, ListChecks, PhoneCall, PhoneIncoming, PhoneMissed, Radio, Timer, UserPlus, UserX } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Loader, api, titleCase, userFacingError } from '../../components/PlatformUI'
import { Avatar, EmptyHint, Panel, PanelLink, duration, timeAgo } from '../../components/premium'
import { stageInfo } from '../../components/stages'

type DayStats = { calls: number; answered: number; missed: number; avg_duration: number; talk_seconds: number; new_leads: number; follow_ups: number }
type DayCall = { id: string; key: string; name: string; at: string; status: string; duration: number; summary: string; failed: boolean }
type FollowUp = { key: string; name: string; phone?: string; stage: string; stage_label: string; reason: string; at: string; assigned_to_name?: string }
type Thread = { kind: 'live' | 'failed' | 'unassigned'; key: string; name: string; at: string; text: string }
type Overview = {
  scope: 'workspace' | 'mine'
  kpis: { live_now: number; open_conversations: number; unassigned: number; mentions: number }
  day: { date: string; days_ago: number; oldest_days_ago: number; stats: DayStats; previous: DayStats; calls: DayCall[] }
  follow_ups: FollowUp[]
  follow_ups_total: number
  attention: Thread[]
  voice: { active_provider: string; ready: boolean }
}

/** Browser-console trace; filter by "[dashboard]". */
const log = (message: string, ...details: unknown[]) => console.info(`[dashboard] ${message}`, ...details)
const openLink = (key: string) => `/inbox?open=${encodeURIComponent(key)}`
const greeting = () => { const hour = new Date().getHours(); return hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 17 ? 'Good afternoon' : 'Good evening' }
const ATTENTION = {
  live: { icon: Radio, label: 'Live call' },
  failed: { icon: PhoneMissed, label: 'Missed / failed' },
  unassigned: { icon: UserX, label: 'Needs an owner' },
}

/** The local date `daysAgo` days before today, as YYYY-MM-DD. */
const isoDay = (daysAgo: number) => { const date = new Date(); date.setDate(date.getDate() - daysAgo); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
/** "Today", "Yesterday", or "Mon 20 Oct". */
const dayName = (daysAgo: number) => daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : new Date(`${isoDay(daysAgo)}T12:00:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
const minutes = (seconds: number) => seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${seconds} s`

/** Home: the day's numbers (pick any day, compared with the day before), follow-ups to act on, what needs
    attention now, and the day's calls. Every row opens its conversation. Updates live. */
export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [daysAgo, setDaysAgo] = useState(0)
  const [showAllCalls, setShowAllCalls] = useState(false)
  const timer = useRef<number>()

  const load = useCallback(async (quiet = false) => {
    if (!quiet) log('loading overview', isoDay(daysAgo))
    try {
      const result = (await api<any>(`/api/overview?tz_offset=${-new Date().getTimezoneOffset()}&day=${isoDay(daysAgo)}`)).data || {}
      // Missing lists (e.g. an older backend) show as empty rather than breaking the page.
      setData({ ...result, follow_ups: result.follow_ups || [], follow_ups_total: result.follow_ups_total || 0, attention: result.attention || [],
        voice: result.voice || { active_provider: '', ready: true }, day: result.day ? { ...result.day, calls: result.day.calls || [] } : undefined })
      setError('')
    }
    catch (err) { log('overview failed', err); if (!quiet) setError(userFacingError(err)) }
  }, [daysAgo])
  useEffect(() => { setShowAllCalls(false); load() }, [load])
  useEffect(() => {
    api<any>('/api/auth/me').then((result) => { setName(titleCase((result.data?.name || '').split(' ')[0])); const permissions = ['owner', 'admin'].includes(String(result.data?.role || '').toLowerCase()) ? ['*'] : (result.data?.permissions || []); setIsAdmin(permissions.includes('*') || permissions.includes('assign_conversations')) }).catch(() => {})
  }, [])
  useEffect(() => {
    // Live: calls, assignments and status changes arrive over the realtime stream; refresh at most every 2s, plus a 30s backup.
    const onChange = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => load(true), 2000) }
    window.addEventListener('inbox:refresh', onChange)
    const backup = window.setInterval(() => load(true), 30000)
    return () => { window.removeEventListener('inbox:refresh', onChange); window.clearInterval(backup); window.clearTimeout(timer.current) }
  }, [load])

  if (error) return <div className="rounded-2xl border border-[#E9DFFF] bg-white p-8 text-center"><p className="text-sm text-slate-600">{error}</p><button type="button" onClick={() => load()} className="mt-4 rounded-lg bg-[#6C3BFF] px-4 py-2 text-sm font-semibold text-white">Try again</button></div>
  const k = data?.kpis
  const day = data?.day
  const sameDay = day && day.days_ago === daysAgo
  const previousName = daysAgo === 0 ? 'yesterday' : daysAgo === 1 ? 'the day before' : `on ${dayName(daysAgo + 1)}`
  const calls = day?.calls || []
  const shownCalls = showAllCalls ? calls : calls.slice(0, 8)

  return <div className="space-y-6">
    {/* Header */}
    <section className="premium-dark relative overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#5A2BE6_0%,#6C3BFF_45%,#9747FF_100%)] p-5 text-white shadow-[0_24px_50px_-30px_rgba(108,59,255,.75)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{greeting()}{name ? `, ${name}` : ''}</h1>
          <p className="mt-1 text-sm text-white/80">
            {!k ? 'Your calls, conversations and follow-ups for today.' : k.live_now ? <b className="text-white">{k.live_now} call{k.live_now === 1 ? '' : 's'} live right now</b>
              : data && data.follow_ups_total ? <><b className="text-white">{data.follow_ups_total} follow-up{data.follow_ups_total === 1 ? '' : 's'}</b> waiting for the team{k.unassigned ? <>, {k.unassigned} without an owner</> : null}.</>
                : 'Nothing waiting for the team right now.'}
            <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold ring-1 ring-white/15"><span className={`h-1.5 w-1.5 rounded-full ${data?.voice.ready === false ? 'bg-white/40' : 'bg-[#C4B5FD]'}`} />Answering with {data?.voice.active_provider || '…'}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inbox" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#5A2BE6] shadow-lg transition hover:-translate-y-0.5"><Inbox className="h-4 w-4" />Open inbox</Link>
          <Link href="/voice/browser-test" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold ring-1 ring-white/25 transition hover:bg-white/20"><Headphones className="h-4 w-4" />Test call</Link>
          {isAdmin && <Link href="/settings/team" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold ring-1 ring-white/25 transition hover:bg-white/20"><UserPlus className="h-4 w-4" />Invite</Link>}
        </div>
      </div>
    </section>

    {/* Day picker + the day's numbers */}
    <section aria-label="Day summary" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous day" title="Previous day" disabled={day ? daysAgo >= day.oldest_days_ago : false} onClick={() => setDaysAgo((value) => value + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E9DFFF] bg-white text-slate-600 transition hover:border-[#D8C8FF] hover:text-[#6C3BFF] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <h2 className="min-w-[140px] px-2 text-center text-lg font-bold text-slate-900">{dayName(daysAgo)}{daysAgo > 1 ? '' : <span className="ml-2 text-sm font-medium text-slate-500">{new Date(`${isoDay(daysAgo)}T12:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>}</h2>
          <button type="button" aria-label="Next day" title="Next day" disabled={daysAgo === 0} onClick={() => setDaysAgo((value) => Math.max(0, value - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E9DFFF] bg-white text-slate-600 transition hover:border-[#D8C8FF] hover:text-[#6C3BFF] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          {daysAgo > 0 && <button type="button" onClick={() => setDaysAgo(0)} className="ml-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#6C3BFF] hover:bg-[#F1EBFF]">Back to today</button>}
        </div>
        <span className="text-xs text-slate-500">Compared with {previousName.replace(/^on /, '')}</span>
      </div>
      {!sameDay || !day ? <Loader variant="cards" count={6} label="Loading today's numbers" />
        : <div className="keep-cols grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <DayStat icon={PhoneIncoming} label="Calls" value={day.stats.calls} before={day.previous.calls} beforeName={previousName} note={day.stats.talk_seconds ? `${minutes(day.stats.talk_seconds)} talking` : undefined} href="/calls" />
          <DayStat icon={CheckCircle2} label="Answered" value={day.stats.answered} before={day.previous.answered} beforeName={previousName} note={day.stats.calls ? `${Math.round(day.stats.answered / day.stats.calls * 100)}% of calls` : undefined} />
          <DayStat icon={PhoneMissed} label="Missed" value={day.stats.missed} before={day.previous.missed} beforeName={previousName} lowerIsBetter href={day.stats.missed ? '/inbox/failed' : undefined} />
          <DayStat icon={Timer} label="Avg call" value={day.stats.avg_duration ? duration(day.stats.avg_duration) : '—'} raw={day.stats.avg_duration} before={day.previous.avg_duration} beforeName={previousName} format={duration} />
          <DayStat icon={UserPlus} label="New leads" value={day.stats.new_leads} before={day.previous.new_leads} beforeName={previousName} href="/leads" />
          <DayStat icon={ListChecks} label="New follow-ups" value={day.stats.follow_ups} before={day.previous.follow_ups} beforeName={previousName} href="/tasks" />
        </div>}
    </section>

    {/* Follow-ups + needs attention */}
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel icon={CalendarCheck} title="Follow-ups" subtitle={data ? (data.follow_ups_total ? `${data.follow_ups_total} conversation${data.follow_ups_total === 1 ? '' : 's'} waiting for the team, newest first` : 'Nothing to follow up') : ' '} action={<PanelLink href="/tasks">All tasks</PanelLink>} bodyClassName="divide-y divide-[#F1EBFF]">
        {!data ? <Loader variant="rows" label="Loading follow-ups" className="p-3" /> : data.follow_ups.length ? data.follow_ups.map((item) => { const Icon = stageInfo(item.stage).icon; return <Link key={item.key} href={openLink(item.key)} className="group flex items-start gap-3 px-5 py-3.5 transition hover:bg-[#F8F5FF]">
          <Avatar name={item.name} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="truncate text-sm font-semibold text-slate-900">{item.name}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F1EBFF] px-2 py-0.5 text-[11px] font-semibold text-[#5A2BE6]"><Icon className="h-3 w-3" />{item.stage_label}</span>
              <span className="ml-auto shrink-0 text-[11px] text-slate-500">{timeAgo(item.at)}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-600">{item.reason || 'Open the conversation for details.'}</p>
            <p className="mt-1 text-[11px] text-slate-500">{item.assigned_to_name ? `Owner: ${titleCase(item.assigned_to_name)}` : 'No owner yet'}{item.phone && item.phone !== item.name && !item.phone.startsWith('client:') ? ` · ${item.phone}` : ''}</p>
          </div>
          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#6C3BFF]" />
        </Link> })
          : <div className="p-5"><EmptyHint text="No follow-ups waiting. Calls asking for a callback, a time, a follow-up, a service or a payment show up here." /></div>}
      </Panel>

      <Panel icon={AlertTriangle} title="Needs attention" subtitle={data ? (data.attention.length ? `${data.attention.length} conversation${data.attention.length === 1 ? '' : 's'}` : 'Nothing waiting') : ' '} bodyClassName="p-3">
        {!data ? <Loader variant="rows" label="Loading what needs attention" /> : data.attention.length ? <ul className="space-y-1">{data.attention.map((item) => { const meta = ATTENTION[item.kind]; const Icon = meta.icon; return <li key={`${item.kind}-${item.key}`}>
          <Link href={openLink(item.key)} className="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-[#F8F5FF]">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.kind === 'live' ? 'bg-[#6C3BFF] text-white' : 'bg-[#F1EBFF] text-[#6C3BFF]'}`}><Icon className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className="flex items-baseline justify-between gap-2"><span className="truncate text-sm font-semibold text-slate-900">{item.name}</span><span className="shrink-0 text-[11px] text-slate-500">{timeAgo(item.at)}</span></span><span className="block truncate text-xs text-slate-500">{meta.label} · {item.text}</span></span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#6C3BFF]" />
          </Link></li> })}</ul>
          : <EmptyHint text="You're all caught up. Live calls, missed calls and conversations without an owner show up here." />}
      </Panel>
    </div>

    {/* The day's calls, compact: one line each */}
    <Panel icon={PhoneCall} title={daysAgo === 0 ? "Today's calls" : `Calls on ${dayName(daysAgo)}`} subtitle={sameDay && day ? `${calls.length}${calls.length === 50 ? '+' : ''} call${calls.length === 1 ? '' : 's'} · click one to open the conversation` : ' '} action={<PanelLink href="/calls">Call history</PanelLink>} bodyClassName="p-0">
      {!sameDay ? <Loader variant="rows" count={3} label="Loading calls" className="p-3" /> : calls.length ? <>
        <ul className="divide-y divide-[#F1EBFF]">{shownCalls.map((call) => <li key={call.id}>
          <Link href={openLink(call.key)} className="group grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-2.5 transition hover:bg-[#F8F5FF] sm:grid-cols-[64px_minmax(0,200px)_minmax(0,1fr)_auto]">
            <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-slate-500">{new Date(call.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            <span className="truncate text-sm font-semibold text-slate-900">{call.name}</span>
            <span className="hidden truncate text-[13px] text-slate-600 sm:block">{call.summary || (call.failed ? 'The call did not connect.' : 'No summary yet.')}</span>
            <span className="flex items-center gap-2 justify-self-end">
              <span className="hidden text-[11px] tabular-nums text-slate-500 sm:inline">{call.duration ? duration(call.duration) : ''}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${call.failed || call.status === 'in_progress' ? 'bg-[#6C3BFF] text-white' : 'bg-[#F1EBFF] text-[#5A2BE6]'}`}>{call.failed ? 'Missed' : call.status === 'in_progress' ? 'Live' : 'Done'}</span>
            </span>
          </Link></li>)}</ul>
        {calls.length > shownCalls.length && <button type="button" onClick={() => setShowAllCalls(true)} className="w-full border-t border-[#F1EBFF] px-5 py-3 text-sm font-semibold text-[#6C3BFF] hover:bg-[#F8F5FF]">Show all {calls.length} calls</button>}
      </> : <div className="p-5"><EmptyHint text={daysAgo === 0 ? 'No calls yet today.' : `No calls on ${dayName(daysAgo)}.`} action={daysAgo === 0 ? <Link href="/voice/browser-test" className="rounded-lg bg-[#6C3BFF] px-3 py-1.5 text-xs font-semibold text-white">Start a test call</Link> : undefined} /></div>}
    </Panel>
  </div>
}

/** One number for the chosen day, with how it moved since the day before. */
function DayStat({ icon: Icon, label, value, raw, before, beforeName, note, href, lowerIsBetter = false, format }: { icon: LucideIcon; label: string; value: number | string; raw?: number; before: number; beforeName: string; note?: string; href?: string; lowerIsBetter?: boolean; format?: (value: number) => string }) {
  const now = typeof raw === 'number' ? raw : typeof value === 'number' ? value : 0
  const change = now - before
  const better = lowerIsBetter ? change < 0 : change > 0
  const body = <>
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">{label}</span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F1EBFF] text-[#6C3BFF]"><Icon className="h-4 w-4" /></span>
    </div>
    <div className="mt-1 text-[26px] font-extrabold leading-none tracking-tight text-[#32136B] tabular-nums">{value}</div>
    <div className="mt-2 text-[11px] text-slate-500">
      {change === 0 ? <span>Same as {beforeName}</span> : <span className={better ? 'font-semibold text-[#5A2BE6]' : 'text-slate-600'}>{change > 0 ? '▲' : '▼'} {format ? (before ? format(before) : 'none') : before} {beforeName}</span>}
      {note && <span className="block truncate">{note}</span>}
    </div>
  </>
  const style = 'block rounded-2xl border border-[#E9DFFF] bg-white p-4 shadow-[0_18px_40px_-34px_rgba(73,35,117,.55)] transition'
  return href ? <Link href={href} className={`${style} hover:-translate-y-0.5 hover:border-[#D8C8FF]`}>{body}</Link> : <div className={style}>{body}</div>
}
