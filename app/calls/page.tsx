'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Clock3, Download, FileText, Headphones, MessageSquare, Phone, PhoneCall, Search, User, Users } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { PageHeader } from '../../components/OmniPage'
import { API_BASE, DataState, MetricGrid, StatusBadge, Toolbar, downloadCsv } from '../../components/PlatformUI'

type Message = { type?: string; content?: string; timestamp?: string }

interface Lead {
  _id?: string
  id?: string
  name: string
  phone?: string | number
  email?: string
  company?: string
  status?: string
  call_attempts?: number
  last_call?: string
}

interface Call {
  _id: string
  phone_number: string | number
  lead_id?: string
  lead?: { name: string; company?: string; email?: string }
  call_date?: string
  created_at?: string
  status?: string
  direction?: string
  duration?: number
  transcription?: Message[]
  ai_responses?: Message[]
  call_summary?: string
  sentiment?: string
  next_action?: string
  lead_score?: string | number
  recording_url?: string
  recording?: string
  audio_url?: string
  interest_analysis?: { interest_status?: string; confidence?: number; reasoning?: string; key_indicators?: string[] }
}

interface CallStats {
  total_calls?: number
  calls_today?: number
  average_duration?: number
  status_counts?: { completed?: number; failed?: number; missed?: number }
}

const emptyStats: CallStats = { total_calls: 0, calls_today: 0, average_duration: 0, status_counts: {} }

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<CallStats>(emptyStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [interestFilter, setInterestFilter] = useState('all')
  const [view, setView] = useState<'messages' | 'transcript'>('messages')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const read = async (url: string) => {
        const response = await fetch(url)
        const payload = await response.json()
        if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to load call data')
        return payload
      }
      const [callsResult, statsResult, leadsResult] = await Promise.allSettled([
        read(`${API_BASE}/api/calls?limit=200`),
        read(`${API_BASE}/api/calls/stats`),
        read(`${API_BASE}/api/leads/?limit=200`),
      ])
      if (callsResult.status === 'rejected') throw callsResult.reason
      const nextCalls: Call[] = callsResult.value.data || []
      setCalls(nextCalls)
      if (statsResult.status === 'fulfilled') setStats(statsResult.value.data || emptyStats)

      const loadedLeads: Lead[] = leadsResult.status === 'fulfilled' ? leadsResult.value.data || [] : []
      const leadMap = new Map(loadedLeads.map((lead) => [String(lead._id || lead.id), lead]))
      nextCalls.forEach((call) => {
        if (call.lead_id && !leadMap.has(String(call.lead_id)) && call.lead) leadMap.set(String(call.lead_id), { _id: String(call.lead_id), name: call.lead.name, company: call.lead.company, email: call.lead.email, phone: call.phone_number })
      })
      const nextLeads = Array.from(leadMap.values())
      setLeads(nextLeads)
      setSelectedLeadId((current) => current && nextLeads.some((lead) => String(lead._id || lead.id) === current) ? current : String(nextLeads[0]?._id || nextLeads[0]?.id || ''))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load calls'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const leadId = (lead: Lead) => String(lead._id || lead.id || '')
  const selectedLead = leads.find((lead) => leadId(lead) === selectedLeadId)
  const formatDuration = (seconds = 0) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
  const formatDate = (value?: string) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'L'

  const filteredLeads = leads.filter((lead) => `${lead.name} ${lead.phone || ''} ${lead.company || ''}`.toLowerCase().includes(searchTerm.toLowerCase()))
  const activeLeadCalls = useMemo(() => calls.filter((call) => {
    if (!selectedLead) return false
    const sameLead = String(call.lead_id || '') === selectedLeadId || (!call.lead_id && String(call.phone_number) === String(selectedLead.phone || ''))
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter
    const matchesInterest = interestFilter === 'all' || (interestFilter === 'no_analysis' && !call.interest_analysis) || call.interest_analysis?.interest_status === interestFilter
    return sameLead && matchesStatus && matchesInterest
  }), [calls, interestFilter, selectedLead, selectedLeadId, statusFilter])

  useEffect(() => { setSelectedCall(activeLeadCalls[0] || null) }, [selectedLeadId, calls, statusFilter, interestFilter])

  const currentCall = selectedCall && activeLeadCalls.some((call) => call._id === selectedCall._id) ? selectedCall : activeLeadCalls[0]
  const conversation = useMemo(() => [...(currentCall?.transcription || []), ...(currentCall?.ai_responses || [])].filter((message) => message.content).sort((a, b) => new Date(a.timestamp || '').getTime() - new Date(b.timestamp || '').getTime()), [currentCall])
  const recordingUrl = currentCall?.recording_url || currentCall?.recording || currentCall?.audio_url

  const interestBadge = (analysis?: Call['interest_analysis']) => {
    if (!analysis?.interest_status) return <span className="premium-badge pending">No analysis</span>
    const tone = analysis.interest_status === 'interested' ? 'live' : analysis.interest_status === 'not_interested' ? 'alert' : 'pending'
    return <span className={`premium-badge ${tone}`}>{analysis.interest_status.replace('_', ' ')}{analysis.confidence ? ` · ${Math.round(analysis.confidence * 100)}%` : ''}</span>
  }

  return <div className="space-y-6">
    <PageHeader title="Call history" description="Choose a lead to review every call, recording, message, transcript, and follow-up in one focused view." />

    <Toolbar search={searchTerm} onSearch={setSearchTerm} onRefresh={load} onExport={() => downloadCsv('calls')}>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Call status"><option value="all">All statuses</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="missed">Missed</option></select>
      <select value={interestFilter} onChange={(event) => setInterestFilter(event.target.value)} aria-label="Call interest"><option value="all">All interest</option><option value="interested">Interested</option><option value="not_interested">Not interested</option><option value="neutral">Neutral</option><option value="no_analysis">No analysis</option></select>
    </Toolbar>

    <DataState loading={loading} error={error} onRetry={load}>
      <MetricGrid items={[{ label: 'Total calls', value: stats.total_calls || calls.length }, { label: 'Today', value: stats.calls_today || 0 }, { label: 'Completed', value: stats.status_counts?.completed || 0 }, { label: 'Average duration', value: formatDuration(stats.average_duration || 0) }]} />

      <div className="mt-5 grid min-h-[720px] gap-4 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)_310px]">
        <aside className="surface-panel flex min-h-[720px] flex-col overflow-hidden rounded-[22px]">
          <div className="border-b border-slate-200 px-4 py-4"><div className="flex items-center justify-between"><div><div className="text-sm font-bold text-slate-900">Leads</div><div className="mt-1 text-xs text-slate-500">{filteredLeads.length} people in your workspace</div></div><Users className="h-4 w-4 text-[#d97706]" /></div><div className="relative mt-4"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Find a lead..." className="h-9 w-full rounded-lg border-slate-200 bg-slate-50 pl-9 text-xs" /></div></div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {filteredLeads.map((lead) => {
              const id = leadId(lead)
              const leadCalls = calls.filter((call) => String(call.lead_id || '') === id || (!call.lead_id && String(call.phone_number) === String(lead.phone || '')))
              const latest = leadCalls[0]
              return <button key={id} type="button" onClick={() => setSelectedLeadId(id)} className={`mb-1 w-full rounded-xl border p-3 text-left transition ${selectedLeadId === id ? 'border-[#fed7aa] bg-[#fff7ed] shadow-sm' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">{initials(lead.name)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{lead.name || 'Unnamed lead'}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{lead.company || lead.phone || 'No contact details'}</span></span>{leadCalls.length > 0 && <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 shadow-sm">{leadCalls.length}</span>}</div><div className="mt-3 flex items-center justify-between text-[10px] text-slate-500"><span>{latest ? formatDate(latest.call_date || latest.created_at).split(' ')[0] : 'No calls yet'}</span>{latest && <StatusBadge value={latest.status || 'unknown'} />}</div></button>
            })}
            {!filteredLeads.length && <div className="px-3 py-12 text-center"><Users className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-700">No leads found</p><p className="mt-1 text-xs text-slate-500">Try a different name or phone number.</p></div>}
          </div>
        </aside>

        <main className="surface-panel flex min-h-[720px] min-w-0 flex-col overflow-hidden rounded-[22px]">
          {selectedLead ? <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff7ed] text-sm font-bold text-[#b45309]">{initials(selectedLead.name)}</span><div className="min-w-0"><div className="truncate text-base font-bold text-slate-900">{selectedLead.name}</div><div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500"><span>{selectedLead.phone || 'No phone'}</span>{selectedLead.company && <><span>·</span><span>{selectedLead.company}</span></>}</div></div></div><Link href={`/leads/${leadId(selectedLead)}`} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Open lead <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
            <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-3"><div className="flex items-center justify-between"><div><div className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">Call history</div><div className="mt-1 text-xs text-slate-500">{activeLeadCalls.length} matching call{activeLeadCalls.length === 1 ? '' : 's'}</div></div><span className="text-xs text-slate-400">Newest first</span></div><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{activeLeadCalls.map((call) => <button key={call._id} type="button" onClick={() => setSelectedCall(call)} className={`min-w-[190px] rounded-xl border p-3 text-left transition ${currentCall?._id === call._id ? 'border-[#fed7aa] bg-white shadow-sm' : 'border-slate-200 bg-white/60 hover:bg-white'}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-800">{formatDate(call.call_date || call.created_at).split(' ')[0]}</span><StatusBadge value={call.status || 'unknown'} /></div><div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{formatDuration(call.duration)}</span><span className="capitalize">{call.direction || 'outbound'}</span></div><div className="mt-2 truncate text-xs text-slate-500">{call.call_summary || 'No summary recorded'}</div></button>)}</div></div>
            {currentCall ? <><div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3"><div className="flex items-center gap-2"><button type="button" onClick={() => setView('messages')} className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition ${view === 'messages' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><MessageSquare className="h-3.5 w-3.5" />Messages</button><button type="button" onClick={() => setView('transcript')} className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition ${view === 'transcript' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><FileText className="h-3.5 w-3.5" />Transcript</button></div><span className="text-xs text-slate-400">{conversation.length} entries</span></div><div className="min-h-0 flex-1 overflow-y-auto p-5">{view === 'messages' ? <div className="space-y-3">{conversation.length ? conversation.map((message, index) => <div key={`${message.timestamp}-${index}`} className={`flex ${message.type === 'user' ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 ${message.type === 'user' ? 'border border-slate-200 bg-slate-50' : 'bg-[#fff7ed] text-slate-800'}`}><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.1em] text-slate-400"><span>{message.type === 'user' ? 'Customer' : 'AI agent'}</span><span>·</span><span>{message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span></div><p className="mt-2 text-sm leading-6 text-slate-700">{message.content}</p></div></div>) : <EmptyConversation text="No messages were stored for this call." />}</div> : <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">{conversation.length ? conversation.map((message, index) => <div key={`${message.timestamp}-${index}`} className="flex gap-3 p-4"><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${message.type === 'user' ? 'bg-slate-100 text-slate-500' : 'bg-[#fff7ed] text-[#b45309]'}`}>{message.type === 'user' ? <User className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-700">{message.type === 'user' ? 'Customer' : 'AI agent'}</span><span className="text-[10px] text-slate-400">{message.timestamp ? new Date(message.timestamp).toLocaleString() : '—'}</span></div><p className="mt-1 text-sm leading-6 text-slate-600">{message.content}</p></div></div>) : <EmptyConversation text="No transcript was stored for this call." />}</div>}</div></> : <EmptyConversation text="No calls match the current filters." />}
          </> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><Users className="h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Select a lead</p><p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">Choose a lead from the list to see their complete call history.</p></div>}
        </main>

        <aside className="space-y-4 xl:min-h-[720px]">
          {currentCall ? <>
            <section className="surface-panel rounded-[22px] p-5"><div className="flex items-center justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">Selected call</div><div className="mt-2 text-sm font-bold text-slate-900">{formatDate(currentCall.call_date || currentCall.created_at)}</div></div><PhoneCall className="h-5 w-5 text-[#d97706]" /></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400">Duration</div><div className="mt-1 text-sm font-bold text-slate-800">{formatDuration(currentCall.duration)}</div></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400">Direction</div><div className="mt-1 text-sm font-bold capitalize text-slate-800">{currentCall.direction || 'Outbound'}</div></div></div><div className="mt-4 flex flex-wrap items-center gap-2"><StatusBadge value={currentCall.status || 'unknown'} />{interestBadge(currentCall.interest_analysis)}</div></section>
            <section className="surface-panel rounded-[22px] p-5"><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Headphones className="h-4 w-4 text-[#d97706]" />Call recording</div>{recordingUrl ? <><audio className="mt-4 w-full" controls src={recordingUrl}>Your browser does not support audio playback.</audio><a href={recordingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#b45309] hover:underline"><Download className="h-3.5 w-3.5" />Open recording</a></> : <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500">No recording is attached to this call yet. The player will appear here when the provider sends the recording URL.</div>}</section>
            <section className="surface-panel rounded-[22px] p-5"><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileText className="h-4 w-4 text-[#d97706]" />Call summary</div><p className="mt-3 text-sm leading-6 text-slate-600">{currentCall.call_summary || 'No summary available for this call.'}</p>{currentCall.next_action && <div className="mt-4 rounded-xl bg-[#fff7ed] p-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-[#b45309]">Next action</div><div className="mt-1 text-xs leading-5 text-slate-700">{currentCall.next_action}</div></div>}</section>
          </> : <section className="surface-panel flex min-h-48 items-center justify-center rounded-[22px] p-6 text-center text-sm text-slate-500">Select a call to view its recording and summary.</section>}
        </aside>
      </div>
    </DataState>
  </div>
}

function EmptyConversation({ text }: { text: string }) {
  return <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center"><Phone className="h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-700">{text}</p><p className="mt-1 text-xs text-slate-500">Try another call from the history above.</p></div>
}
