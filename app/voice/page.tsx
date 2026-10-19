'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowUpRight, Clock3, PhoneIncoming, Settings2, Headphones } from 'lucide-react'
import { apiWithRetry, DataState, MetricGrid, StatusBadge, Toolbar, userFacingError } from '@/components/PlatformUI'

type VoiceCall = {
  _id: string
  phone_number?: string
  lead?: { name?: string }
  call_date?: string
  status?: string
  duration?: number
}

export default function VoiceOverview() {
  const [stats, setStats] = useState<any>({})
  const [twilio, setTwilio] = useState<any>({})
  const [calls, setCalls] = useState<VoiceCall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const [statsResult, twilioResult, callsResult] = await Promise.allSettled([
        apiWithRetry<any>('/api/calls/stats', undefined, 1, 8000),
        apiWithRetry<any>('/api/twilio/config', undefined, 1, 8000),
        apiWithRetry<any>('/api/calls?direction=inbound&limit=8', undefined, 1, 8000),
      ])
      if (statsResult.status === 'fulfilled') setStats(statsResult.value.data || {})
      if (twilioResult.status === 'fulfilled') setTwilio(twilioResult.value.data || {})
      if (callsResult.status === 'fulfilled') setCalls(callsResult.value.data || [])

      const failed = [statsResult, twilioResult, callsResult].filter((result) => result.status === 'rejected')
      if (failed.length === 3) {
        const firstFailure = failed[0] as PromiseRejectedResult
        setError(userFacingError(firstFailure.reason, 'Voice data is temporarily unavailable. Please try again.'))
      } else if (failed.length) {
        setNotice('Some voice information is temporarily unavailable. Recent calls and available settings are still shown.')
      }
    } catch (exception) {
      setError(userFacingError(exception, 'Unable to load inbound calls. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return <div className="space-y-6">
    <Toolbar>
      <Link href="/voice/agent" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"><Settings2 className="h-4 w-4" />Agent settings</Link>
      <Link href="/voice/browser-test" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"><Headphones className="h-4 w-4" />Browser test</Link>
    </Toolbar>
    {notice && <div role="status" className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm leading-5 text-purple-900">{notice}</div>}
    <DataState loading={loading} error={error} onRetry={load}>
      <MetricGrid items={[
        { label: 'Inbound calls', value: stats.inbound_calls || 0 },
        { label: 'Today', value: stats.calls_today || 0 },
        { label: 'Completed', value: stats.status_counts?.completed || 0 },
        { label: 'Average duration', value: `${Math.floor((stats.average_duration || 0) / 60)}:${String(Math.floor((stats.average_duration || 0) % 60)).padStart(2, '0')}` },
      ]} />
      <section className="surface-panel mt-5 overflow-hidden rounded-[22px]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div><h2 className="text-sm font-bold text-slate-900">Twilio inbound status</h2><p className="mt-1 text-xs text-slate-500">Incoming webhook: {twilio.inbound_webhook || 'Configure Twilio credentials'}</p></div>
          <StatusBadge value={twilio.conversation_relay_ready ? 'Ready' : 'Needs setup'} />
        </div>
        <div className="divide-y divide-slate-100">
          {calls.map((call) => <Link key={call._id} href={`/voice/calls/${call._id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-slate-50">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f5edff] text-[#5909b4]"><PhoneIncoming className="h-4 w-4" /></span><div><div className="text-sm font-semibold text-slate-800">{call.lead?.name || call.phone_number || 'Unknown caller'}</div><div className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3 w-3" />{call.call_date ? new Date(call.call_date).toLocaleString() : 'Date unavailable'} · {Math.floor((call.duration || 0) / 60)}:{String(Math.floor((call.duration || 0) % 60)).padStart(2, '0')}</div></div></div>
            <span className="flex items-center gap-2"><StatusBadge value={call.status || 'unknown'} /><ArrowUpRight className="h-4 w-4 text-slate-400" /></span>
          </Link>)}
          {!calls.length && <p className="px-5 py-12 text-center text-sm text-slate-500">Inbound calls will appear here after the first conversation.</p>}
        </div>
      </section>
    </DataState>
  </div>
}
