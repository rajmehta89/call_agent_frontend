'use client'

import { useEffect, useState } from 'react'
import { AudioLines, ChevronDown, PhoneForwarded, Zap } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { api } from '@/components/PlatformUI'

// US list prices, checked October 2026.
const TWILIO_NUMBER_MONTHLY = { local: 1.15, tollfree: 2.15 }
const TWILIO_INBOUND = { local: 0.0085, tollfree: 0.022 }
// DeepSeek V4.1 Flash answers every turn on Together ($0.30 / $1.20 per million tokens in / out, OpenRouter, October
// 2026): ~3 replies a minute at ~3.5K prompt tokens and ~60 spoken tokens each, plus ~10% for replies started early and
// dropped when the caller keeps talking. Llama 3.1 8B words the waiting lines and Hindi/Urdu turns get a short
// translation (both well under $0.0001/min). Gemini 3.1 Flash-Lite is only the backup when DeepSeek fails.
const AI_TOKENS_IN_PER_MIN = 3 * 3500 * 1.1
const AI_TOKENS_OUT_PER_MIN = 3 * 60 * 1.1
const AI_MODEL = (AI_TOKENS_IN_PER_MIN * 0.30 + AI_TOKENS_OUT_PER_MIN * 1.20) / 1_000_000 + 0.0001
// After each call one gpt-4.1-mini request writes the summary and files the conversation status (~2K tokens).
const AI_SUMMARY_PER_CALL = 0.001
// Deepgram Flux (speech to text with turn detection), streaming pay-as-you-go. Promotional rate; normally $0.0077.
const FLUX_PER_MIN = 0.0065
const ELEVENLABS_PER_MIN = 0.0165 // Flash $0.05 / 1K chars; the agent speaks ~330 characters per call minute
const AURA_PER_MIN = 0.0099 // Aura-2 $0.030 / 1K chars at the same ~330 characters per call minute
// Call forwarding: Twilio's outgoing rate from your number to the agent's phone, read from this Twilio account's pricing
// on 23 October 2026 (Programmable Outbound Minute). The caller's incoming leg is still billed while they talk to the agent;
// the AI costs stop once the call leaves the AI.
const AGENT_PHONES = {
  au_mobile: { label: 'Australian mobile', perMinute: 0.075 },
  au_landline: { label: 'Australian landline', perMinute: 0.0252 },
  in_mobile: { label: 'Indian mobile', perMinute: 0.0496 },
  in_landline: { label: 'Indian landline', perMinute: 0.0699 },
  us: { label: 'US / Canada', perMinute: 0.014 },
}
type AgentPhone = keyof typeof AGENT_PHONES

type NumberType = keyof typeof TWILIO_INBOUND
type Line = { vendor: string; label: string; perMinute: number }
type ProviderId = 'custom' | 'custom_deepgram' | 'retell'
type Option = { id: ProviderId; name: string; summary: string; icon: typeof Zap; lines: Line[] }

// The per-call summary, spread over the call's minutes so every line is a per-minute rate.
const summaryLine = (minutesPerCall: number): Line => (
  { vendor: 'OpenRouter', label: `AI call summary and status (${rate(AI_SUMMARY_PER_CALL)} per call)`, perMinute: AI_SUMMARY_PER_CALL / Math.max(minutesPerCall, 0.5) })

// Shared by both custom stacks: the phone line, the audio stream to this server, speech to text and the AI models.
const customLines = (number: NumberType, minutesPerCall: number): Line[] => [
  { vendor: 'Twilio', label: 'Incoming call', perMinute: TWILIO_INBOUND[number] },
  { vendor: 'Twilio', label: 'Media Streams (audio to your server)', perMinute: 0.0044 },
  { vendor: 'Deepgram', label: 'Flux speech to text with turn detection (promotional rate)', perMinute: FLUX_PER_MIN },
  { vendor: 'OpenRouter', label: 'AI models (DeepSeek V4.1 Flash + Llama 3.1 8B waiting lines, incl. early starts)', perMinute: AI_MODEL },
  summaryLine(minutesPerCall),
]

const options = (number: NumberType, minutesPerCall: number): Option[] => [
  {
    id: 'custom', name: 'Custom voice stack (ElevenLabs voice)', icon: AudioLines,
    summary: 'Deepgram Flux listens, your AI Brain replies, ElevenLabs speaks.',
    lines: [...customLines(number, minutesPerCall), { vendor: 'ElevenLabs', label: 'Flash text to speech (~330 characters/min)', perMinute: ELEVENLABS_PER_MIN }],
  },
  {
    id: 'custom_deepgram', name: 'Custom voice stack (Deepgram voice)', icon: AudioLines,
    summary: 'Deepgram Flux listens, your AI Brain replies, Deepgram Aura-2 speaks.',
    lines: [...customLines(number, minutesPerCall), { vendor: 'Deepgram', label: 'Aura-2 text to speech (~330 characters/min)', perMinute: AURA_PER_MIN }],
  },
  {
    id: 'retell', name: 'Retell AI', icon: Zap,
    summary: 'Your Twilio number passes the call to Retell; your AI Brain writes the replies.',
    lines: [
      { vendor: 'Retell', label: 'Voice engine', perMinute: 0.055 },
      { vendor: 'Retell', label: 'Retell voice (ElevenLabs voices cost $0.040)', perMinute: 0.015 },
      { vendor: 'Twilio', label: 'Incoming call', perMinute: TWILIO_INBOUND[number] },
      { vendor: 'Twilio', label: 'SIP connection to Retell', perMinute: 0.004 },
      { vendor: 'OpenRouter', label: 'AI models (Retell charges no LLM fee for your own model)', perMinute: AI_MODEL },
      summaryLine(minutesPerCall),
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
  // Call forwarding: every call starts with the AI; this share then goes to a person, who talks agentMinutes.
  const [forwardPercent, setForwardPercent] = useState(0)
  const [agentMinutes, setAgentMinutes] = useState(5)
  const [agentPhone, setAgentPhone] = useState<AgentPhone>('au_mobile')

  useEffect(() => {
    api<{ data: { providers: { id: ProviderId; enabled: boolean; ready: boolean }[] } }>('/api/voice-providers')
      .then((result) => setInUse(result.data.providers.find((item) => item.enabled && item.ready)?.id || null))
      .catch(() => setInUse(null))
  }, [])

  const callsPerMonth = Math.max(0, callsPerDay) * 30
  const share = Math.min(100, Math.max(0, forwardPercent)) / 100
  const forwardedCalls = callsPerMonth * share
  // Every call has the AI's minutes; forwarded calls add the agent's minutes on top.
  const aiMinutes = callsPerMonth * Math.max(0, minutesPerCall)
  const agentMinutesMonthly = forwardedCalls * Math.max(0, agentMinutes)
  const minutes = aiMinutes + agentMinutesMonthly
  const agentPerMinute = TWILIO_INBOUND[number] + AGENT_PHONES[agentPhone].perMinute
  const agentMonthly = agentMinutesMonthly * agentPerMinute
  const rows = options(number, minutesPerCall).map((option) => {
    const perMinute = option.lines.reduce((sum, line) => sum + line.perMinute, 0)
    const aiMonthly = aiMinutes * perMinute
    return { ...option, perMinute, aiMonthly, vendors: byVendor(option.lines), monthly: aiMonthly + agentMonthly + TWILIO_NUMBER_MONTHLY[number],
             oneAi: Math.max(0, minutesPerCall) * perMinute, oneAgent: Math.max(0, agentMinutes) * agentPerMinute }
  })
  const inUseRow = rows.find((row) => row.id === inUse) || rows[0]
  const cheapest = rows.reduce((best, row) => (row.monthly < best.monthly ? row : best), rows[0])

  return <div className="space-y-4">
    <PageHeader title="Voice cost planner" description="Estimate your monthly cost for each voice option. US prices, before tax." />

    {/* One set of inputs: every call starts with the AI; some calls then go to a person. */}
    <section className="surface-panel rounded-2xl p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block"><span className="field-label">Calls per day</span><input type="number" min="0" inputMode="numeric" value={callsPerDay} onChange={(event) => setCallsPerDay(Number(event.target.value))} /></label>
        <label className="block"><span className="field-label">AI talk minutes per call</span><input type="number" min="0" step="0.5" inputMode="decimal" value={minutesPerCall} onChange={(event) => setMinutesPerCall(Number(event.target.value))} /></label>
        <div><span className="field-label">Phone number</span>
          <div role="radiogroup" className="flex h-[42px] gap-1 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
            {(['local', 'tollfree'] as NumberType[]).map((type) => <button key={type} type="button" role="radio" aria-checked={number === type} onClick={() => setNumber(type)} className={`flex-1 rounded-md transition ${number === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{type === 'local' ? 'Local' : 'Toll-free'}</button>)}
          </div>
        </div>
      </div>
      <div className="mt-4 border-t border-[#F1EBFF] pt-4">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-slate-900"><PhoneForwarded className="h-4 w-4 text-[#6C3BFF]" />Call forwarding <span className="font-normal text-slate-500">(when a caller asks for a person)</span></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block"><span className="field-label">Calls forwarded to an agent (%)</span><input type="number" min="0" max="100" step="5" inputMode="numeric" value={forwardPercent} onChange={(event) => setForwardPercent(Number(event.target.value))} /></label>
          <label className="block"><span className="field-label">Agent talk minutes</span><input type="number" min="0" step="0.5" inputMode="decimal" value={agentMinutes} onChange={(event) => setAgentMinutes(Number(event.target.value))} /></label>
          <label className="block"><span className="field-label">Agents&apos; phones</span>
            <select value={agentPhone} onChange={(event) => setAgentPhone(event.target.value as AgentPhone)}>
              {(Object.keys(AGENT_PHONES) as AgentPhone[]).map((key) => <option key={key} value={key}>{AGENT_PHONES[key].label} ({rate(AGENT_PHONES[key].perMinute)}/min)</option>)}
            </select></label>
        </div>
      </div>
      {/* The month in one sentence, and one forwarded call in dollars. */}
      <div className="mt-4 rounded-xl bg-[#FAF8FF] p-3 text-[13px] leading-6 text-slate-700 ring-1 ring-[#EEE8FF]">
        <p><b>{Math.round(callsPerMonth).toLocaleString()} calls a month.</b> The AI talks {minutesPerCall} min on each ({Math.round(aiMinutes).toLocaleString()} min).
          {share > 0 ? <> {Math.round(forwardPercent)}% ({Math.round(forwardedCalls).toLocaleString()} calls) then go to an agent who talks {agentMinutes} min ({Math.round(agentMinutesMonthly).toLocaleString()} min).</> : ' No calls are forwarded.'}</p>
        {share > 0 && <p className="mt-1 tabular-nums">One forwarded call with {inUseRow.name}: AI {usd(inUseRow.oneAi)} + agent {usd(inUseRow.oneAgent)} = <b className="text-slate-950">{usd(inUseRow.oneAi + inUseRow.oneAgent)}</b>
          <span className="block text-xs text-slate-500">Agent minutes cost {rate(agentPerMinute)} each: Twilio incoming {rate(TWILIO_INBOUND[number])} + call to the agent&apos;s {AGENT_PHONES[agentPhone].label} {rate(AGENT_PHONES[agentPhone].perMinute)}.</span></p>}
      </div>
    </section>

    <div className="grid gap-4 lg:grid-cols-3">
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
          <div className="mt-1 text-sm text-slate-600">{rate(row.perMinute)} per AI call minute in total</div>
          {share > 0 && <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <span className="rounded-md bg-slate-100 px-2 py-1.5 text-slate-700"><span className="block font-semibold">AI minutes</span>{usd(row.aiMonthly)}</span>
            <span className="rounded-md bg-[#F1EBFF] px-2 py-1.5 text-[#5A2BE6]"><span className="block font-semibold">Agent minutes</span>{usd(agentMonthly)}</span>
          </div>}
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
      <a className="underline hover:text-slate-800" href="https://openrouter.ai/deepseek/deepseek-v4.1-flash" target="_blank" rel="noreferrer">OpenRouter</a> (DeepSeek V4.1 Flash on Together).
      Agent call rates are this Twilio account&apos;s outbound prices (23 October 2026). Not included: tax, call recording ($0.0025/min),
      Retell’s extra concurrency beyond 20 calls, and the few seconds an agent&apos;s phone is connected while hearing &quot;press 1 to accept&quot;.
    </p>
  </div>
}
