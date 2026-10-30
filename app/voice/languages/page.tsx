'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Languages } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/OmniPage'
import { api, DataState, Spinner } from '@/components/PlatformUI'
import { LEAD_LANGUAGES, type LeadLanguage } from '@/components/lead-language'

type VoiceLanguage = {
  code: LeadLanguage
  label: string
  native_label: string
  locale: string
  understands?: string[]
  enabled: boolean
}

function LanguageSwitch({ checked, busy, disabled, label, onClick }: { checked: boolean; busy: boolean; disabled: boolean; label: string; onClick: () => void }) {
  return <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={busy || disabled}
    onClick={onClick}
    className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${checked ? 'bg-[#6C3BFF]' : 'bg-slate-300'}`}
  >
    <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`}>
      {busy && <Spinner size="sm" />}
    </span>
  </button>
}

export default function VoiceLanguagesPage() {
  const [languages, setLanguages] = useState<VoiceLanguage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const enabledCount = useMemo(() => languages.filter((language) => language.enabled).length, [languages])

  const load = async () => {
    setLoading(true); setError('')
    try {
      const result = await api<{ data: { languages: VoiceLanguage[] } }>('/api/voice-providers/languages')
      const incoming = result.data?.languages || []
      setLanguages(LEAD_LANGUAGES.map((fallback) => ({ ...fallback, native_label: fallback.nativeLabel, enabled: true, ...incoming.find((language) => language.code === fallback.code) })))
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Unable to load language settings') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const toggle = async (language: VoiceLanguage) => {
    if (language.enabled && enabledCount === 1) {
      toast.error('Keep at least one call language enabled')
      return
    }
    const nextEnabled = !language.enabled
    setSaving(language.code)
    try {
      const result = await api<{ data: { languages: VoiceLanguage[] } }>('/api/voice-providers/languages', {
        method: 'PUT',
        body: JSON.stringify({ enabled_languages: languages.filter((item) => item.code === language.code ? nextEnabled : item.enabled).map((item) => item.code) }),
      })
      setLanguages(result.data?.languages || languages.map((item) => item.code === language.code ? { ...item, enabled: nextEnabled } : item))
      toast.success(`${language.label} ${nextEnabled ? 'enabled' : 'disabled'} for new calls`)
    } catch (exception) { toast.error(exception instanceof Error ? exception.message : 'Could not update language settings') }
    finally { setSaving(null) }
  }

  return <div className="space-y-4">
    <PageHeader title="Call languages" description="Choose which languages the voice agent may use for greetings, live conversation, and transcription." />
    <DataState loading={loading} error={error} onRetry={load}>
      <section className="surface-panel rounded-2xl border border-[#E9DFFF] bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1EBFF] text-[#5A2BE6]"><Languages className="h-5 w-5" /></span>
          <div>
            <h2 className="text-base font-bold text-slate-950">Language availability</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Disabled languages are ignored when a lead or caller requests them. Existing calls are not interrupted.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {languages.map((language) => <article key={language.code} className={`rounded-2xl border p-4 transition ${language.enabled ? 'border-[#D8C8FF] bg-[#FBFAFF]' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${language.enabled ? 'bg-[#F1EBFF] text-[#5A2BE6]' : 'bg-slate-200 text-slate-500'}`}>{language.code.toUpperCase()}</span>
                <div className="min-w-0"><h3 className="text-sm font-bold text-slate-900">{language.label}</h3><p className="mt-0.5 text-sm text-slate-500">{language.native_label || language.label}</p><p className="mt-1 text-[11px] text-slate-400">{language.locale}</p>{!!language.understands?.length && <p className="mt-2 flex flex-wrap gap-1">{language.understands.map((name) => <span key={name} className="rounded-full bg-[#F1EBFF] px-2 py-0.5 text-[11px] font-semibold text-[#5A2BE6]">Also understands {name}</span>)}</p>}</div>
              </div>
              <LanguageSwitch checked={language.enabled} busy={saving === language.code} disabled={language.enabled && enabledCount === 1} label={`${language.enabled ? 'Disable' : 'Enable'} ${language.label}`} onClick={() => toggle(language)} />
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold"><CheckCircle2 className={`h-3.5 w-3.5 ${language.enabled ? 'text-[#5A2BE6]' : 'text-slate-300'}`} />{language.enabled ? 'Available for calls' : 'Not used for new calls'}</div>
          </article>)}
        </div>
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-[#F8F5FF] px-3.5 py-3 text-xs leading-5 text-slate-600"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#6C3BFF]" /><span>English summaries remain enabled independently, so the call record stays easy for the whole team to read.</span></div>
      </section>
    </DataState>
  </div>
}
