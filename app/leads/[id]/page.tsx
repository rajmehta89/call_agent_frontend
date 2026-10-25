'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowUpRight, Bot, ClipboardCheck, Clock3, FileText, Loader2, MessageSquare, PhoneCall, Send, User } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { orderedTranscript } from '@/components/transcript'
import { ActionButton, API_BASE, DataState, StatusBadge, authFetch } from '@/components/PlatformUI'

type Lead = { _id?: string; name?: string; phone?: string; email?: string; company?: string; notes?: string; status?: string; source?: string; last_call?: string; created_at?: string }
type Message = { role?: string; type?: string; content?: string; timestamp?: string; time_sec?: number }
type Call = { _id: string; messages?: { role?: string; text?: string; at?: string }[]; call_date?: string; duration?: number; status?: string; direction?: string; call_summary?: string; summary?: string; sentiment?: string; transcription?: Message[]; ai_responses?: Message[]; transcript_with_tool_calls?: Message[]; human_callback_requested?: boolean; transfer_requested?: boolean; recording_url?: string; public_log_url?: string }

const statuses = ['new', 'called', 'contacted', 'qualified', 'hot', 'converted', 'lost', 'unqualified']
const durationLabel = (seconds?: number) => { const value = Math.max(0, Math.round(Number(seconds) || 0)); return `${Math.floor(value / 60)}m ${String(value % 60).padStart(2, '0')}s` }
const dateLabel = (value?: string) => value ? new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not available'

/** The call in speaking order (components/transcript.ts). */
const callMessages = (call: Call): Message[] => orderedTranscript(call)

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const [lead, setLead] = useState<Lead>({})
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [leadResponse, callsResponse] = await Promise.all([
        authFetch(`${API_BASE}/api/leads/${id}`).then(async (response) => ({ ok: response.ok, payload: await response.json() })),
        authFetch(`${API_BASE}/api/calls?lead_id=${id}&limit=100`).then(async (response) => ({ ok: response.ok, payload: await response.json() })),
      ])
      if (!leadResponse.ok || !leadResponse.payload.success) throw new Error(leadResponse.payload.error || 'Lead not found')
      if (!callsResponse.ok || !callsResponse.payload.success) throw new Error(callsResponse.payload.error || 'Unable to load call history')
      setLead(leadResponse.payload.data)
      setCalls(callsResponse.payload.data || [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load this lead')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])
  // The caller's inbox conversation (none until they have called in).
  const [conversationLink, setConversationLink] = useState('')
  useEffect(() => { authFetch(`${API_BASE}/api/inbox/lead/${id}`).then(async (response) => { const payload = await response.json(); setConversationLink(response.ok ? payload.data?.link || '' : '') }).catch(() => setConversationLink('')) }, [id])
  const messages = useMemo(() => calls.flatMap((call) => callMessages(call).map((message, index) => ({ ...message, call, key: `${call._id}-${index}` }))), [calls])
  const [smsBody, setSmsBody] = useState('')
  const [sendingSms, setSendingSms] = useState(false)

  const updateStatus = async (status: string) => {
    if (status === lead.status || updating) return
    setUpdating(true)
    try {
      const response = await authFetch(`${API_BASE}/api/leads/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Status update failed')
      setLead(payload.data)
      toast.success(`Lead moved to ${status}`)
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : 'Status update failed') } finally { setUpdating(false) }
  }

  const sendSms = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!smsBody.trim() || sendingSms) return
    setSendingSms(true)
    try {
      const response = await authFetch(`${API_BASE}/api/leads/${id}/sms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: smsBody.trim() }) })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || payload.detail?.error || 'SMS could not be sent')
      setSmsBody('')
      toast.success('SMS sent to this lead')
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : 'SMS could not be sent') } finally { setSendingSms(false) }
  }

  return <div className="space-y-7">
    <PageHeader title={lead.name || 'Lead detail'} description="Every inbound call, AI conversation, follow-up request, and pipeline decision in one place." />
    {conversationLink && <Link href={conversationLink} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#D8C8FF] bg-white px-3.5 text-sm font-semibold text-[#5A2BE6] transition hover:border-[#6C3BFF]">Open conversation in Inbox <ArrowUpRight className="h-4 w-4" /></Link>}
    <DataState loading={loading} error={error} onRetry={load}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="surface-panel rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-900">{lead.name || 'Unnamed lead'}</h2><StatusBadge value={lead.status || 'new'} /></div>
            <dl className="mt-5 space-y-3 text-sm"><Detail label="Phone" value={lead.phone || 'Not captured'} /><Detail label="Email" value={lead.email || 'Not captured'} /><Detail label="Company" value={lead.company || 'Not captured'} /><Detail label="Source" value={lead.source || 'Manual'} /><Detail label="Last activity" value={dateLabel(lead.last_call || lead.created_at)} /></dl>
            {lead.notes && <div className="mt-5 border-t border-white/10 pt-4"><div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Notes</div><p className="mt-2 text-sm leading-6 text-slate-200">{lead.notes}</p></div>}
          </section>
          <section className="surface-panel rounded-2xl p-5"><h2 className="font-semibold text-slate-900">Pipeline status</h2><p className="mt-1 text-sm text-slate-400">Update this after reviewing the conversation.</p><div className="mt-4 flex flex-wrap gap-2">{statuses.map((status) => <button key={status} type="button" disabled={updating} onClick={() => updateStatus(status)} className={`rounded-lg px-3 py-2 text-xs font-medium capitalize transition ${lead.status === status ? 'bg-[#6C3BFF] text-slate-950' : 'bg-white/[.05] text-slate-300 hover:bg-white/[.1]'} disabled:cursor-wait disabled:opacity-60`}>{status}</button>)}</div></section>
          <ActionButton primary icon={<PhoneCall className="h-4 w-4" />}>Start follow-up call</ActionButton>
          <section className="surface-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><MessageSquare className="h-4 w-4 text-[#6C3BFF]" />Text this lead</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">Sent only to {lead.phone || 'the lead phone number'} from the configured business SMS number.</p>
            <form onSubmit={sendSms} className="mt-3 space-y-2">
              <textarea value={smsBody} onChange={(event) => setSmsBody(event.target.value)} maxLength={1600} rows={4} placeholder="Write a follow-up message…" className="w-full resize-y rounded-xl border border-[#E9DFFF] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#E9DFFF]" />
              <div className="flex items-center justify-between gap-2"><span className="text-[11px] text-slate-400">{smsBody.length}/1600 characters</span><button type="submit" disabled={!smsBody.trim() || sendingSms || !lead.phone} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#6C3BFF] px-3.5 text-xs font-bold text-white transition hover:bg-[#5A2BE6] disabled:cursor-not-allowed disabled:opacity-50">{sendingSms ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}Send SMS</button></div>
            </form>
          </section>
        </aside>

        <main className="min-w-0 space-y-6">
          <section className="surface-panel rounded-2xl p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold text-slate-900">Conversation timeline</h2><p className="mt-1 text-sm text-slate-400">{calls.length} call{calls.length === 1 ? '' : 's'} · {messages.length} captured messages</p></div>{calls.some((call) => call.human_callback_requested || call.transfer_requested) && <div className="inline-flex items-center gap-2 rounded-lg bg-purple-400/10 px-3 py-2 text-sm font-medium text-purple-600"><ClipboardCheck className="h-4 w-4" />Human follow-up requested</div>}</div></section>
          {calls.length === 0 ? <section className="surface-panel rounded-2xl p-10 text-center"><FileText className="mx-auto h-7 w-7 text-slate-500" /><h2 className="mt-3 font-semibold text-slate-900">No conversation yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">Calls, transcripts, and Retell analysis will appear automatically as soon as this lead contacts the business.</p></section> : calls.map((call) => <section key={call._id} className="surface-panel overflow-hidden rounded-2xl"><div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><PhoneCall className="h-4 w-4 text-[#6C3BFF]" /><h2 className="font-semibold text-slate-900">{call.direction || 'Inbound'} call</h2><StatusBadge value={call.status || 'completed'} /></div><p className="mt-1 text-sm text-slate-400">{dateLabel(call.call_date)} · {durationLabel(call.duration)} · {call.sentiment || 'Neutral'} sentiment</p></div><Link href={`/voice/calls/${call._id}`} className="inline-flex items-center gap-1 text-sm font-medium text-[#6C3BFF] hover:underline">Full call detail <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
            <div className="px-5 py-4"><p className="text-sm leading-6 text-slate-600">{call.call_summary || call.summary || 'No post-call summary is available yet.'}</p><div className="mt-5 space-y-3">{callMessages(call).map((message, index) => { const caller = message.role === 'user' || message.type === 'user'; return <article key={`${call._id}-${index}`} className={`rounded-xl px-4 py-3 ${caller ? 'border border-[#E9DFFF] bg-white' : 'bg-[#F1EBFF]'}`}><div className="flex items-center justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500"><span className="inline-flex items-center gap-1.5">{caller ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}{caller ? 'Caller' : 'AI agent'}</span>{message.timestamp && <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}</div><p className="mt-2 text-sm leading-6 text-slate-100">{message.content}</p></article> })}</div></div></section>)}</main>
      </div>
    </DataState>
  </div>
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">{label}</dt><dd className="max-w-[62%] break-words text-right text-slate-200">{value}</dd></div> }
