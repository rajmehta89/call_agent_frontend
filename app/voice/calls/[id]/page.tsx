'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Copy, Download, FileText, Headphones, PhoneCall, UserRoundCheck } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { ActionButton, API_BASE, DataState, StatusBadge } from '@/components/PlatformUI'

type Message = { content?: string; timestamp?: string; type?: string }
type Call = {
  _id?: string; phone_number?: string; direction?: string; status?: string; duration?: number
  provider?: string; channel_type?: string; agent_name?: string; agent_version?: string
  recording_url?: string; recording_multi_channel_url?: string; public_log_url?: string
  transcription?: Message[]; ai_responses?: Message[]; summary?: string; call_summary?: string
  sentiment?: string; call_successful?: boolean; human_callback_requested?: boolean
  transfer_requested?: boolean; transfer_status?: string; disconnection_reason?: string
  call_cost?: { combined_cost?: number }; latency?: Record<string, unknown>; end_to_end_latency_ms?: number
  custom_analysis_data?: Record<string, unknown>; in_voicemail?: boolean; started_at?: string
  provider_started_at?: string; provider_ended_at?: string
}

const durationLabel = (seconds?: number) => {
  const total = Math.max(0, Math.round(Number(seconds) || 0))
  return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, '0')}s`
}

const dateLabel = (value?: string) => value
  ? new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Not available'

const printable = (value: unknown) => typeof value === 'object' ? JSON.stringify(value) : String(value)

export default function CallDetail() {
  const { id } = useParams<{ id: string }>()
  const [call, setCall] = useState<Call>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    fetch(`${API_BASE}/api/calls/${id}`)
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok || !payload.success) throw new Error(payload.error || 'Call not found')
        setCall(payload.data)
      })
      .catch((reason) => setError(reason.message || 'Unable to load this call'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const transcript = useMemo(() => [...(call.transcription || []), ...(call.ai_responses || [])]
    .sort((left, right) => new Date(left.timestamp || 0).getTime() - new Date(right.timestamp || 0).getTime()), [call])
  const humanRequested = Boolean(call.human_callback_requested || call.transfer_requested)
  const cost = Number(call.call_cost?.combined_cost)
  const responseLatency = Number(call.end_to_end_latency_ms)
  const audioUrl = call.recording_url || call.recording_multi_channel_url
  const customFields = Object.entries(call.custom_analysis_data || {})

  return <div className="space-y-7">
    <PageHeader
      title="Call detail"
      description="Transcript, recording, post-call analysis, and follow-up signals from Retell."
    />
    <DataState loading={loading} error={error} onRetry={load}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-6">
          <section className="surface-panel rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-white">{call.phone_number || 'Web caller'}</h2>
                  <StatusBadge value={call.status || 'unknown'} />
                  {humanRequested && <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-200"><UserRoundCheck className="h-3.5 w-3.5" />Human follow-up</span>}
                </div>
                <p className="mt-2 text-sm text-slate-400">{call.channel_type === 'web_call' ? 'Retell web call' : `${call.direction || 'inbound'} call`} · {dateLabel(call.provider_started_at || call.started_at)}</p>
              </div>
              {call.public_log_url && <a className="text-sm font-medium text-[#8ce5dc] underline-offset-4 hover:underline" href={call.public_log_url} target="_blank" rel="noreferrer">Open Retell log</a>}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Fact label="Duration" value={durationLabel(call.duration)} />
              <Fact label="Provider" value={call.provider || 'Internal'} />
              <Fact label="Call cost" value={Number.isFinite(cost) ? `$${(cost / 100).toFixed(3)}` : 'Not reported'} />
              <Fact label="AI latency" value={Number.isFinite(responseLatency) && responseLatency > 0 ? `${Math.round(responseLatency)} ms` : 'Not reported'} />
            </div>
          </section>

          <section className="surface-panel rounded-2xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">Full transcript</h2>
                <p className="mt-1 text-sm text-slate-400">Captured from Retell after the call ends.</p>
              </div>
              <div className="flex gap-2">
                <ActionButton onClick={() => navigator.clipboard.writeText(transcript.map((item) => `${item.type === 'user' ? 'Caller' : 'Agent'}: ${item.content || ''}`).join('\n'))} icon={<Copy className="h-3.5 w-3.5" />}>Copy</ActionButton>
                <ActionButton onClick={() => {
                  const blob = new Blob([transcript.map((item) => `${item.type === 'user' ? 'Caller' : 'Agent'}: ${item.content || ''}`).join('\n')], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `call-${id}-transcript.txt`; link.click(); URL.revokeObjectURL(url)
                }} icon={<Download className="h-3.5 w-3.5" />}>Export</ActionButton>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {transcript.length ? transcript.map((item, index) => {
                const caller = item.type === 'user'
                return <article key={`${item.timestamp}-${index}`} className={`rounded-2xl p-4 ${caller ? 'bg-white/[.045]' : 'bg-[#68d2c8]/[.08]'}`}>
                  <div className="flex items-center justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500"><span>{caller ? 'Caller' : 'AI agent'}</span><span>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span></div>
                  <p className="mt-2 text-sm leading-6 text-slate-100">{item.content}</p>
                </article>
              }) : <div className="rounded-2xl bg-white/[.035] px-5 py-10 text-center text-sm text-slate-400">No transcript has arrived yet. Retell sends the final transcript after the call has ended.</div>}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="surface-panel rounded-2xl p-5">
            <h2 className="font-semibold text-white">Call intelligence</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Metric label="Outcome" value={call.call_successful === true ? 'Successful' : call.call_successful === false ? 'Unsuccessful' : call.status || 'Pending'} />
              <Metric label="Sentiment" value={call.sentiment || 'Not analysed'} />
              <Metric label="End reason" value={call.disconnection_reason || 'Not reported'} />
              <Metric label="Voicemail" value={call.in_voicemail ? 'Yes' : 'No'} />
              <Metric label="Follow-up" value={humanRequested ? 'Human callback requested' : 'Not requested'} />
            </dl>
            <div className="mt-5 border-t border-white/10 pt-4"><div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Summary</div><p className="mt-2 text-sm leading-6 text-slate-200">{call.summary || call.call_summary || 'Retell has not completed post-call analysis yet.'}</p></div>
          </section>

          {customFields.length > 0 && <section className="surface-panel rounded-2xl p-5"><div className="flex items-center gap-2 font-semibold text-white"><FileText className="h-4 w-4 text-[#8ce5dc]" />Extracted details</div><dl className="mt-4 space-y-3 text-sm">{customFields.map(([key, value]) => <Metric key={key} label={key.replace(/_/g, ' ')} value={printable(value)} />)}</dl></section>}

          <section className="surface-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 font-semibold text-white"><Headphones className="h-4 w-4 text-[#8ce5dc]" />Recording</div>
            {audioUrl ? <><audio className="mt-4 w-full" controls src={audioUrl}>Your browser does not support call recordings.</audio><a href={audioUrl} className="mt-3 inline-flex text-sm font-medium text-[#8ce5dc] hover:underline" target="_blank" rel="noreferrer">Download recording</a></> : <p className="mt-3 text-sm leading-6 text-slate-400">No recording URL was supplied for this call.</p>}
          </section>
          <ActionButton primary icon={<PhoneCall className="h-4 w-4" />}>Start follow-up call</ActionButton>
        </aside>
      </div>
    </DataState>
  </div>
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/[.04] px-3 py-3"><div className="text-[11px] uppercase tracking-[0.1em] text-slate-500">{label}</div><div className="mt-1 truncate text-sm font-medium text-slate-100" title={value}>{value}</div></div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4"><dt className="capitalize text-slate-500">{label}</dt><dd className="max-w-[56%] break-words text-right text-slate-200">{value}</dd></div>
}
