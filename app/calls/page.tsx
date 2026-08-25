'use client'

import { useEffect, useState } from 'react'
import { Eye, MessageSquare, Phone, User, X } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { PageHeader } from '../../components/OmniPage'
import { ActionButton, API_BASE, DataState, downloadCsv, MetricGrid, StatusBadge, Toolbar } from '../../components/PlatformUI'

interface Call {
  _id: string
  phone_number: string | number
  lead_id?: string
  lead?: { name: string; company?: string; email?: string }
  call_date: string
  status: 'completed' | 'failed' | 'missed' | 'initiated'
  duration: number
  transcription: Array<{ type: 'user' | 'bot' | 'greeting' | 'exit'; content: string; timestamp: string }>
  ai_responses: Array<{ type: 'bot' | 'greeting' | 'exit'; content: string; timestamp: string }>
  call_summary: string
  sentiment: string
  interest_analysis?: { interest_status: 'interested' | 'not_interested' | 'neutral'; confidence: number; reasoning: string; key_indicators: string[] }
  created_at: string
}

interface CallStats {
  total_calls: number
  calls_today: number
  calls_this_week: number
  average_duration: number
  status_counts: { completed: number; failed: number; missed: number }
  interest_counts?: { interested: number; not_interested: number; neutral: number }
}

const emptyStats: CallStats = {
  total_calls: 0,
  calls_today: 0,
  calls_this_week: 0,
  average_duration: 0,
  status_counts: { completed: 0, failed: 0, missed: 0 },
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [stats, setStats] = useState<CallStats>(emptyStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [interestFilter, setInterestFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [callsResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE}/api/calls`),
        fetch(`${API_BASE}/api/calls/stats`),
      ])
      const callsPayload = await callsResponse.json()
      const statsPayload = await statsResponse.json()
      if (!callsResponse.ok || !callsPayload.success) throw new Error(callsPayload.error || 'Unable to load calls')
      setCalls(callsPayload.data || [])
      if (statsPayload.success) setStats(statsPayload.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load calls'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
  const formatDate = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    const pad = (part: number) => String(part).padStart(2, '0')
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  const interestBadge = (analysis?: Call['interest_analysis']) => {
    if (!analysis) return <span className="premium-badge pending">No analysis</span>
    const tone = analysis.interest_status === 'interested' ? 'live' : analysis.interest_status === 'not_interested' ? 'alert' : 'pending'
    const label = analysis.interest_status === 'not_interested' ? 'Not interested' : analysis.interest_status.charAt(0).toUpperCase() + analysis.interest_status.slice(1)
    return <span className={`premium-badge ${tone}`}>{label} · {Math.round(analysis.confidence * 100)}%</span>
  }

  const filteredCalls = calls.filter((call) => {
    const search = searchTerm.toLowerCase()
    const matchesSearch = String(call.phone_number || '').toLowerCase().includes(search) || (call.lead?.name || '').toLowerCase().includes(search)
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter
    const matchesInterest = interestFilter === 'all' || (interestFilter === 'no_analysis' && !call.interest_analysis) || call.interest_analysis?.interest_status === interestFilter
    return matchesSearch && matchesStatus && matchesInterest
  })

  return (
    <div className="space-y-7">
      <PageHeader title="Call history" description="Review calls, outcomes, lead context, interest signals, transcripts, and AI summaries in one consistent workspace." />

      <Toolbar search={searchTerm} onSearch={setSearchTerm} onRefresh={load} onExport={() => downloadCsv('calls')}>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-auto" aria-label="Call status">
          <option value="all">All statuses</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="missed">Missed</option>
        </select>
        <select value={interestFilter} onChange={(event) => setInterestFilter(event.target.value)} className="w-auto" aria-label="Call interest">
          <option value="all">All interest</option><option value="interested">Interested</option><option value="not_interested">Not interested</option><option value="neutral">Neutral</option><option value="no_analysis">No analysis</option>
        </select>
      </Toolbar>

      <DataState loading={loading} error={error} onRetry={load}>
        <MetricGrid items={[
          { label: 'Total calls', value: stats.total_calls },
          { label: 'Today', value: stats.calls_today },
          { label: 'Interested', value: stats.interest_counts?.interested || 0 },
          { label: 'Not interested', value: stats.interest_counts?.not_interested || 0 },
          { label: 'Average duration', value: formatDuration(stats.average_duration) },
          { label: 'Completed', value: stats.status_counts.completed },
        ]} />

        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div><h2 className="text-sm font-semibold text-slate-900">Recent calls</h2><p className="mt-1 text-xs text-slate-500">{filteredCalls.length} records match the current filters.</p></div>
            <span className="hidden text-xs text-slate-500 sm:block">Updated from live call data</span>
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[.12em] text-slate-500"><tr><th className="px-5 py-3">Call</th><th className="px-5 py-3">Lead</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Interest</th><th className="px-5 py-3">Duration</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCalls.map((call) => <tr key={call._id} className="transition hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-5 py-4"><div className="font-semibold text-slate-900">{String(call.phone_number || '—')}</div><div className="mt-1 text-xs text-slate-500">{formatDate(call.call_date)}</div></td>
                  <td className="px-5 py-4">{call.lead ? <><div className="font-medium text-slate-900">{call.lead.name || '—'}</div><div className="mt-1 text-xs text-slate-500">{call.lead.company || '—'}</div></> : <span className="text-slate-500">No lead</span>}</td>
                  <td className="px-5 py-4"><StatusBadge value={call.status} /></td><td className="px-5 py-4">{interestBadge(call.interest_analysis)}</td><td className="px-5 py-4 text-slate-700">{formatDuration(call.duration)}</td>
                  <td className="px-5 py-4 text-right"><div className="inline-flex items-center gap-2"><ActionButton onClick={() => setSelectedCall(call)} icon={<Eye className="h-3.5 w-3.5" />}>View</ActionButton><Link href={`/voice/calls/${call._id}`} className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Details</Link></div></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-slate-100 lg:hidden">
            {filteredCalls.map((call) => <div key={call._id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-slate-900">{String(call.phone_number || '—')}</div><div className="mt-1 text-xs text-slate-500">{formatDate(call.call_date)}</div></div><ActionButton onClick={() => setSelectedCall(call)} icon={<Eye className="h-3.5 w-3.5" />}>View</ActionButton></div><div className="flex flex-wrap items-center gap-2"><StatusBadge value={call.status} />{interestBadge(call.interest_analysis)}<span className="text-xs text-slate-500">{formatDuration(call.duration)}</span></div>{call.lead && <div className="text-sm text-slate-700">{call.lead.name}<span className="ml-2 text-xs text-slate-500">{call.lead.company || ''}</span></div>}</div>)}
          </div>
          {!filteredCalls.length && <div className="flex flex-col items-center justify-center px-5 py-16 text-center"><Phone className="h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-700">No calls found</p><p className="mt-1 text-xs text-slate-500">Try another search or filter.</p></div>}
        </section>
      </DataState>

      {selectedCall && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm" onClick={() => setSelectedCall(null)}>
        <div className="surface-panel max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-900">Call details</h2><p className="mt-1 text-sm text-slate-500">{selectedCall.phone_number} · {formatDate(selectedCall.call_date)}</p></div><button onClick={() => setSelectedCall(null)} className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close details"><X className="h-5 w-5" /></button></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="text-xs text-slate-500">Status</div><div className="mt-2"><StatusBadge value={selectedCall.status} /></div></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="text-xs text-slate-500">Duration</div><div className="mt-2 text-sm font-semibold text-slate-900">{formatDuration(selectedCall.duration)}</div></div></div>
          {selectedCall.lead && <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold text-slate-900">Lead information</h3><div className="mt-3 grid gap-3 text-sm sm:grid-cols-3"><div><div className="text-xs text-slate-500">Name</div><div className="mt-1 text-slate-800">{selectedCall.lead.name}</div></div><div><div className="text-xs text-slate-500">Company</div><div className="mt-1 text-slate-800">{selectedCall.lead.company || '—'}</div></div><div><div className="text-xs text-slate-500">Email</div><div className="mt-1 break-words text-slate-800">{selectedCall.lead.email || '—'}</div></div></div></div>}
          {selectedCall.interest_analysis && <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-slate-900">Interest analysis</h3>{interestBadge(selectedCall.interest_analysis)}</div><p className="mt-3 text-sm leading-6 text-slate-600">{selectedCall.interest_analysis.reasoning}</p><div className="mt-3 flex flex-wrap gap-2">{selectedCall.interest_analysis.key_indicators?.map((indicator) => <span key={indicator} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">{indicator}</span>)}</div></div>}
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold text-slate-900">Call summary</h3><p className="mt-2 text-sm leading-6 text-slate-600">{selectedCall.call_summary || 'No summary available.'}</p></div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-[#d97706]" /><h3 className="text-sm font-semibold text-slate-900">Conversation</h3></div><div className="mt-4 max-h-80 space-y-3 overflow-y-auto">{[...selectedCall.transcription, ...selectedCall.ai_responses].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((message, index) => <div key={`${message.timestamp}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[.1em] text-slate-500"><span className="flex items-center gap-1.5">{message.type === 'user' ? <User className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}{message.type === 'user' ? 'Customer' : 'AI agent'}</span><span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div><p className="mt-2 text-sm leading-6 text-slate-700">{message.content}</p></div>)}</div></div>
        </div>
      </div>}
    </div>
  )
}
