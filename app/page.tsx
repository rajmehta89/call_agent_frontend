'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, ArrowUpRight, BarChart3, Bot, CalendarDays, CheckCircle2, ChevronRight, Clock3, MessageSquare, PhoneCall, Sparkles, Target, TrendingUp, Users, WalletCards } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { API_BASE, DataState, StatusBadge, Toolbar } from '@/components/PlatformUI'

type DashboardPayload = { metrics?: any; channels?: any; shopify?: any; recent_activity?: any[] }

const read = async (url: string) => {
  const response = await fetch(url)
  const payload = await response.json()
  if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to load dashboard data')
  return payload
}

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN').format(value || 0)
const dateValue = (value?: string) => {
  if (!value) return 0
  const result = new Date(value).getTime()
  return Number.isNaN(result) ? 0 : result
}
const formatTime = (value?: string) => value ? new Date(value).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
const phoneKey = (value?: string | number) => String(value || '').replace(/\D/g, '').slice(-10)

function KpiCard({ label, value, detail, icon: Icon, tone = 'amber' }: { label: string; value: string | number; detail: string; icon: any; tone?: 'amber' | 'slate' | 'rose' }) {
  const toneClass = tone === 'rose' ? 'border-rose-100 bg-rose-50 text-rose-500' : tone === 'slate' ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-[#fed7aa] bg-[#fff7ed] text-[#d97706]'
  return <div className="surface-panel rounded-[20px] p-4"><div className="flex items-start justify-between gap-3"><div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${toneClass}`}><Icon className="h-4 w-4" /></div><span className="text-[10px] font-semibold uppercase tracking-[.13em] text-slate-400">Live</span></div><div className="mt-4 text-xs font-semibold uppercase tracking-[.11em] text-slate-500">{label}</div><div className="mt-1 text-[1.65rem] font-extrabold tracking-[-.05em] text-slate-900">{value}</div><div className="mt-1 text-xs text-slate-500">{detail}</div></div>
}

function SectionTitle({ icon: Icon, title, action }: { icon: any; title: string; action?: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fff7ed] text-[#d97706]"><Icon className="h-3.5 w-3.5" /></span><h2 className="text-sm font-bold text-slate-900">{title}</h2></div>{action}</div>
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardPayload>({})
  const [calls, setCalls] = useState<any[]>([])
  const [whatsappConversations, setWhatsappConversations] = useState<any[]>([])
  const [whatsappStats, setWhatsappStats] = useState<any>({})
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rangeDays, setRangeDays] = useState(30)
  const [channel, setChannel] = useState('all')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [dashboardResult, callsResult, leadsResult] = await Promise.allSettled([
        read(`${API_BASE}/api/platform/dashboard`),
        read(`${API_BASE}/api/calls?limit=200`),
        read(`${API_BASE}/api/leads/?limit=200`),
      ])
      if (dashboardResult.status === 'rejected') throw dashboardResult.reason
      setData(dashboardResult.value.data || {})
      setCalls(callsResult.status === 'fulfilled' ? callsResult.value.data || [] : [])
      setLeads(leadsResult.status === 'fulfilled' ? leadsResult.value.data || [] : [])
      const [whatsappResult, whatsappStatsResult] = await Promise.allSettled([
        read(`${API_BASE}/api/whatsapp/conversations?limit=200`),
        read(`${API_BASE}/api/whatsapp/stats`),
      ])
      setWhatsappConversations(whatsappResult.status === 'fulfilled' ? whatsappResult.value.data || [] : [])
      setWhatsappStats(whatsappStatsResult.status === 'fulfilled' ? whatsappStatsResult.value.data || {} : {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const metrics = data.metrics || {}
  const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000
  const visibleCalls = useMemo(() => calls.filter((call) => dateValue(call.call_date || call.created_at) >= cutoff), [calls, cutoff])
  const visibleWhatsappConversations = useMemo(() => whatsappConversations.filter((conversation) => dateValue(conversation.updated_at || conversation.created_at) >= cutoff), [whatsappConversations, cutoff])
  const channelCalls = channel === 'whatsapp' ? [] : visibleCalls
  const channelWhatsapp = channel === 'voice' ? [] : visibleWhatsappConversations
  const channelAiActivity = useMemo(() => (data.recent_activity || []).filter((row: any) => {
    if (channel === 'all') return true
    const rowChannel = String(row.channel || '').toLowerCase()
    return !rowChannel || rowChannel === channel || rowChannel === 'shared' || rowChannel === 'ai'
  }), [channel, data.recent_activity])
  const channelPhoneKeys = useMemo(() => new Set([...channelCalls.map((call) => phoneKey(call.phone_number)), ...channelWhatsapp.map((conversation) => phoneKey(conversation.customer_phone))].filter(Boolean)), [channelCalls, channelWhatsapp])
  const visibleLeads = useMemo(() => {
    const inPeriod = leads.filter((lead) => !lead.created_at || dateValue(lead.created_at) >= cutoff)
    if (channel === 'all') return inPeriod
    return inPeriod.filter((lead) => channelPhoneKeys.has(phoneKey(lead.phone || lead.phone_number)))
  }, [channel, channelPhoneKeys, cutoff, leads])
  const totalConversations = channelCalls.length + channelWhatsapp.length
  const totalLeads = visibleLeads.length
  const qualifiedLeads = visibleLeads.filter((lead) => ['qualified', 'hot', 'converted'].includes(String(lead.status || '').toLowerCase())).length
  const appointments = metrics.appointments_booked ?? metrics.appointments ?? metrics.booked_appointments
  const jobs = metrics.jobs_won ?? metrics.completed_jobs ?? metrics.jobs
  const revenue = metrics.revenue_influenced ?? metrics.estimated_revenue

  const activity = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - index))
      return { date, label: date.toLocaleDateString([], { weekday: 'short' }), calls: 0, activity: 0 }
    })
    channelCalls.forEach((call) => {
      const timestamp = dateValue(call.call_date || call.created_at)
      const day = days.find((item) => item.date.toDateString() === new Date(timestamp).toDateString())
      if (day) day.calls += 1
    })
    channelWhatsapp.forEach((conversation) => {
      const timestamp = dateValue(conversation.updated_at || conversation.created_at)
      const day = days.find((item) => item.date.toDateString() === new Date(timestamp).toDateString())
      if (day) day.activity += 1
    })
    channelAiActivity.forEach((row) => {
      const timestamp = dateValue(row.created_at)
      const day = days.find((item) => item.date.toDateString() === new Date(timestamp).toDateString())
      if (day) day.activity += 1
    })
    return days.map((day) => ({ ...day, total: day.calls + day.activity }))
  }, [channelAiActivity, channelCalls, channelWhatsapp])

  const leadSources = useMemo(() => {
    const counts = new Map<string, number>()
    visibleLeads.forEach((lead) => {
      const source = String(lead.source || lead.channel || 'Unattributed').replace(/_/g, ' ')
      counts.set(source.charAt(0).toUpperCase() + source.slice(1), (counts.get(source.charAt(0).toUpperCase() + source.slice(1)) || 0) + 1)
    })
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [visibleLeads])

  const phoneActivity = useMemo(() => {
    const rows = new Map<string, { label: string; phone: string; incoming: number; outgoing: number; total: number }>()
    channelCalls.forEach((call) => {
      const phone = String(call.phone_number || 'Unknown')
      const label = call.lead?.name || phone
      const row = rows.get(phone) || { label, phone, incoming: 0, outgoing: 0, total: 0 }
      if (call.direction === 'inbound') row.incoming += 1
      else row.outgoing += 1
      row.total += 1
      rows.set(phone, row)
    })
    return Array.from(rows.values()).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [channelCalls])

  const whatsappActivity = useMemo(() => {
    const rows = new Map<string, { label: string; phone: string; incoming: number; outgoing: number; total: number }>()
    channelWhatsapp.forEach((conversation) => {
      const phone = String(conversation.customer_phone || 'Unknown')
      const row = rows.get(phone) || { label: conversation.customer_name || phone, phone, incoming: 0, outgoing: 0, total: 0 }
      const direction = String(conversation.last_message_direction || conversation.direction || 'inbound').toLowerCase()
      if (direction === 'outbound') row.outgoing += 1
      else row.incoming += 1
      row.total += 1
      rows.set(phone, row)
    })
    return Array.from(rows.values()).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [channelWhatsapp])

  const activityRows = channel === 'whatsapp' ? whatsappActivity : phoneActivity

  const recentRows = useMemo(() => [
    ...channelAiActivity.map((row: any) => ({ id: `activity-${row._id}`, time: row.created_at, customer: row.customer_phone || row.customer_name || 'AI activity', channel: row.channel || 'Shared AI', action: row.request || row.action || 'AI activity completed', status: row.success === false ? 'Needs review' : 'Completed' })),
    ...channelWhatsapp.slice(0, 5).map((conversation: any) => ({ id: `whatsapp-${conversation._id}`, time: conversation.updated_at || conversation.created_at, customer: conversation.customer_name || conversation.customer_phone, channel: 'WhatsApp', action: conversation.last_message || 'Conversation updated', status: conversation.status || 'Open' })),
    ...channelCalls.slice(0, 5).map((call: any) => ({ id: `call-${call._id}`, time: call.call_date || call.created_at, customer: call.lead?.name || call.phone_number, channel: 'Voice AI', action: call.call_summary || 'Call completed', status: call.status || 'Completed' })),
  ].sort((a, b) => dateValue(b.time) - dateValue(a.time)).slice(0, 7), [channelAiActivity, channelCalls, channelWhatsapp])

  const maxActivity = Math.max(...activity.map((item) => item.total), 1)
  const maxSource = Math.max(...leadSources.map((item) => item.count), 1)
  const incomingCalls = channelCalls.filter((call) => call.direction === 'inbound').length
  const outgoingCalls = channelCalls.filter((call) => call.direction !== 'inbound').length
  const incomingActivity = channel === 'whatsapp' ? whatsappActivity.reduce((total, row) => total + row.incoming, 0) : incomingCalls
  const outgoingActivity = channel === 'whatsapp' ? whatsappActivity.reduce((total, row) => total + row.outgoing, 0) : outgoingCalls
  const channelLabel = channel === 'all' ? 'All channels' : channel === 'whatsapp' ? 'WhatsApp' : 'Voice AI agent'
  const whatsappCount = visibleWhatsappConversations.length
  const voiceCount = visibleCalls.length
  const funnel = [
    { label: 'Conversations', value: totalConversations, color: 'bg-[#f59e0b]' },
    { label: 'Leads captured', value: totalLeads, color: 'bg-[#d97706]' },
    { label: 'Qualified leads', value: qualifiedLeads, color: 'bg-[#b45309]' },
    { label: 'Appointments', value: appointments, color: 'bg-slate-700' },
    { label: 'Jobs won', value: jobs, color: 'bg-slate-900' },
  ]

  return <div className="space-y-6">
    <PageHeader title="Good morning, Raj" description="Here’s what’s happening across your AI receptionist, conversations, leads, and customer operations." />
    <Toolbar onRefresh={load} onExport={() => window.print()}>
      <select value={rangeDays} onChange={(event) => setRangeDays(Number(event.target.value))} aria-label="Date range"><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select>
      <select value={channel} onChange={(event) => setChannel(event.target.value)} aria-label="Channel"><option value="all">All channels</option><option value="whatsapp">WhatsApp</option><option value="voice">Voice AI agent</option></select>
      <select aria-label="Agent"><option>All agents</option></select>
    </Toolbar>

    <DataState loading={loading} error={error} onRetry={load}>
      <section className="relative overflow-hidden rounded-[24px] border border-[#fed7aa] bg-[linear-gradient(110deg,#fff7ed_0%,#ffffff_62%,#f8fafc_100%)] p-6 shadow-[0_16px_34px_rgba(15,23,42,.07)]"><div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#fed7aa]/40 blur-3xl" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-2xl"><div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#b45309]"><Sparkles className="h-3.5 w-3.5" />{channelLabel} performance</div><h2 className="mt-3 text-2xl font-extrabold tracking-[-.05em] text-slate-900">Your customer operation, at a glance.</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your shared AI layer has handled <span className="font-bold text-slate-900">{formatNumber(totalConversations)} conversations</span>, captured <span className="font-bold text-slate-900">{formatNumber(totalLeads)} leads</span>, and qualified <span className="font-bold text-slate-900">{formatNumber(qualifiedLeads)} opportunities</span>.</p></div><div className="flex flex-wrap gap-2"><Link href="/voice/calls" className="inline-flex h-9 items-center gap-2 rounded-md bg-[#d97706] px-3.5 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(217,119,6,.18)] transition hover:brightness-105">View calls <ArrowUpRight className="h-4 w-4" /></Link><Link href="/leads" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">View leads <ArrowUpRight className="h-4 w-4" /></Link></div></div></section>

      <section className="surface-panel mt-5 rounded-[22px] p-5"><SectionTitle icon={Bot} title="Channel performance" action={<span className="text-xs text-slate-400">Shared AI layer</span>} /><p className="mt-2 text-sm text-slate-500">WhatsApp and the Voice AI agent use the same knowledge, tools, leads, and customer records.</p><div className="mt-5 grid gap-4 lg:grid-cols-3"><button type="button" onClick={() => setChannel('whatsapp')} className={`rounded-2xl border p-4 text-left transition ${channel === 'whatsapp' ? 'border-[#70c99d] bg-[#effaf4] shadow-sm ring-2 ring-[#bdebd0]' : 'border-slate-200 bg-white hover:border-[#a7ddbd] hover:bg-[#f8fcfa]'}`}><div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3f7ec] text-[#16805c]"><MessageSquare className="h-5 w-5" /></span><StatusBadge value={data.channels?.whatsapp?.connected ? 'Connected' : 'Not connected'} /></div><div className="mt-4 text-sm font-bold text-slate-900">WhatsApp</div><div className="mt-1 text-xs text-slate-500">Conversations and customer messages</div><div className="mt-4 text-2xl font-extrabold tracking-[-.04em] text-slate-900">{formatNumber(whatsappCount)}</div><div className="mt-1 text-xs text-slate-500">conversations in selected period · {formatNumber(Number(whatsappStats.messages || 0))} messages tracked</div></button><button type="button" onClick={() => setChannel('voice')} className={`rounded-2xl border p-4 text-left transition ${channel === 'voice' ? 'border-[#fdba74] bg-[#fff8ed] shadow-sm ring-2 ring-[#fed7aa]' : 'border-slate-200 bg-white hover:border-[#fdc98d] hover:bg-[#fffaf4]'}`}><div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1dc] text-[#b45309]"><PhoneCall className="h-5 w-5" /></span><StatusBadge value={data.channels?.voice?.connected ? 'Connected' : 'Not connected'} /></div><div className="mt-4 text-sm font-bold text-slate-900">Voice AI agent</div><div className="mt-1 text-xs text-slate-500">Inbound and outbound call handling</div><div className="mt-4 text-2xl font-extrabold tracking-[-.04em] text-slate-900">{formatNumber(voiceCount)}</div><div className="mt-1 text-xs text-slate-500">calls in selected period</div></button><button type="button" onClick={() => setChannel('all')} className={`rounded-2xl border p-4 text-left transition ${channel === 'all' ? 'border-[#aebbe8] bg-[#f4f6ff] shadow-sm ring-2 ring-[#d9def7]' : 'border-slate-200 bg-white hover:border-[#b8c3ee] hover:bg-[#fafaff]'}`}><div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9edff] text-[#5a67b1]"><Bot className="h-5 w-5" /></span><StatusBadge value="Shared" /></div><div className="mt-4 text-sm font-bold text-slate-900">Shared AI brain</div><div className="mt-1 text-xs text-slate-500">Knowledge, tools, and policy for both channels</div><div className="mt-4 text-2xl font-extrabold tracking-[-.04em] text-slate-900">{formatNumber(Number(metrics.ai_usage || 0))}</div><div className="mt-1 text-xs text-slate-500">AI actions tracked</div></button></div></section>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6"><KpiCard label="Conversations" value={formatNumber(totalConversations)} detail={`${channelLabel} selected · ${formatNumber(whatsappCount)} WhatsApp · ${formatNumber(voiceCount)} Voice AI`} icon={MessageSquare} /><KpiCard label="Qualified leads" value={formatNumber(qualifiedLeads)} detail={`${formatNumber(totalLeads)} leads in selected view`} icon={Target} /><KpiCard label="Appointments" value={appointments == null ? '—' : formatNumber(Number(appointments))} detail={appointments == null ? 'Not connected yet' : 'Shared outcome metric'} icon={CalendarDays} tone={appointments == null ? 'slate' : 'amber'} /><KpiCard label="Jobs won" value={jobs == null ? '—' : formatNumber(Number(jobs))} detail={jobs == null ? 'Not connected yet' : 'Shared outcome metric'} icon={CheckCircle2} tone={jobs == null ? 'slate' : 'amber'} /><KpiCard label="AI resolution" value={`${metrics.ai_resolution_percent || 0}%`} detail="Shared across WhatsApp and Voice" icon={Bot} /><KpiCard label="Revenue influenced" value={revenue == null ? '—' : `₹${formatNumber(Number(revenue))}`} detail={revenue == null ? 'Add job values to track' : 'Shared outcome metric'} icon={WalletCards} tone={revenue == null ? 'slate' : 'amber'} /></div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <section className="surface-panel rounded-[22px] p-5"><SectionTitle icon={Activity} title="Conversation activity" action={<span className="text-xs text-slate-400">Last 7 days · {channelLabel}</span>} /><div className="mt-6 flex h-52 items-end gap-3 border-b border-slate-100 px-2">{activity.map((item) => <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex h-full w-full items-end justify-center"><div className="w-full max-w-10 rounded-t-lg bg-[linear-gradient(180deg,#f59e0b,#d97706)] transition hover:brightness-105" style={{ height: `${item.total ? Math.max(8, (item.total / maxActivity) * 100) : 3}%` }} title={`${item.total} interactions`} /></div><span className="text-[11px] font-medium text-slate-400">{item.label}</span></div>)}</div><div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#d97706]" />WhatsApp, Voice AI, and shared AI activity</span><span className="ml-auto">{formatNumber(totalConversations)} interactions in selected period</span></div></section>
        <section className="surface-panel rounded-[22px] p-5"><SectionTitle icon={TrendingUp} title="Top lead sources" action={<span className="text-xs text-slate-400">{rangeDays} days</span>} /><div className="mt-6 space-y-5">{leadSources.length ? leadSources.map((source) => <div key={source.name}><div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium capitalize text-slate-700">{source.name}</span><span className="font-bold text-slate-900">{source.count}</span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#d97706]" style={{ width: `${Math.max(7, (source.count / maxSource) * 100)}%` }} /></div></div>) : <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">Lead source data will appear as leads are captured.</div>}</div><Link href="/leads" className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-[#b45309] hover:underline">View all leads <ChevronRight className="h-3.5 w-3.5" /></Link></section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <section className="surface-panel overflow-hidden rounded-[22px]"><div className="border-b border-slate-200 p-5"><SectionTitle icon={channel === 'whatsapp' ? MessageSquare : PhoneCall} title={channel === 'whatsapp' ? 'WhatsApp activity' : 'Voice AI activity'} action={<span className="text-xs text-slate-400">Last {rangeDays} days</span>} /><div className="mt-5 grid grid-cols-3 gap-3"><div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400">Total {channel === 'whatsapp' ? 'conversations' : 'calls'}</div><div className="mt-1 text-xl font-extrabold tracking-[-.04em] text-slate-900">{formatNumber(channel === 'whatsapp' ? channelWhatsapp.length : channelCalls.length)}</div></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400">Incoming</div><div className="mt-1 text-xl font-extrabold tracking-[-.04em] text-slate-900">{formatNumber(incomingActivity)}</div></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400">Outgoing</div><div className="mt-1 text-xl font-extrabold tracking-[-.04em] text-slate-900">{formatNumber(outgoingActivity)}</div></div></div></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-[.12em] text-slate-400"><tr><th className="px-5 py-3">Contact</th><th className="px-3 py-3">Incoming</th><th className="px-3 py-3">Outgoing</th><th className="px-5 py-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{activityRows.map((row) => <tr key={row.phone} className="hover:bg-slate-50"><td className="px-5 py-3"><div className="font-semibold text-slate-800">{row.label}</div><div className="mt-0.5 text-xs text-slate-400">{row.phone}</div></td><td className="px-3 py-3 text-slate-600">{row.incoming}</td><td className="px-3 py-3 text-slate-600">{row.outgoing}</td><td className="px-5 py-3 text-right font-bold text-slate-900">{row.total}</td></tr>)}</tbody></table>{!activityRows.length && <div className="px-5 py-12 text-center text-sm text-slate-500">{channel === 'whatsapp' ? 'WhatsApp activity will appear after the first conversation.' : 'Voice AI activity will appear after the first call.'}</div>}</div><div className="border-t border-slate-200 px-5 py-3"><Link href={channel === 'whatsapp' ? '/whatsapp/inbox' : '/voice/calls'} className="inline-flex items-center gap-1 text-xs font-semibold text-[#b45309] hover:underline">{channel === 'whatsapp' ? 'View WhatsApp inbox' : 'View call details'} <ChevronRight className="h-3.5 w-3.5" /></Link></div></section>

        <section className="surface-panel rounded-[22px] p-5"><SectionTitle icon={BarChart3} title="Lead funnel" action={<span className="text-xs text-slate-400">From first contact to outcome</span>} /><div className="mt-6 space-y-4">{funnel.map((step, index) => <div key={step.label} className="relative flex items-center gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${step.color}`}>{index + 1}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-slate-700">{step.label}</span><span className={`text-sm font-bold ${step.value == null ? 'text-slate-400' : 'text-slate-900'}`}>{step.value == null ? '—' : formatNumber(Number(step.value))}</span></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${step.color}`} style={{ width: `${step.value == null ? 8 : Math.max(8, Math.min(100, (Number(step.value) / Math.max(Number(totalConversations) || 1, 1)) * 100))}%` }} /></div></div>{index < funnel.length - 1 && <div className="absolute left-[17px] top-9 h-4 border-l border-dashed border-slate-300" />}</div>)}</div><div className="mt-6 rounded-xl bg-[#fff7ed] p-3 text-xs leading-5 text-slate-600"><span className="font-semibold text-[#b45309]">Outcome view:</span> move from conversations to qualified opportunities, appointments, and completed work as those modules are connected.</div></section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <section className="surface-panel overflow-hidden rounded-[22px]"><div className="border-b border-slate-200 p-5"><SectionTitle icon={Clock3} title="Recent activity" action={<Link href="/brain/activity" className="text-xs font-semibold text-[#b45309] hover:underline">View activity</Link>} /></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-[.12em] text-slate-400"><tr><th className="px-5 py-3">Time</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Channel</th><th className="px-3 py-3">Action</th><th className="px-5 py-3 text-right">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{recentRows.map((row: any) => <tr key={row.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-5 py-3 text-xs text-slate-400">{formatTime(row.time)}</td><td className="px-3 py-3 font-medium text-slate-800">{row.customer || '—'}</td><td className="px-3 py-3 text-xs text-slate-500">{row.channel}</td><td className="max-w-[260px] truncate px-3 py-3 text-slate-600">{row.action}</td><td className="px-5 py-3 text-right"><StatusBadge value={row.status} /></td></tr>)}</tbody></table>{!recentRows.length && <div className="px-5 py-12 text-center text-sm text-slate-500">Recent customer activity will appear here.</div>}</div></section>
        <section className="surface-panel rounded-[22px] p-5"><SectionTitle icon={Bot} title="AI agent health" /><div className="mt-5 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff7ed] text-[#d97706]"><Bot className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="text-sm font-bold text-slate-900">Shared AI assistant</div><div className="mt-1 text-xs text-slate-500">Knowledge and tools are shared across WhatsApp and Voice AI.</div></div><StatusBadge value="Active" /></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-slate-200 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400">WhatsApp</div><div className="mt-2"><StatusBadge value={data.channels?.whatsapp?.connected ? 'Connected' : 'Not connected'} /></div></div><div className="rounded-xl border border-slate-200 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400">Voice AI agent</div><div className="mt-2"><StatusBadge value={data.channels?.voice?.connected ? 'Connected' : 'Not connected'} /></div></div></div><div className="mt-4 rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-4"><div className="flex items-start gap-3"><Users className="mt-0.5 h-4 w-4 shrink-0 text-[#d97706]" /><div><div className="text-sm font-semibold text-slate-800">Need help with your AI agent?</div><p className="mt-1 text-xs leading-5 text-slate-500">Review shared knowledge, tools, and integrations when a conversation needs attention.</p><Link href="/brain/knowledge" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#b45309] hover:underline">Open assistant settings <ChevronRight className="h-3.5 w-3.5" /></Link></div></div></div></section>
      </div>
    </DataState>
  </div>
}
