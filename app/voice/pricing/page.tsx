'use client'

import { useEffect, useState } from 'react'
import { AudioLines, ChevronDown, Zap } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { api } from '@/components/PlatformUI'

// US list prices, checked October 2026.
const TWILIO_NUMBER_MONTHLY = { local: 1.15, tollfree: 2.15 }
const TWILIO_INBOUND = { local: 0.0085, tollfree: 0.022 }
const AI_MODEL = 0.002 // gpt-oss-20b on OpenRouter: ~3 replies a minute at ~7.5K tokens each
const ELEVENLABS_PER_MIN = 0.0165 // Flash $0.05 / 1K chars; the agent speaks ~330 characters per call minute

type NumberType = keyof typeof TWILIO_INBOUND
type Line = { vendor: string; label: string; perMinute: number }
type Option = { id: 'custom' | 'retell'; name: string; summary: string; icon: typeof Zap; lines: Line[] }

const options = (number: NumberType): Option[] => [
  {
    id: 'custom', name: 'Custom voice stack', icon: AudioLines,
    summary: 'Deepgram listens, your AI Brain replies, ElevenLabs speaks.',
    lines: [
      { vendor: 'Twilio', label: 'Incoming call', perMinute: TWILIO_INBOUND[number] },
      { vendor: 'Twilio', label: 'Media Streams (audio to your server)', perMinute: 0.0044 },
      { vendor: 'Deepgram', label: 'Nova-3 speech to text', perMinute: 0.0077 },
      { vendor: 'ElevenLabs', label: 'Flash text to speech (~330 characters/min)', perMinute: ELEVENLABS_PER_MIN },
      { vendor: 'OpenRouter', label: 'AI model', perMinute: AI_MODEL },
    ],
  },
  {
    id: 'retell', name: 'Retell AI', icon: Zap,
    summary: 'Your Twilio number passes the call to Retell; your AI Brain writes the replies.',
    lines: [
      { vendor: 'Retell', label: 'Voice engine', perMinute: 0.055 },
      { vendor: 'Retell', label: 'Retell voice (ElevenLabs voices cost $0.040)', perMinute: 0.015 },
      { vendor: 'Twilio', label: 'Incoming call', perMinute: TWILIO_INBOUND[number] },
      { vendor: 'Twilio', label: 'SIP connection to Retell', perMinute: 0.004 },
      { vendor: 'OpenRouter', label: 'AI model (Retell charges no LLM fee for your own model)', perMinute: AI_MODEL },
    ],
  },
]

const usd = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: value < 100 ? 2 : 0 }).format(value)
// Show per-minute rates exactly ($0.0085, not a rounded $0.009), trimming trailing zeros but keeping two decimals.
const rate = (value: number) => `$${value.toFixed(4).replace(/(\.\d\d\d*?)0+$/, '$1')}`

function byVendor(lines: Line[]) {
  const totals = new Map<string, number>()
  lines.forEach((line) => totals.set(line.vendor, (totals.get(line.vendor) || 0) + line.perMinute))
  return Array.from(totals, ([vendor, perMinute]) => ({ vendor, perMinute }))
}

export default function VoicePricingPage() {
  const [callsPerDay, setCallsPerDay] = useState(40)
  const [minutesPerCall, setMinutesPerCall] = useState(3)
  const [number, setNumber] = useState<NumberType>('local')
  const [inUse, setInUse] = useState<Option['id'] | null>(null)

  useEffect(() => {
    api<{ data: { providers: { id: 'retell' | 'custom'; enabled: boolean; ready: boolean }[] } }>('/api/voice-providers')
      .then((result) => setInUse(result.data.providers.find((item) => item.enabled && item.ready)?.id || null))
      .catch(() => setInUse(null))
  }, [])

  const minutes = Math.max(0, callsPerDay) * Math.max(0, minutesPerCall) * 30
  const rows = options(number).map((option) => {
    const perMinute = option.lines.reduce((sum, line) => sum + line.perMinute, 0)
    return { ...option, perMinute, vendors: byVendor(option.lines), monthly: minutes * perMinute + TWILIO_NUMBER_MONTHLY[number] }
  })
  const cheapest = rows.reduce((best, row) => (row.monthly < best.monthly ? row : best), rows[0])

  return <div className="space-y-4">
    <PageHeader title="Voice cost planner" description="Estimate your monthly cost for each voice option. US prices, before tax." />

    <section className="surface-panel grid gap-4 rounded-2xl p-4 sm:grid-cols-3 sm:p-5">
      <label className="block"><span className="field-label">Calls per day</span><input type="number" min="0" inputMode="numeric" value={callsPerDay} onChange={(event) => setCallsPerDay(Number(event.target.value))} /></label>
      <label className="block"><span className="field-label">Average call length (minutes)</span><input type="number" min="0" step="0.5" inputMode="decimal" value={minutesPerCall} onChange={(event) => setMinutesPerCall(Number(event.target.value))} /></label>
      <div><span className="field-label">Phone number</span>
        <div role="radiogroup" className="flex h-[42px] gap-1 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
          {(['local', 'tollfree'] as NumberType[]).map((type) => <button key={type} type="button" role="radio" aria-checked={number === type} onClick={() => setNumber(type)} className={`flex-1 rounded-md transition ${number === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{type === 'local' ? 'Local' : 'Toll-free'}</button>)}
        </div>
      </div>
      <p className="text-xs text-slate-500 sm:col-span-3">{minutes.toLocaleString()} call minutes a month (30 days).</p>
    </section>

    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((row) => {
        const Icon = row.icon
        const best = row.id === cheapest.id && minutes > 0
        return <article key={row.id} className={`surface-panel flex flex-col rounded-2xl p-4 sm:p-5 ${best ? 'ring-2 ring-purple-500' : ''}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon className="h-[18px] w-[18px]" /></span>
            <h2 className="text-[15px] font-bold leading-5 text-slate-950">{row.name}</h2>
          </div>
          <div className="mt-2 flex min-h-[22px] flex-wrap gap-1.5">
            {best && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-200">Lowest cost</span>}
            {inUse === row.id && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-200">In use now</span>}
          </div>
          <div className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-slate-950">{usd(row.monthly)}<span className="ml-1 text-sm font-semibold text-slate-500">/month</span></div>
          <div className="mt-1 text-sm text-slate-600">{rate(row.perMinute)} per call minute in total</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {row.vendors.map((item) => <span key={item.vendor} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"><span className="font-semibold">{item.vendor}</span> {rate(item.perMinute)}/min</span>)}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{row.summary}</p>
          <details className="group mt-auto pt-4">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900">What’s included <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" /></summary>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
              {row.lines.map((line) => <li key={`${line.vendor}-${line.label}`} className="flex justify-between gap-3"><span><span className="font-semibold text-slate-700">{line.vendor}</span> · {line.label}</span><span className="shrink-0 tabular-nums">{rate(line.perMinute)}/min</span></li>)}
              <li className="flex justify-between gap-3 border-t border-slate-200 pt-1.5"><span><span className="font-semibold text-slate-700">Twilio</span> · Phone number</span><span className="shrink-0 tabular-nums">{usd(TWILIO_NUMBER_MONTHLY[number])}/month</span></li>
            </ul>
          </details>
        </article>
      })}
    </div>

    <p className="px-1 text-xs leading-5 text-slate-500">
      Estimates from list prices checked October 2026; confirm before quoting a client:{' '}
      <a className="underline hover:text-slate-800" href="https://www.twilio.com/en-us/voice/pricing/us" target="_blank" rel="noreferrer">Twilio</a>,{' '}
      <a className="underline hover:text-slate-800" href="https://deepgram.com/pricing" target="_blank" rel="noreferrer">Deepgram</a>,{' '}
      <a className="underline hover:text-slate-800" href="https://elevenlabs.io/pricing/api" target="_blank" rel="noreferrer">ElevenLabs</a>,{' '}
      <a className="underline hover:text-slate-800" href="https://www.retellai.com/pricing" target="_blank" rel="noreferrer">Retell</a>,{' '}
      <a className="underline hover:text-slate-800" href="https://openrouter.ai/openai/gpt-oss-20b" target="_blank" rel="noreferrer">OpenRouter</a>.
      Not included: tax, call recording ($0.0025/min), and Retell’s extra concurrency beyond 20 calls.
    </p>
  </div>
}
