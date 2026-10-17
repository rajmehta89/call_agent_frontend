'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, ArrowDown, AudioLines, CheckCircle2, Loader2, PhoneIncoming, ShieldCheck, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/OmniPage'
import { api, DataState } from '@/components/PlatformUI'

type VoiceProvider = {
  id: 'retell' | 'custom'
  name: string
  description: string
  enabled: boolean
  ready: boolean
  missing_configuration: string[]
  model?: string
  provider?: string
  activation_note: string
}

const providerOrder: VoiceProvider['id'][] = ['custom', 'retell']

function Pill({ tone, children }: { tone: 'on' | 'off' | 'warn' | 'info'; children: ReactNode }) {
  const styles = {
    on: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    off: 'bg-slate-100 text-slate-600 ring-slate-200',
    warn: 'bg-amber-50 text-amber-800 ring-amber-200',
    info: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  }[tone]
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${styles}`}>{children}</span>
}

function Switch({ checked, disabled, busy, label, onChange }: { checked: boolean; disabled?: boolean; busy?: boolean; label: string; onChange: () => void }) {
  return <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    title={label}
    disabled={disabled || busy}
    onClick={onChange}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-emerald-600' : 'bg-slate-300'}`}
  >
    <span className={`pointer-events-none absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}>
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
    </span>
  </button>
}

function ProviderCard({ provider, saving, onToggle }: { provider: VoiceProvider; saving: boolean; onToggle: (provider: VoiceProvider) => void }) {
  const isRetell = provider.id === 'retell'
  const canToggle = provider.enabled || provider.ready

  return <article className="surface-panel rounded-2xl p-4 sm:p-5">
    <div className="flex items-start gap-3 sm:gap-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isRetell ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>
        {isRetell ? <Zap className="h-5 w-5" /> : <AudioLines className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold leading-6 text-slate-950">{provider.name}</h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {provider.enabled ? <Pill tone="on"><CheckCircle2 className="h-3 w-3" />On</Pill> : <Pill tone="off">Off</Pill>}
              {provider.ready ? <Pill tone="on">Configured</Pill> : <Pill tone="warn"><AlertCircle className="h-3 w-3" />Setup needed</Pill>}
            </div>
          </div>
          <Switch
            checked={provider.enabled}
            disabled={!canToggle}
            busy={saving}
            label={`${provider.enabled ? 'Turn off' : 'Turn on'} ${provider.name}`}
            onChange={() => onToggle(provider)}
          />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{provider.description}</p>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-slate-500 sm:grid-cols-[auto_1fr]">
          {provider.model && <><dt className="font-medium">Model</dt><dd className="break-all font-semibold text-slate-700">{provider.model}</dd></>}
          {provider.provider && <><dt className="font-medium">Stack</dt><dd className="font-semibold capitalize text-slate-700">{provider.provider}</dd></>}
        </dl>
        <p className="mt-3 text-xs leading-5 text-slate-500">{provider.activation_note}</p>
        {!provider.ready && <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <span className="font-semibold">Finish setup to turn this on.</span> Missing server settings:
            <div className="mt-1.5 flex flex-wrap gap-1.5">{provider.missing_configuration.map((name) => <code key={name} className="break-all rounded bg-white/70 px-1.5 py-0.5 text-[11px]">{name}</code>)}</div>
          </div>
        </div>}
      </div>
    </div>
  </article>
}

function RoutingStep({ step, title, detail, state }: { step: number; title: string; detail: string; state: 'active' | 'standby' | 'fallback' }) {
  const pill = state === 'active' ? <Pill tone="on">Answering calls</Pill> : state === 'fallback' ? <Pill tone="info">Default · always on</Pill> : <Pill tone="off">Not set</Pill>
  return <li className={`flex items-start gap-3 rounded-xl border p-3.5 ${state === 'active' ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${state === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{step}</span>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-sm font-semibold text-slate-900">{title}</span>{pill}</div>
      <p className="mt-0.5 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  </li>
}

export default function VoiceProvidersPage() {
  const [providers, setProviders] = useState<VoiceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const result = await api<{ data: { providers: VoiceProvider[] } }>('/api/voice-providers')
      const incoming = result.data?.providers || []
      setProviders(providerOrder.map((id) => incoming.find((provider) => provider.id === id)).filter(Boolean) as VoiceProvider[])
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Unable to load voice provider controls') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const toggle = async (provider: VoiceProvider) => {
    if (!provider.enabled && !provider.ready) return
    const nextEnabled = !provider.enabled
    setSaving(provider.id)
    try {
      const result = await api<{ data: VoiceProvider; providers?: VoiceProvider[] }>(`/api/voice-providers/${provider.id}`, { method: 'PUT', body: JSON.stringify({ enabled: nextEnabled }) })
      // Turning one provider on turns the other off, so refresh every card from the server.
      const updated = result.providers || []
      setProviders((current) => current.map((item) => updated.find((next) => next.id === item.id) || (item.id === provider.id ? result.data : item)))
      const switchedOff = nextEnabled ? providers.filter((item) => item.id !== provider.id && item.enabled).map((item) => item.name) : []
      toast.success(nextEnabled
        ? `${provider.name} is now live${switchedOff.length ? ` · ${switchedOff.join(', ')} turned off` : ''}`
        : `${provider.name} turned off · default Twilio AI agent answers calls`)
    } catch (exception) { toast.error(exception instanceof Error ? exception.message : `Could not update ${provider.name}`) }
    finally { setSaving(null) }
  }

    const selected = providers.find((provider) => provider.enabled && provider.ready)
  const selectedDetail = selected?.id === 'retell' ? 'Passed to your Retell agent over SIP. Retell handles speech; your backend supplies the replies.' : selected ? 'Deepgram transcription + your AI Brain + ElevenLabs voice.' : 'Turn on a provider below to send calls to it.'

  return <div className="space-y-4">
    <PageHeader title="Voice providers" description="Choose which voice system answers new inbound calls. Changes apply to new calls only; active calls are never interrupted." />
    <DataState loading={loading} error={error} onRetry={load}>
      <section className="surface-panel rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><PhoneIncoming className="h-[18px] w-[18px]" /></span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-slate-950">Phone number call routing</h2>
              <p className="mt-0.5 text-sm leading-6 text-slate-600">Only one provider can be on at a time. Turning one on turns the other off; with both off, the default agent answers.</p>
            </div>
          </div>
        </div>
        <ol className="mt-4 grid gap-2">
          <RoutingStep step={1} title={selected ? selected.name : 'No provider selected'} detail={selectedDetail} state={selected ? 'active' : 'standby'} />
          <li aria-hidden className="flex justify-center text-slate-300"><ArrowDown className="h-4 w-4" /></li>
          <RoutingStep step={2} title="Default Twilio AI agent" detail="Twilio ConversationRelay with your AI Brain. Answers when no provider is selected, or if the selected one fails." state={selected ? 'fallback' : 'active'} />
        </ol>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map((provider) => <ProviderCard key={provider.id} provider={provider} saving={saving === provider.id} onToggle={toggle} />)}
      </div>

      <p className="flex items-start gap-2 px-1 text-xs leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        Your Twilio number and the browser test call both follow this selection. Changes apply to the next call.
      </p>
    </DataState>
  </div>
}
