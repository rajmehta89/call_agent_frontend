'use client'

import { useEffect, useMemo, useState } from 'react'
import { BellRing, Check, PhoneForwarded, PhoneOff, Plus, Save, Trash2, UserRound, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '../../../components/OmniPage'
import { DataState, api, userFacingError, Spinner } from '../../../components/PlatformUI'
import { Panel } from '../../../components/premium'

type Agent = { name: string; phone: string; enabled: boolean; preferred_languages?: string[] }
type Settings = { enabled: boolean; agents: Agent[]; ring_seconds: number; updated_by_name?: string; updated_at?: string }
type LanguageOption = { code: string; label: string; native_label?: string; enabled: boolean }

/** Browser-console trace; filter the console by "[forwarding]". */
const log = (message: string, ...details: unknown[]) => console.info(`[forwarding] ${message}`, ...details)
const RING_CHOICES = [10, 15, 20, 25, 30, 45, 60]
const MAX_AGENTS = 10
const blankAgent = (): Agent => ({ name: '', phone: '', enabled: true })
const DEFAULT_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', native_label: 'English', enabled: true },
  { code: 'ar', label: 'Arabic', native_label: 'العربية', enabled: true },
  { code: 'ur', label: 'Urdu', native_label: 'اردو', enabled: true },
]

/** Settings > Call forwarding: when a caller asks for a person, ring the human team live (on), or keep it with the AI
 *  as a callback request (off). Admins change it; the team can see who is on the list. */
export default function CallForwardingPage() {
  const [saved, setSaved] = useState<Settings | null>(null)
  const [form, setForm] = useState<Settings | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [languages, setLanguages] = useState<LanguageOption[]>(DEFAULT_LANGUAGES)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setError('')
    Promise.all([api<any>('/api/call-forwarding'), api<any>('/api/auth/me')]).then(([result, me]) => {
      const data: Settings = result.data
      setSaved(data); setForm({ ...data, agents: data.agents.length ? data.agents : [blankAgent()] })
      api<any>('/api/voice-providers/languages').then((languageResult) => {
        setLanguages((languageResult.data?.languages || DEFAULT_LANGUAGES).filter((language: LanguageOption) => language.enabled))
      }).catch(() => { /* Language-management permission is separate; keep the safe built-in list for team managers. */ })
      const permissions = ['owner', 'admin'].includes(String(me.data?.role || '').toLowerCase()) ? ['*'] : (me.data?.permissions || [])
      setCanEdit(permissions.includes('*') || permissions.includes('manage_team'))
    }).catch((err) => setError(userFacingError(err)))
  }
  useEffect(() => { load() }, [])

  const filled = (agents: Agent[]) => agents.filter((agent) => agent.name.trim() || agent.phone.trim())
  const changed = useMemo(() => !!form && !!saved && JSON.stringify({ ...form, agents: filled(form.agents) }) !== JSON.stringify({ ...saved, agents: saved.agents }), [form, saved])
  const active = form ? filled(form.agents).filter((agent) => agent.enabled && agent.phone.trim()).length : 0

  const setAgent = (index: number, patch: Partial<Agent>) => form && setForm({ ...form, agents: form.agents.map((agent, i) => i === index ? { ...agent, ...patch } : agent) })
  const toggleLanguage = (index: number, code: string) => {
    const agent = form?.agents[index]
    if (!agent) return
    const current = agent.preferred_languages || []
    setAgent(index, { preferred_languages: current.includes(code) ? current.filter((item) => item !== code) : [...current, code] })
  }
  const removeAgent = (index: number) => form && setForm({ ...form, agents: form.agents.length > 1 ? form.agents.filter((_, i) => i !== index) : [blankAgent()] })

  const save = async (next?: Settings) => {
    const body = next || form
    if (!body) return
    setSaving(true); log('saving', { enabled: body.enabled, agents: filled(body.agents).length, ring: body.ring_seconds })
    try {
      const result = await api<any>('/api/call-forwarding', { method: 'PUT', body: JSON.stringify({ enabled: body.enabled, ring_seconds: body.ring_seconds, agents: filled(body.agents) }) })
      const data: Settings = result.data
      setSaved(data); setForm({ ...data, agents: data.agents.length ? data.agents : [blankAgent()] })
      toast.success(data.enabled ? 'Call forwarding is on' : 'Saved. Call forwarding is off')
    } catch (err) {
      log('save failed', err); toast.error(userFacingError(err))
    } finally { setSaving(false) }
  }

  // The switch saves straight away (with the list as it is now), so "on" really means calls are forwarded.
  const toggle = () => form && save({ ...form, enabled: !form.enabled })

  return <div className="space-y-5">
    <PageHeader icon={PhoneForwarded} title="Call forwarding" description="When a caller asks to talk to a person, ring your team live instead of taking a callback request." />
    <DataState loading={!form && !error} error={error} onRetry={load}>
      {form && <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {/* On / off */}
          <section className={`rounded-2xl border p-4 sm:p-5 ${form.enabled ? 'border-[#C9B5FF] bg-gradient-to-br from-[#F6F2FF] to-white' : 'border-[#E9DFFF] bg-white'}`}>
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${form.enabled ? 'bg-gradient-to-br from-[#8B5CF6] to-[#6C3BFF] text-white' : 'bg-[#F1EBFF] text-[#6C3BFF]'}`}>{form.enabled ? <PhoneForwarded className="h-5 w-5" /> : <PhoneOff className="h-5 w-5" />}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-[15px] font-bold text-slate-900">Forward calls to the team</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${form.enabled ? 'bg-[#6C3BFF] text-white' : 'bg-slate-100 text-slate-500'}`}>{form.enabled ? 'On' : 'Off'}</span></div>
                <p className="mt-1 text-[13px] leading-5 text-slate-600">{form.enabled
                  ? `When a caller names a configured team member, only that person is rung. General requests ring ${active === 1 ? 'your active agent' : `all ${active} active agents`}, and the first to answer takes the call.`
                  : 'The AI handles every call. When a caller asks for a person, it takes a callback request and the conversation moves to Outreach.'}</p>
              </div>
              <button type="button" role="switch" aria-checked={form.enabled} aria-label="Forward calls to the team" disabled={!canEdit || saving} title={canEdit ? undefined : 'Only people who manage the team can change this'} onClick={toggle}
                className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${form.enabled ? 'bg-[#6C3BFF]' : 'bg-slate-300'}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${form.enabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            {form.enabled && active === 0 && <p className="mt-3 rounded-lg bg-white px-3 py-2 text-[12.5px] text-[#5A2BE6] ring-1 ring-[#E9DFFF]">No active agent: add one below, or calls stay with the AI.</p>}
          </section>

          {/* Agents */}
          <Panel icon={Users} title="Human agents" subtitle={`${active} active · named requests route directly; general requests prefer the caller's language`} bodyClassName="p-0"
            action={canEdit && form.agents.length < MAX_AGENTS ? <button type="button" onClick={() => setForm({ ...form, agents: [...form.agents, blankAgent()] })} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#F1EBFF] px-2.5 text-[12.5px] font-semibold text-[#5A2BE6] transition hover:bg-[#E9DFFF]"><Plus className="h-3.5 w-3.5" />Add agent</button> : undefined}>
            <ul className="divide-y divide-[#F4F0FF]">
              {form.agents.map((agent, index) => <li key={index} className="flex flex-col gap-2 px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4F0FF] text-[#6C3BFF] sm:flex"><UserRound className="h-4 w-4" /></span>
                  <label className="min-w-0 flex-1"><span className="sr-only">Name</span>
                    <input value={agent.name} disabled={!canEdit} maxLength={80} placeholder="Name, e.g. Sales desk" onChange={(event) => setAgent(index, { name: event.target.value })} className="h-9 w-full rounded-lg px-3 text-[13.5px]" /></label>
                  <label className="min-w-0 flex-1"><span className="sr-only">Phone number</span>
                    <input value={agent.phone} disabled={!canEdit} maxLength={32} inputMode="tel" placeholder="Phone, e.g. 0412 345 678" onChange={(event) => setAgent(index, { phone: event.target.value })} className="h-9 w-full rounded-lg px-3 text-[13.5px] tabular-nums" /></label>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={!canEdit} title={canEdit ? undefined : 'Only people who manage the team can change this'} onClick={() => setAgent(index, { enabled: !agent.enabled })} aria-pressed={agent.enabled}
                      className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[12px] font-semibold transition disabled:opacity-60 ${agent.enabled ? 'bg-[#6C3BFF] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{agent.enabled ? <><Check className="h-3.5 w-3.5" />Active</> : 'Paused'}</button>
                    {canEdit && <button type="button" onClick={() => removeAgent(index)} aria-label={`Remove ${agent.name || 'agent'}`} title="Remove" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-[#F4F0FF] hover:text-[#5A2BE6]"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </div>
                {languages.length > 0 && <div className="flex flex-wrap items-center gap-1.5 pl-0 sm:pl-11">
                  <span className="mr-1 text-[11.5px] font-semibold text-slate-500">Best languages</span>
                  {languages.map((language) => {
                    const selected = (agent.preferred_languages || []).includes(language.code)
                    return <button key={language.code} type="button" disabled={!canEdit} onClick={() => toggleLanguage(index, language.code)} aria-pressed={selected}
                      title={`${language.label}${language.native_label ? ` · ${language.native_label}` : ''}`}
                      className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition disabled:opacity-60 ${selected ? 'bg-[#E9DFFF] text-[#5A2BE6] ring-1 ring-[#C9B5FF]' : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-[#F7F3FF]'}`}>
                      {language.label}
                    </button>
                  })}
                  {(agent.preferred_languages || []).length === 0 && <span className="text-[11.5px] text-slate-400">No preference · can answer as fallback</span>}
                </div>}
              </li>)}
            </ul>
            <div className="flex flex-col gap-3 border-t border-[#F1EBFF] bg-[#FCFBFF] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <label className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-600">Ring for
                <select value={form.ring_seconds} disabled={!canEdit} onChange={(event) => setForm({ ...form, ring_seconds: Number(event.target.value) })} className="h-8 w-auto rounded-lg px-2 text-[13px]">
                  {RING_CHOICES.map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}
                </select>before telling the caller the team will call back</label>
              {canEdit ? <button type="button" disabled={saving || !changed} title={!changed && !saving ? 'No changes to save' : undefined} onClick={() => save()} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#6C3BFF] px-4 text-sm font-semibold text-white transition hover:bg-[#5A2BE6] disabled:opacity-50">{saving ? <Spinner /> : <Save className="h-4 w-4" />}{changed ? 'Save changes' : 'Saved'}</button>
                : <span className="text-[12px] text-slate-500">Only admins can change call forwarding.</span>}
            </div>
          </Panel>
          {saved?.updated_by_name && <p className="px-1 text-[12px] text-slate-400">Last changed by {saved.updated_by_name}{saved.updated_at ? ` · ${new Date(saved.updated_at.endsWith('Z') ? saved.updated_at : `${saved.updated_at}Z`).toLocaleString()}` : ''}</p>}
        </div>

        {/* How it works */}
        <Panel icon={BellRing} title="How it works" bodyClassName="p-4">
          <ol className="space-y-3 text-[13px] leading-5 text-slate-600">
            {[
              ['Caller asks for a person', 'For example "can I talk to someone?". Questions the AI can answer stay with the AI.'],
              ['The AI says it is connecting them', 'If the caller named a configured person, only that person is rung. Otherwise the active agents who prefer that language are called.'],
              ['The request is tracked', 'The matched team member receives the outreach notification. For a general request, the first active agent to answer takes the call.'],
              ['Nobody free?', 'The caller hears that the team will call back. The request stays in Outreach and is notified to the named person or the general team.'],
            ].map(([title, text], index) => <li key={title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F1EBFF] text-[11px] font-bold text-[#5A2BE6]">{index + 1}</span>
              <span><b className="block font-semibold text-slate-800">{title}</b>{text}</span>
            </li>)}
          </ol>
          <p className="mt-4 rounded-lg bg-[#FAF8FF] p-3 text-[12px] leading-5 text-slate-500">Local numbers are read in your business&apos;s country and saved in international form (+61…). Agents see the caller&apos;s number when it rings.</p>
        </Panel>
      </div>}
    </DataState>
  </div>
}
