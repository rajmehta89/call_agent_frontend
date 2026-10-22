'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, BrainCircuit, CheckCircle2, AlertCircle, Headphones, Inbox, PhoneCall, PhoneIncoming, PhoneMissed, Radio, Settings2, Timer, Workflow } from 'lucide-react'
import { api, apiWithRetry, DataState, userFacingError } from '@/components/PlatformUI'
import { Avatar, EmptyHint, Panel, PanelLink, Stat, duration, timeAgo } from '@/components/premium'
import { PageHeader } from '@/components/OmniPage'

type VoiceCall = { _id: string; phone_number?: string; lead?: { name?: string }; call_date?: string; status?: string; duration?: number; call_summary?: string; provider?: string }
type Overview = { kpis: { calls_today: number; calls_yesterday: number; calls_7d: number; calls_7d_change: number | null; calls_prev_7d?: number; avg_duration_prev_7d?: number; avg_duration_7d: number; avg_duration_change: number | null; answered_rate_7d: number | null; failed_7d: number; live_now: number }; daily: { calls: number }[]; voice: { active_provider: string; ready: boolean } }

/** Browser-console trace; filter by "[voice]". */
const log = (message: string, ...details: unknown[]) => console.info(`[voice] ${message}`, ...details)
const FAILED = new Set(['failed', 'busy', 'no-answer', 'missed', 'canceled'])
const providerName = (provider?: string) => provider === 'retell' ? 'Retell AI' : provider === 'custom_twilio' ? 'Custom voice AI' : provider === 'twilio' ? 'Twilio' : 'AI agent'

/** Inbound voice: is the line working, how are calls trending, and what did callers just ask. */
export default function VoiceOverview() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [twilio, setTwilio] = useState<any>({})
  const [calls, setCalls] = useState<VoiceCall[]>([])
  const [canEditAgent, setCanEditAgent] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (quiet = false) => {
    if (!quiet) { setLoading(true); setError(''); log('loading') }
    const [overviewResult, twilioResult, callsResult] = await Promise.allSettled([
      api<any>(`/api/overview?tz_offset=${-new Date().getTimezoneOffset()}`),
      apiWithRetry<any>('/api/twilio/config', undefined, 1, 8000),
      apiWithRetry<any>('/api/calls?direction=inbound&limit=8', undefined, 1, 8000),
    ])
    if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value.data)
    if (twilioResult.status === 'fulfilled') setTwilio(twilioResult.value.data || {})
    if (callsResult.status === 'fulfilled') setCalls(callsResult.value.data || [])
    if (!quiet && [overviewResult, twilioResult, callsResult].every((result) => result.status === 'rejected')) setError(userFacingError((overviewResult as PromiseRejectedResult).reason, 'Voice data is temporarily unavailable.'))
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    api<any>('/api/auth/me').then((result) => { const permissions: string[] = result.data?.permissions || []; setCanEditAgent(permissions.includes('*') || permissions.includes('manage_agents')) }).catch(() => {})
    const onChange = (event: Event) => { if ((event as CustomEvent<{ kind?: string }>).detail?.kind === 'call') load(true) }  // new or finished calls
    window.addEventListener('inbox:refresh', onChange)
    return () => window.removeEventListener('inbox:refresh', onChange)
  }, [load])

  const k = overview?.kpis
  const steps = [
    { icon: PhoneIncoming, title: 'Your Twilio number', detail: twilio.voice_number_configured ? 'Receiving calls' : 'Add the number in .env', ok: Boolean(twilio.account_configured && twilio.voice_number_configured) },
    { icon: Workflow, title: overview?.voice.active_provider || 'Voice AI', detail: overview?.voice.ready === false ? 'Missing configuration' : 'Answers and talks to callers', ok: overview ? overview.voice.ready : false, href: '/voice/providers' },
    { icon: BrainCircuit, title: 'AI knowledge', detail: 'Facts the agent may quote', ok: true, href: '/brain/knowledge' },
    { icon: Inbox, title: 'Inbox', detail: 'Transcript, summary, owner', ok: true, href: '/inbox' },
  ]

  return <div className="space-y-6">
    <PageHeader title="Inbound voice" description="Every call your AI agent answers: whether the line is ready, how calls are trending, and what callers asked."
      actions={<>
        {canEditAgent && <Link href="/voice/agent" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E9DFFF] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#6C3BFF]"><Settings2 className="h-4 w-4" />Agent settings</Link>}
        <Link href="/voice/browser-test" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6C3BFF] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_-14px_rgba(150,77,234,.9)] transition hover:bg-[#5A2BE6]"><Headphones className="h-4 w-4" />Test call</Link>
      </>} />
    <DataState loading={loading} error={error} onRetry={() => load()}><div className="space-y-6">
      {k && <div className="keep-cols grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat icon={k.live_now ? Radio : PhoneIncoming} label={k.live_now ? 'Live now' : 'Calls today'} value={k.live_now || k.calls_today} hint={k.live_now ? 'open the inbox to follow along' : `${k.calls_yesterday} yesterday`} tone={k.live_now ? 'live' : 'default'} href={k.live_now ? '/inbox' : '/calls'} spark={overview?.daily.map((day) => day.calls)} />
        <Stat icon={PhoneCall} label="Last 7 days" value={k.calls_7d} hint={k.calls_prev_7d === undefined ? undefined : `${k.calls_prev_7d} the 7 days before`} href="/calls" />
        <Stat icon={Timer} label="Avg call" value={duration(k.avg_duration_7d)} hint={k.avg_duration_prev_7d ? `${duration(k.avg_duration_prev_7d)} the 7 days before` : 'Last 7 days'} />
        <Stat icon={k.failed_7d ? PhoneMissed : CheckCircle2} label="Answered" value={k.answered_rate_7d === null ? '—' : `${k.answered_rate_7d}%`} hint={k.failed_7d ? `${k.failed_7d} missed or failed this week` : 'Nothing missed this week'} href={k.failed_7d ? '/inbox/failed' : undefined} tone={k.failed_7d ? 'alert' : 'default'} />
      </div>}

      <Panel icon={Workflow} title="How your calls are answered" subtitle={steps.every((step) => step.ok) ? 'Everything is ready: calls are being answered.' : 'Something needs attention before calls can be answered.'} action={canEditAgent ? <PanelLink href="/voice/providers">Change provider</PanelLink> : undefined}>
        <ol className="keep-cols grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{steps.map((step, index) => { const Icon = step.icon; const card = <div className={`relative h-full rounded-2xl border p-4 transition ${step.ok ? 'border-[#E9DFFF] bg-gradient-to-br from-white to-[#F8F5FF]' : 'border-[#6C3BFF] bg-[#F1EBFF]'} ${step.href ? 'hover:border-[#D8C8FF]' : ''}`}>
            <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1EBFF] text-[#6C3BFF]"><Icon className="h-5 w-5" /></span>{step.ok ? <CheckCircle2 className="h-5 w-5 text-[#6C3BFF]" /> : <AlertCircle className="h-5 w-5 text-[#6C3BFF]" />}</div>
            <div className="mt-3 text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">Step {index + 1}</div>
            <div className="mt-0.5 text-sm font-bold text-slate-900">{step.title}</div>
            <div className="mt-0.5 text-xs text-slate-500">{step.detail}</div>
            {index < steps.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-white text-[#6C3BFF] xl:block" />}
          </div>; return <li key={step.title}>{step.href ? <Link href={step.href} className="block h-full">{card}</Link> : card}</li> })}</ol>
      </Panel>

      <Panel icon={PhoneCall} title="Recent calls" subtitle="Newest first · click a call for its recording and full transcript" action={<PanelLink href="/calls">Call history</PanelLink>} bodyClassName="divide-y divide-[#F1EBFF]">
        {calls.length ? calls.map((call) => { const failed = FAILED.has(String(call.status)); const live = call.status === 'in_progress'; const name = call.lead?.name || (call.phone_number === 'Web caller' ? 'Web caller' : call.phone_number) || 'Unknown caller'; return <Link key={call._id} href={`/voice/calls/${call._id}`} className="group flex gap-3 px-5 py-4 transition hover:bg-[#F8F5FF]">
          <Avatar name={name} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2"><span className="truncate text-sm font-semibold text-slate-900">{name}</span><span className="text-[11px] text-slate-400">{timeAgo(call.call_date)}{call.duration ? ` · ${duration(call.duration)}` : ''} · {providerName(call.provider)}</span>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${failed ? 'bg-[#6C3BFF] text-white' : live ? 'bg-[#6C3BFF] text-white' : 'bg-[#F1EBFF] text-[#6C3BFF]'}`}>{failed ? 'Missed' : live ? 'In progress' : 'Completed'}</span></div>
            <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-600">{call.call_summary || (failed ? 'The call did not connect.' : live ? 'Call in progress — the summary appears when it ends.' : 'No summary for this call.')}</p>
          </div>
        </Link> }) : <div className="p-5"><EmptyHint text="No calls yet. Make a test call from your browser to see one here." action={<Link href="/voice/browser-test" className="rounded-lg bg-[#6C3BFF] px-3 py-1.5 text-xs font-semibold text-white">Start a test call</Link>} /></div>}
      </Panel>
    </div></DataState>
  </div>
}
