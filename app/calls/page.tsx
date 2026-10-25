'use client'

import { orderedTranscript } from '../../components/transcript'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { ArrowUpRight, Bot, CalendarDays, ChevronDown, Clock3, FileText, Headphones, MessageSquare, Phone, PhoneCall, RefreshCw, Search, Trash2, User, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '../../components/OmniPage'
import { API_BASE, DataState, MetricGrid, StatusBadge, Toolbar, authFetch } from '../../components/PlatformUI'
import { RecordingAudio } from '../../components/RecordingAudio'
import { ANY_TIME, DayRangeMenu, rangeBounds, rangeLabel, type DayRange } from '../../components/day-range'
import { type LeadLanguage } from '../../components/lead-language'

type Message = { type?: string; content?: string; timestamp?: string; segment?: 'ai' | 'human'; language?: LeadLanguage }
type Lead = { _id?: string; id?: string; name: string; phone?: string | number; email?: string; company?: string; callOnly?: boolean; callId?: string }
type Call = { _id: string; messages?: { role?: string; text?: string; at?: string; language?: LeadLanguage }[]; human_transcript?: { role?: string; text?: string; at?: string }[]; human_transcription_status?: string; phone_number: string | number; lead_id?: string; lead?: { name: string; company?: string; email?: string }; call_date?: string; created_at?: string; status?: string; direction?: string; duration?: number; transcription?: Message[]; ai_responses?: Message[]; call_summary?: string; human_summary?: string; next_action?: string; recording_url?: string; recording_sid?: string; full_recording_url?: string; full_recording_sid?: string; recording?: string; audio_url?: string; human_call_sid?: string; human_call_duration?: number; human_call_status?: string; human_recording_status?: string; interest_analysis?: { interest_status?: string; confidence?: number }; transfer_requested?: boolean; transfer_status?: string; transfer_destination?: string; transfer_error?: string; transfer_succeeded?: boolean; transfer_targets?: { name: string; phone: string; status: string; call_sid?: string }[]; accepted_by?: string; handled_by?: string; provider?: string; channel_type?: string; disconnection_reason?: string; call_cost?: { combined_cost?: number }; latency?: Record<string, unknown>; end_to_end_latency_ms?: number; sentiment?: string; call_successful?: boolean; human_callback_requested?: boolean; custom_analysis_data?: Record<string, unknown>; agent_name?: string; agent_version?: number; preferred_language?: LeadLanguage; languages_used?: LeadLanguage[]; summary_language?: string }
type CallStats = { total_calls?: number; calls_today?: number; average_duration?: number; status_counts?: { completed?: number; failed?: number; missed?: number } }

const emptyStats: CallStats = { total_calls: 0, calls_today: 0, average_duration: 0, status_counts: {} }
const formatDuration = (seconds = 0) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
const formatDate = (value?: string) => { if (!value) return '—'; const date = new Date(value); if (Number.isNaN(date.getTime())) return '—'; return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` }
const formatDay = (value?: string) => { if (!value) return 'Unknown day'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Unknown day' : date.toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }) }
const inTimeWindow = (call: Call, from: string, to: string) => {
  if (!from && !to) return true
  const date = new Date(call.call_date || call.created_at || '')
  if (Number.isNaN(date.getTime())) return false
  const minutes = date.getHours() * 60 + date.getMinutes()
  const start = from ? Number(from.slice(0, 2)) * 60 + Number(from.slice(3, 5)) : 0
  const end = to ? Number(to.slice(0, 2)) * 60 + Number(to.slice(3, 5)) : 24 * 60 - 1
  return start <= end ? minutes >= start && minutes <= end : minutes >= start || minutes <= end
}
/** The call in speaking order (components/transcript.ts). */
const getConversation = (call?: Call | null): Message[] => orderedTranscript(call)
/** Web and browser calls carry an internal id instead of a phone number: show what it is, not the id. */
const contactLabel = (phone: string) => phone.startsWith('client:browser_') ? 'Browser test call' : phone.startsWith('web:') ? 'Web call' : phone
const getSpeaker = (message: Message) => { const type = String(message.type || '').toLowerCase(); return message.type === 'user' ? 'Customer' : ['human', 'agent', 'human_agent'].includes(type) ? 'Human agent' : 'AI agent' }
const isHumanHandled = (call: Call) => Boolean(call.accepted_by || call.handled_by || call.human_callback_requested || call.transfer_requested || ['requested', 'dialing', 'ringing', 'connected', 'accepted', 'completed'].includes(String(call.transfer_status || '').toLowerCase()))

/** date_from/date_to for the calls API: naive UTC, how call times are stored. */
const rangeParams = (range: DayRange) => { const { since, until } = rangeBounds(range); const utc = (date: Date) => date.toISOString().slice(0, 19); return `${since ? `&date_from=${utc(since)}` : ''}${until ? `&date_to=${utc(until)}` : ''}` }
const FAILED = ['failed', 'missed', 'no-answer', 'busy', 'canceled']
/** The four cards for the calls of the picked day(s). */
const rangeMetrics = (calls: Call[], label: string) => {
  const answered = calls.filter((call) => ['completed', 'ended'].includes(String(call.status || '').toLowerCase()))
  const lengths = answered.map((call) => call.duration || 0).filter(Boolean)
  return [{ label: 'Total calls', value: calls.length, detail: label }, { label: 'Completed', value: answered.length, detail: calls.length ? `${Math.round(answered.length / calls.length * 100)}% of calls` : undefined },
    { label: 'Missed', value: calls.filter((call) => FAILED.includes(String(call.status || '').toLowerCase())).length, detail: label }, { label: 'Average duration', value: formatDuration(lengths.length ? lengths.reduce((sum, value) => sum + value, 0) / lengths.length : 0), detail: label }]
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<CallStats>(emptyStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [conversationCall, setConversationCall] = useState<Call | null>(null)
  const [conversationView, setConversationView] = useState<'messages' | 'transcript'>('messages')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [interestFilter, setInterestFilter] = useState('all')
  const [directionFilter, setDirectionFilter] = useState('inbound')
  const [handlingFilter, setHandlingFilter] = useState('all')
  const [range, setRange] = useState<DayRange>(ANY_TIME)
  const [timeFrom, setTimeFrom] = useState('')
  const [timeTo, setTimeTo] = useState('')

  const load = async (selectNewest = false, quiet = false) => {
    if (!quiet) { setLoading(true); setError('') }
    try {
      const read = async (url: string) => { const response = await authFetch(url); const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to load call data'); return payload }
      const [callsResult, statsResult, leadsResult] = await Promise.allSettled([read(`${API_BASE}/api/calls?direction=inbound&limit=200${rangeParams(range)}`), read(`${API_BASE}/api/calls/stats`), read(`${API_BASE}/api/leads/?limit=200`)]);
      if (callsResult.status === 'rejected') throw callsResult.reason
      const nextCalls: Call[] = callsResult.value.data || []
      setCalls(nextCalls)
      setConversationCall((current) => current ? nextCalls.find((call) => call._id === current._id) || current : null)
      if (statsResult.status === 'fulfilled') setStats(statsResult.value.data || emptyStats)
      const loadedLeads: Lead[] = leadsResult.status === 'fulfilled' ? leadsResult.value.data || [] : []
      const leadMap = new Map(loadedLeads.map((lead) => [String(lead._id || lead.id), lead]))
      nextCalls.forEach((call) => { if (call.lead_id && !leadMap.has(String(call.lead_id)) && call.lead) leadMap.set(String(call.lead_id), { _id: String(call.lead_id), name: call.lead.name, company: call.lead.company, email: call.lead.email, phone: call.phone_number }) })
      const knownPhones = new Set(Array.from(leadMap.values()).map((lead) => String(lead.phone || '')).filter(Boolean))
      nextCalls.filter((call) => !call.lead_id && !knownPhones.has(String(call.phone_number || ''))).forEach((call) => {
        leadMap.set(`call:${call._id}`, {
          _id: `call:${call._id}`,
          name: call.channel_type === 'web_call' ? 'Retell web call' : String(call.phone_number || 'Unknown caller'),
          phone: call.phone_number,
          company: call.provider === 'retell' ? 'Retell AI' : 'Unlinked call',
          callOnly: true,
          callId: call._id,
        })
      })
      const nextLeads = Array.from(leadMap.values())
      const latestCall = (lead: Lead) => {
        const id = String(lead._id || lead.id || '')
        const match = nextCalls.find((call) => lead.callOnly ? call._id === lead.callId : String(call.lead_id || '') === id || Boolean(lead.phone && String(call.phone_number) === String(lead.phone)))
        return Date.parse(match?.call_date || match?.created_at || '') || 0
      }
      nextLeads.sort((a, b) => latestCall(b) - latestCall(a))
      setLeads(nextLeads)
      setSelectedLeadId((current) => !selectNewest && current && nextLeads.some((lead) => String(lead._id || lead.id) === current) ? current : String(nextLeads[0]?._id || nextLeads[0]?.id || ''))
    } catch (err) { if (!quiet) { const message = err instanceof Error ? err.message : 'Unable to load calls'; setError(message); toast.error(message) } } finally { if (!quiet) setLoading(false) }
  }

  useEffect(() => { load() }, [range])
  useEffect(() => { const timer = window.setInterval(() => { if (!document.hidden) void load(false, true) }, 10000); return () => window.clearInterval(timer) }, [range])
  const leadId = (lead: Lead) => String(lead._id || lead.id || '')
  const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'L'
  const timeFilteredCalls = useMemo(() => calls.filter((call) => inTimeWindow(call, timeFrom, timeTo)), [calls, timeFrom, timeTo])
  const visibleCalls = useMemo(() => timeFilteredCalls.filter((call) => {
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter
    const matchesInterest = interestFilter === 'all' || (interestFilter === 'no_analysis' && !call.interest_analysis) || call.interest_analysis?.interest_status === interestFilter
    const matchesDirection = directionFilter === 'all' || (call.direction || 'outbound') === directionFilter
    const humanHandled = isHumanHandled(call)
    const matchesHandling = handlingFilter === 'all' || (handlingFilter === 'human' ? humanHandled : !humanHandled)
    return matchesStatus && matchesInterest && matchesDirection && matchesHandling
  }), [timeFilteredCalls, directionFilter, handlingFilter, interestFilter, statusFilter])
  const callerIds = new Set(visibleCalls.flatMap((call) => [String(call.lead_id || ''), `call:${call._id}`, `phone:${call.phone_number}`]))
  const filteredLeads = leads.filter((lead) => callerIds.has(leadId(lead)) || callerIds.has(`phone:${lead.phone}`)).filter((lead) => `${lead.name} ${lead.phone || ''} ${lead.company || ''}`.toLowerCase().includes(searchTerm.toLowerCase()))
  const selectedLead = filteredLeads.find((lead) => leadId(lead) === selectedLeadId)
  useEffect(() => {
    if (!selectedLead) setSelectedLeadId(filteredLeads[0] ? leadId(filteredLeads[0]) : '')
  }, [filteredLeads, selectedLead])
  const activeLeadCalls = useMemo(() => visibleCalls.filter((call) => {
    if (!selectedLead) return false
    return selectedLead.callOnly ? call._id === selectedLead.callId : String(call.lead_id || '') === selectedLeadId || (!call.lead_id && String(call.phone_number) === String(selectedLead.phone || ''))
  }), [visibleCalls, selectedLead, selectedLeadId])
  useEffect(() => { setSelectedCall((current) => activeLeadCalls.find((call) => call._id === current?._id) || activeLeadCalls[0] || null) }, [activeLeadCalls])
  const currentCall = selectedCall && activeLeadCalls.some((call) => call._id === selectedCall._id) ? selectedCall : activeLeadCalls[0]
  const historyGroups = useMemo(() => { const groups: { label: string; calls: Call[] }[] = []; activeLeadCalls.forEach((call) => { const label = formatDay(call.call_date || call.created_at); const group = groups.find((item) => item.label === label); if (group) group.calls.push(call); else groups.push({ label, calls: [call] }) }); return groups }, [activeLeadCalls])
  const openConversation = (call: Call, view: 'messages' | 'transcript') => { setSelectedCall(call); setConversationView(view); setConversationCall(call) }

  return <div className="space-y-6">
    <PageHeader title="Call history" description="Every call by caller: listen to the recording, read the conversation and the AI summary." />
    <div className="flex justify-end gap-2"><button type="button" onClick={() => void load(true)} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:border-[#D8C8FF] hover:text-[#5A2BE6] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh calls</button><Link href="/settings/account#call-data" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:border-red-200 hover:text-red-700"><Trash2 className="h-4 w-4" />Clear call data</Link></div>
    <section aria-label="Filter calls by date and time" className="relative z-10 rounded-2xl border border-[#E9DFFF] bg-gradient-to-br from-[#F7F2FF] via-white to-white p-4 shadow-[0_10px_30px_-25px_rgba(80,35,140,.45)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6C3BFF] text-white shadow-sm"><CalendarDays className="h-5 w-5" /></span><div><h2 className="text-sm font-bold text-slate-900">Find calls by date and time</h2><p className="mt-0.5 text-xs leading-5 text-slate-500">Choose one date, then narrow to the hours you need. Times use your device's local time.</p></div></div>{(range.id !== 'any' || timeFrom || timeTo) && <button type="button" onClick={() => { setRange(ANY_TIME); setTimeFrom(''); setTimeTo('') }} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#5A2BE6] hover:bg-[#F1EBFF]">Clear date &amp; time</button>}</div>
      <div className="grid gap-3 sm:grid-cols-[minmax(180px,1fr)_minmax(140px,.7fr)_minmax(140px,.7fr)]"><div><div className="mb-1.5 text-xs font-semibold text-slate-700">Date</div><DayRangeMenu value={range} onChange={setRange} className="w-full" /></div><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">From time</span><input type="time" aria-label="Calls from time" value={timeFrom} onChange={(event) => setTimeFrom(event.target.value)} className="h-10 w-full rounded-xl border border-[#E9DFFF] bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-[#6C3BFF] focus:ring-2 focus:ring-[#E9DFFF]" /></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">To time</span><input type="time" aria-label="Calls to time" value={timeTo} onChange={(event) => setTimeTo(event.target.value)} className="h-10 w-full rounded-xl border border-[#E9DFFF] bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-[#6C3BFF] focus:ring-2 focus:ring-[#E9DFFF]" /></label></div>
    </section>
    <Toolbar search={searchTerm} onSearch={setSearchTerm}><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Call status"><option value="all">All outcomes</option><option value="completed">Completed</option><option value="transferred">Transferred</option><option value="transfer_requested">Transfer requested</option><option value="failed">Failed</option><option value="missed">Missed</option></select><select value={handlingFilter} onChange={(event) => setHandlingFilter(event.target.value)} aria-label="Call handler"><option value="all">AI + human</option><option value="ai">AI agent</option><option value="human">Human agent</option></select><select value={interestFilter} onChange={(event) => setInterestFilter(event.target.value)} aria-label="Call interest"><option value="all">All interest</option><option value="interested">Interested</option><option value="not_interested">Not interested</option><option value="neutral">Neutral</option><option value="no_analysis">No analysis</option></select></Toolbar>
    <DataState loading={loading} error={error} onRetry={load}>
      <MetricGrid items={range.id === 'any' && !timeFrom && !timeTo
        ? [{ label: 'Total calls', value: stats.total_calls || calls.length }, { label: 'Today', value: stats.calls_today || 0 }, { label: 'Completed', value: stats.status_counts?.completed || 0 }, { label: 'Average duration', value: formatDuration(stats.average_duration || 0) }]
        : rangeMetrics(timeFilteredCalls, range.id === 'any' ? 'Selected hours' : rangeLabel(range))} />
      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)_310px]">
        <aside className="surface-panel flex h-[720px] min-h-0 flex-col overflow-hidden rounded-[22px]"><div className="border-b border-slate-200 px-4 py-4"><div className="flex items-center justify-between"><div><div className="text-sm font-bold text-slate-900">Callers</div><div className="mt-1 text-xs text-slate-500">{filteredLeads.length} with matching calls</div></div><Users className="h-4 w-4 text-[#6C3BFF]" /></div><div className="relative mt-4"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Find a lead..." className="h-9 w-full rounded-lg border-slate-200 bg-slate-50 pl-9 text-xs" /></div></div><div className="min-h-0 flex-1 overflow-y-auto p-2">{filteredLeads.map((lead) => { const id = leadId(lead); const leadCalls = visibleCalls.filter((call) => String(call.lead_id || '') === id || (!call.lead_id && String(call.phone_number) === String(lead.phone || ''))); return <button key={id} type="button" onClick={() => setSelectedLeadId(id)} className={`mb-1 w-full rounded-xl border p-3 text-left transition ${selectedLeadId === id ? 'border-[#D8C8FF] bg-[#F1EBFF] shadow-sm' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#6C3BFF] text-xs font-bold text-white">{initials(lead.name)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{lead.name || 'Unnamed lead'}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{lead.company || contactLabel(String(lead.phone || '')) || 'No contact details'}</span></span>{leadCalls.length > 0 && <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#5A2BE6] shadow-sm" title={`${leadCalls.length} ${leadCalls.length === 1 ? 'call' : 'calls'}`}>{leadCalls.length}</span>}</div><div className="mt-2 pl-12 text-[11px] text-slate-500">{leadCalls.length ? `Last call ${formatDate(leadCalls.map((call) => call.call_date || call.created_at || '').sort().slice(-1)[0])}` : 'No calls yet'}</div></button> })}{!filteredLeads.length && <div className="px-3 py-12 text-center"><Users className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-700">No matching calls</p><p className="mt-1 text-xs text-slate-500">Try another date, time, or caller.</p></div>}</div></aside>
        <main className="surface-panel flex h-[720px] min-h-0 min-w-0 flex-col overflow-hidden rounded-[22px]">{selectedLead ? <><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1EBFF] text-sm font-bold text-[#5A2BE6]">{initials(selectedLead.name)}</span><div className="min-w-0"><div className="truncate text-base font-bold text-slate-900">{selectedLead.name}</div><div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500"><span>{selectedLead.phone ? contactLabel(String(selectedLead.phone)) : 'No phone'}</span>{selectedLead.company && <><span>·</span><span>{selectedLead.company}</span></>}</div></div></div><Link href={`/leads/${leadId(selectedLead)}`} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Open lead <ArrowUpRight className="h-3.5 w-3.5" /></Link></div><div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-3"><div><div className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">Call conversation</div><div className="mt-1 text-xs text-slate-500">{activeLeadCalls.length} call{activeLeadCalls.length === 1 ? '' : 's'} · click a call to open its chat</div></div><span className="text-xs text-slate-400">Customer left · agent right</span></div><div className="min-h-0 flex-1 overflow-y-auto p-5"><RecordingTimeline groups={historyGroups} selectedCallId={currentCall?._id} selectedLeadName={selectedLead.name} onSelect={setSelectedCall} onOpen={openConversation} /></div></> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><Users className="h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Select a lead</p><p className="mt-1 max-w-xs text-sm text-slate-500">Choose a lead to see their call conversation.</p></div>}</main>
        <aside className="space-y-4 xl:max-h-[720px] xl:overflow-y-auto">{currentCall ? <><section className="surface-panel rounded-[22px] p-5"><div className="flex items-center justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">Selected call</div><div className="mt-2 text-sm font-bold text-slate-900">Call details</div></div><PhoneCall className="h-5 w-5 text-[#6C3BFF]" /></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400">Duration</div><div className="mt-1 text-sm font-bold text-slate-800">{formatDuration(currentCall.duration)}</div></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400">Direction</div><div className="mt-1 text-sm font-bold capitalize text-slate-800">{currentCall.direction || 'outbound'}</div></div></div><div className="mt-4 flex flex-wrap items-center gap-2"><StatusBadge value={currentCall.status || 'unknown'} />{currentCall.interest_analysis?.interest_status && <StatusBadge value={currentCall.interest_analysis.interest_status} />}</div></section><RecordingPlayer call={currentCall} /><HumanCallDetails call={currentCall} /><section className="surface-panel rounded-[22px] p-5"><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileText className="h-4 w-4 text-[#6C3BFF]" />Call messages and transcript</div><div className="mt-3 max-h-72 overflow-y-auto"><ConversationChat conversation={getConversation(currentCall)} view="transcript" /></div>{currentCall.transfer_succeeded && !currentCall.human_transcript?.length && <p className="mt-3 text-xs text-slate-500">The human segment has audio. Its transcript will appear here when processing finishes.</p>}</section><section className="surface-panel rounded-[22px] p-5"><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileText className="h-4 w-4 text-[#6C3BFF]" />{currentCall.transfer_succeeded ? 'AI conversation summary' : 'Call summary'}</div><p className="mt-3 text-sm leading-6 text-slate-600">{currentCall.call_summary || 'No AI summary available for this recording.'}</p>{currentCall.human_summary && <div className="mt-4 border-t border-slate-200 pt-4"><div className="text-sm font-bold text-slate-900">Human agent summary</div><p className="mt-2 text-sm leading-6 text-slate-600">{currentCall.human_summary}</p></div>}{currentCall.next_action && <div className="mt-4 rounded-xl bg-[#F1EBFF] p-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-[#5A2BE6]">Next action</div><div className="mt-1 text-xs leading-5 text-slate-700">{currentCall.next_action}</div></div>}</section></> : <section className="surface-panel flex min-h-48 items-center justify-center rounded-[22px] p-6 text-center text-sm text-slate-500">Select a call to view details.</section>}</aside>
      </div>
    </DataState>
    {conversationCall && <ConversationModal call={conversationCall} leadName={conversationCall.lead?.name || selectedLead?.name || 'Customer'} view={conversationView} onViewChange={setConversationView} onClose={() => setConversationCall(null)} />}
  </div>
}

function getCallHandler(call: Call) {
  const human = call.accepted_by || call.handled_by
  if (human) return { label: human, type: 'Human' }
  if (call.human_callback_requested || call.transfer_requested || ['requested', 'dialing', 'ringing', 'connected', 'accepted', 'completed'].includes(String(call.transfer_status || '').toLowerCase())) return { label: call.transfer_destination || 'Human callback requested', type: 'Human' }
  return { label: 'AI agent', type: 'AI' }
}

function CallActivityTable({ calls, selectedCallId, onOpen }: { calls: Call[]; selectedCallId?: string; onOpen: (call: Call) => void }) {
  return <section className="surface-panel overflow-hidden rounded-[22px]">
    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><div className="text-sm font-bold text-slate-900">Call activity</div><div className="mt-1 text-xs text-slate-500">{calls.length} matching calls · newest first</div></div><PhoneCall className="h-4 w-4 text-[#6C3BFF]" /></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-[.12em] text-slate-400"><tr><th className="px-5 py-3">Caller</th><th className="px-3 py-3">Direction</th><th className="px-3 py-3">Outcome</th><th className="px-3 py-3">Handled by</th><th className="px-3 py-3">Length</th><th className="px-5 py-3">Started</th></tr></thead><tbody className="divide-y divide-slate-100">{calls.slice(0, 200).map((call) => { const handler = getCallHandler(call); const inbound = call.direction === 'inbound'; return <tr key={call._id} onClick={() => onOpen(call)} className={`cursor-pointer transition hover:bg-slate-50 ${selectedCallId === call._id ? 'bg-[#F1EBFF]/60' : ''}`}><td className="px-5 py-3.5"><div className="font-semibold text-slate-800">{call.lead?.name || call.phone_number || 'Unknown caller'}</div><div className="mt-0.5 text-xs text-slate-500">{call.lead?.company || call.phone_number || 'No phone number'}</div></td><td className="px-3 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${inbound ? 'bg-slate-100 text-slate-600' : 'bg-[#F1EBFF] text-[#5A2BE6]'}`}>{inbound ? 'Inbound' : 'Outbound'}</span></td><td className="px-3 py-3.5"><StatusBadge value={call.status || 'Unknown'} /></td><td className="px-3 py-3.5"><div className={`text-xs font-semibold ${handler.type === 'Human' ? 'text-[#5A2BE6]' : 'text-[#5A2BE6]'}`}>{handler.label}</div><div className="mt-0.5 text-[10px] text-slate-400">{handler.type} handling</div></td><td className="px-3 py-3.5 text-xs text-slate-600">{formatDuration(call.duration)}</td><td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(call.call_date || call.created_at)}</td></tr> })}</tbody></table>{!calls.length && <div className="p-10 text-center text-sm text-slate-500">No calls match the current filters.</div>}</div>
  </section>
}

function RecordingTimeline({ groups, selectedCallId, selectedLeadName, onSelect, onOpen }: { groups: { label: string; calls: Call[] }[]; selectedCallId?: string; selectedLeadName: string; onSelect: (call: Call) => void; onOpen: (call: Call, view: 'messages' | 'transcript') => void }) {
  const [openDay, setOpenDay] = useState(groups[0]?.label || '')
  const [showAllDay, setShowAllDay] = useState(false)
  useEffect(() => { setOpenDay(groups[0]?.label || ''); setShowAllDay(false) }, [groups])
  if (!groups.length) return <EmptyState text="No calls match the current filters." />
  return <div className="space-y-2">{groups.map((group) => { const expanded = openDay === group.label; const shown = expanded && !showAllDay ? group.calls.slice(0, 5) : group.calls; return <section key={group.label} className="overflow-hidden rounded-xl border border-slate-200 bg-white"><button type="button" aria-expanded={expanded} onClick={() => { setOpenDay(expanded ? '' : group.label); setShowAllDay(false) }} className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#F8F5FF] ${expanded ? 'border-b border-slate-200 bg-[#F8F5FF]' : ''}`}><CalendarDays className="h-4 w-4 shrink-0 text-[#6C3BFF]" /><span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{group.label}</span><span className="shrink-0 rounded-full bg-[#F1EBFF] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#5A2BE6]">{group.calls.length} {group.calls.length === 1 ? 'call' : 'calls'}</span><ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button>{expanded && <div className="space-y-3 p-3">{shown.map((call) => <RecordingBubble key={call._id} call={call} selected={selectedCallId === call._id} leadName={selectedLeadName} onSelect={onSelect} onOpen={onOpen} />)}{!showAllDay && group.calls.length > shown.length && <button type="button" onClick={() => setShowAllDay(true)} className="w-full rounded-lg border border-dashed border-[#D8C8FF] px-3 py-2.5 text-sm font-semibold text-[#5A2BE6] hover:bg-[#F8F5FF]">Show {group.calls.length - shown.length} more calls from this date</button>}</div>}</section> })}</div>
}

function RecordingBubble({ call, selected, leadName, onSelect, onOpen }: { call: Call; selected: boolean; leadName: string; onSelect: (call: Call) => void; onOpen: (call: Call, view: 'messages' | 'transcript') => void }) {
  const inbound = call.direction === 'inbound'
  const recording = call.full_recording_url || call.recording_url || call.recording || call.audio_url || call.recording_sid
  return <div className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}><div className={`group w-full cursor-pointer rounded-2xl px-4 py-3 transition ${selected ? 'bg-[#F1EBFF] shadow-[0_8px_20px_rgba(104,6,217,.1)] ring-1 ring-[#D8C8FF]' : 'border border-slate-200 bg-white hover:border-[#D8C8FF] hover:shadow-sm'}`} onClick={() => { onSelect(call); onOpen(call, 'messages') }}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${inbound ? 'bg-slate-100 text-slate-500' : 'bg-[#F1EBFF] text-[#5A2BE6]'}`}><PhoneCall className="h-3.5 w-3.5" /></span><div><div className="text-xs font-bold text-slate-800">{inbound ? 'Incoming call' : 'Outgoing call'}</div><div className="mt-0.5 text-[10px] uppercase tracking-[.08em] text-slate-400">{inbound ? 'Customer → AI agent' : 'AI / human agent → customer'}</div></div></div><StatusBadge value={call.status || 'unknown'} /></div><div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500"><span>{formatDate(call.call_date || call.created_at)}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{formatDuration(call.duration)}</span>{recording && <span className="inline-flex items-center gap-1 font-semibold text-[#5A2BE6]"><Headphones className="h-3 w-3" />Recording</span>}</div><div className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{[call.call_summary, call.human_summary && `Human: ${call.human_summary}`].filter(Boolean).join(' ') || `Call with ${leadName}`}</div><div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="text-[10px] text-slate-400">Click to open chat</span><div className="flex gap-2"><button type="button" onClick={(event) => { event.stopPropagation(); onOpen(call, 'messages') }} className="inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C3BFF]">Messages</button><button type="button" onClick={(event) => { event.stopPropagation(); onOpen(call, 'transcript') }} className="inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C3BFF]">Transcript</button></div></div></div></div>
}

function RecordingPlayer({ call }: { call: Call }) {
  const fullSource = call.full_recording_url || (!call.transfer_succeeded ? call.recording_url || call.recording || call.audio_url : undefined)
  const fullSid = call.full_recording_sid || (!call.transfer_succeeded ? call.recording_sid : undefined)
  const humanSource = call.transfer_succeeded ? call.recording_url : undefined
  const humanSid = call.transfer_succeeded ? call.recording_sid : undefined
  return <section className="surface-panel rounded-[22px] p-5">
    <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Headphones className="h-4 w-4 text-[#6C3BFF]" />Call recordings</div>
    {fullSource || fullSid ? <div className="mt-4"><div className="text-sm font-semibold text-slate-800">{call.transfer_succeeded ? 'Full call: AI and human' : 'AI agent call'}</div><RecordingAudio callId={call._id} source={fullSource} recordingSid={fullSid} showDownload /></div> : <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{call.transfer_succeeded ? 'The AI part of this call has no saved audio.' : 'No recording was saved for this call.'}</p>}
    {call.transfer_succeeded && <div className="mt-5 border-t border-slate-200 pt-4"><div className="text-sm font-semibold text-slate-800">Human agent segment</div>{humanSource || humanSid ? <RecordingAudio callId={call._id} source={humanSource} recordingSid={humanSid} part="human" showDownload /> : <p className="mt-2 text-sm text-slate-600">{call.human_recording_status === 'absent' ? 'Twilio did not save the human audio.' : 'Human audio is processing or unavailable.'}</p>}</div>}
  </section>
}

function HumanCallDetails({ call }: { call: Call }) {
  if (!call.transfer_requested) return null
  const agent = call.accepted_by || call.handled_by || call.transfer_destination || 'Human team'
  return <section aria-label="Human agent call" className="surface-panel rounded-[22px] p-5">
    <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><User className="h-4 w-4 text-[#6C3BFF]" />Human agent call</div>
    {!!call.transfer_targets?.length && <div className="mt-4"><div className="text-xs font-semibold text-slate-700">Team phones called</div><ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">{call.transfer_targets.map((target) => <li key={target.phone} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"><span className="font-medium text-slate-800">{target.name} <span className="font-normal text-slate-500">{target.phone}</span></span><span className="capitalize text-slate-600">{target.status.replace(/-/g, ' ')}</span></li>)}</ul></div>}
    {call.human_summary && <div className="mt-4 rounded-xl bg-violet-50 p-3"><div className="text-xs font-semibold text-violet-800">Human agent summary</div><p className="mt-1 text-sm leading-6 text-violet-950">{call.human_summary}</p></div>}
    {call.transfer_succeeded ? <><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">Connected to</dt><dd className="mt-1 font-semibold text-slate-800">{agent}</dd></div><div><dt className="text-slate-500">Human leg</dt><dd className="mt-1 font-semibold text-slate-800">{call.human_call_duration != null ? formatDuration(call.human_call_duration) : 'Duration unavailable'}</dd></div></dl><p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{call.recording_sid ? 'The human audio recording is available above.' : 'No human audio recording was saved for this call.'} {call.human_transcript?.length ? 'Human conversation text is included in the call transcript.' : 'Human conversation transcription is pending or unavailable.'}</p></>
      : <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{call.transfer_status === 'no-answer' ? 'The team was called, but nobody answered. No human conversation took place, so there is no human recording or transcript.' : call.transfer_error || 'The human transfer did not connect.'} {call.human_callback_requested ? 'A callback was requested.' : ''}</p>}
  </section>
}

function ConversationModal({ call, leadName, view, onViewChange, onClose }: { call: Call; leadName: string; view: 'messages' | 'transcript'; onViewChange: (view: 'messages' | 'transcript') => void; onClose: () => void }) {
  const conversation = getConversation(call)
  return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={`Call conversation with ${leadName}`} className="surface-panel flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="min-w-0"><h2 className="truncate text-lg font-semibold text-slate-900">Conversation with {leadName}</h2><p className="mt-1 text-sm text-slate-500">{formatDate(call.call_date || call.created_at)} · {formatDuration(call.duration)} · {call.direction || 'outbound'} call</p></div>
        <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C3BFF]" aria-label="Close conversation"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 sm:px-6">
        <div role="tablist" aria-label="Conversation view" className="flex rounded-lg bg-slate-100 p-1">
          <button role="tab" aria-selected={view === 'messages'} type="button" onClick={() => onViewChange('messages')} className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C3BFF] ${view === 'messages' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><MessageSquare className="h-4 w-4" />Messages</button>
          <button role="tab" aria-selected={view === 'transcript'} type="button" onClick={() => onViewChange('transcript')} className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C3BFF] ${view === 'transcript' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><FileText className="h-4 w-4" />Transcript</button>
        </div>
        <span className="shrink-0 text-sm text-slate-500">{conversation.length} lines</span>
      </div>
      {call.transfer_succeeded && <p className="border-b border-slate-200 bg-violet-50 px-5 py-3 text-sm leading-5 text-violet-950 sm:px-6">The AI conversation is saved below. {call.human_transcript?.length ? 'The human conversation follows it.' : 'The human recording is available while its transcript is pending or unavailable.'}</p>}
      <div className="min-h-0 overflow-y-auto px-4 py-5 sm:px-6"><ConversationChat conversation={conversation} view={view} /><CallAnalysis call={call} /></div>
    </div>
  </div>, document.body)
}

function ConversationChat({ conversation, view }: { conversation: Message[]; view: 'messages' | 'transcript' }) {
  if (!conversation.some((line) => line.segment === 'human')) return <ConversationLines conversation={conversation} view={view} />
  const ai = conversation.filter((line) => line.segment !== 'human')
  const human = conversation.filter((line) => line.segment === 'human')
  return <div className="space-y-6">
    <section><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#5A2BE6]">AI agent conversation</h3><ConversationLines conversation={ai} view={view} /></section>
    <section><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#5A2BE6]">Human agent conversation</h3><ConversationLines conversation={human} view={view} /></section>
  </div>
}

function ConversationLines({ conversation, view }: { conversation: Message[]; view: 'messages' | 'transcript' }) {
  if (!conversation.length) return <EmptyState text="No conversation text was saved for this call." />
  if (view === 'transcript') return <ol className="divide-y divide-slate-200">{conversation.map((message, index) => {
    const timestamp = message.timestamp ? new Date(message.timestamp) : null
    const time = timestamp && !Number.isNaN(timestamp.getTime()) ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
    return <li key={`${message.timestamp}-${index}`} className="grid gap-1 py-4 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-5"><div className="flex items-baseline gap-2 sm:block"><span className="text-sm font-semibold text-slate-900">{getSpeaker(message)}</span>{time && <span className="text-xs tabular-nums text-slate-500 sm:mt-1 sm:block">{time}</span>}</div><p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{message.content}</p></li>
  })}</ol>
  return <ol className="space-y-5">{conversation.map((message, index) => {
    const customer = message.type === 'user'
    const timestamp = message.timestamp ? new Date(message.timestamp) : null
    const time = timestamp && !Number.isNaN(timestamp.getTime()) ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
    const Icon = customer ? User : Bot
    return <li key={`${message.timestamp}-${index}`} className={`flex ${customer ? 'justify-start' : 'justify-end'}`}><div className="max-w-[92%] sm:max-w-[80%]"><div className={`mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 ${customer ? '' : 'justify-end'}`}><Icon className="h-3.5 w-3.5" />{getSpeaker(message)}{time && <span className="font-normal tabular-nums text-slate-500">· {time}</span>}</div><p className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${customer ? 'rounded-tl-sm bg-slate-100 text-slate-900' : 'rounded-tr-sm bg-violet-100 text-violet-950'}`}>{message.content}</p></div></li>
  })}</ol>
}

function CallAnalysis({ call }: { call: Call }) {
  const custom = Object.entries(call.custom_analysis_data || {}).filter(([, value]) => value !== null && value !== undefined && value !== '')
  const readable = (value: unknown) => typeof value === 'string' ? value : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : typeof value === 'number' ? String(value) : JSON.stringify(value)
  const label = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  const outcome = call.transfer_succeeded ? `Transferred to ${call.accepted_by || call.handled_by || call.transfer_destination || 'human team'}` : call.human_callback_requested ? 'Human callback requested' : label(call.status || 'Pending')
  return <section aria-label="Call analysis" className="mt-8 border-t border-slate-200 pt-6">
    <h3 className="text-base font-semibold text-slate-900">Call analysis</h3>
    <p className="mt-1 text-sm text-slate-500">Outcome and next steps from the saved call record.</p>
    <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <div><dt className="text-xs font-semibold text-slate-500">Outcome</dt><dd className="mt-1 text-sm font-medium text-slate-900">{outcome}</dd></div>
      {call.sentiment && <div><dt className="text-xs font-semibold text-slate-500">Sentiment</dt><dd className="mt-1 text-sm capitalize text-slate-900">{call.sentiment}</dd></div>}
      {call.interest_analysis?.interest_status && <div><dt className="text-xs font-semibold text-slate-500">Interest</dt><dd className="mt-1 text-sm capitalize text-slate-900">{call.interest_analysis.interest_status.replace(/_/g, ' ')}</dd></div>}
      {call.call_successful !== undefined && <div><dt className="text-xs font-semibold text-slate-500">Call successful</dt><dd className="mt-1 text-sm text-slate-900">{call.call_successful ? 'Yes' : 'No'}</dd></div>}
    </dl>
    {call.call_summary && <div className="mt-5"><h4 className="text-xs font-semibold text-slate-500">{call.transfer_succeeded ? 'AI conversation summary' : 'Summary'}</h4><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{call.call_summary}</p></div>}
    {call.human_summary && <div className="mt-5"><h4 className="text-xs font-semibold text-slate-500">Human agent summary</h4><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{call.human_summary}</p></div>}
    {call.next_action && <div className="mt-5 rounded-xl bg-violet-50 p-4"><h4 className="text-xs font-semibold text-violet-800">Next action</h4><p className="mt-1 text-sm leading-6 text-violet-950">{call.next_action}</p></div>}
    {custom.length > 0 && <dl className="mt-5 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">{custom.map(([key, value]) => <div key={key}><dt className="text-xs font-semibold text-slate-500">{label(key)}</dt><dd className="mt-1 break-words text-sm text-slate-900">{readable(value)}</dd></div>)}</dl>}
    {!call.call_summary && !call.next_action && !custom.length && <p className="mt-5 text-sm text-slate-500">No detailed analysis has been saved for this call yet.</p>}
    {call.transfer_succeeded && !call.human_summary && <p className="mt-5 text-xs leading-5 text-slate-500">The human summary will appear when its recording has been transcribed. The recording and transcript appear above when available.</p>}
  </section>
}

function EmptyState({ text }: { text: string }) { return <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center"><Phone className="h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-700">{text}</p><p className="mt-1 text-xs text-slate-500">Try another call or filter.</p></div> }
