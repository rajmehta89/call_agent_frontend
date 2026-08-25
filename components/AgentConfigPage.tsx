'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Bot, Save, TestTube2 } from 'lucide-react'
import { PageHeader } from './OmniPage'
import { ActionButton, api, DataState, FeatureSection } from './PlatformUI'

const channelFields: Record<string, { key: string; label: string; type?: string }[]> = {
  whatsapp: [
    { key: 'name', label: 'Agent name' }, { key: 'personality', label: 'Personality' }, { key: 'tone', label: 'Tone' },
    { key: 'language', label: 'Language' }, { key: 'greeting', label: 'Greeting' }, { key: 'closing_message', label: 'Closing message' },
    { key: 'business_hours', label: 'Business hours' }, { key: 'out_of_hours_response', label: 'Out-of-hours response' },
    { key: 'response_delay', label: 'Response delay' }, { key: 'context_window', label: 'Context window' },
    { key: 'confidence_threshold', label: 'Confidence threshold' }, { key: 'dont_know_behaviour', label: "Don't-know behaviour" },
  ],
  voice: [
    { key: 'name', label: 'Agent name' }, { key: 'voice_provider', label: 'Voice provider' }, { key: 'voice', label: 'Voice selection' },
    { key: 'language', label: 'Language' }, { key: 'accent', label: 'Accent' }, { key: 'speaking_speed', label: 'Speaking speed' },
    { key: 'pitch', label: 'Pitch' }, { key: 'personality', label: 'Personality' }, { key: 'greeting', label: 'Greeting' },
    { key: 'interruptions', label: 'Interruption behaviour' }, { key: 'silence_timeout', label: 'Silence timeout' },
    { key: 'maximum_call_duration', label: 'Maximum call duration' }, { key: 'end_call_behaviour', label: 'End-call behaviour' },
  ],
}

export default function AgentConfigPage({ channel }: { channel: 'whatsapp' | 'voice' }) {
  const [config, setConfig] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = () => { setLoading(true); setError(''); api(`/api/platform/agents/${channel}`).then((p) => setConfig(p.data)).catch((e) => setError(e.message)).finally(() => setLoading(false)) }
  useEffect(load, [channel])
  const save = async () => { try { await api(`/api/platform/agents/${channel}`, { method: 'PUT', body: JSON.stringify({ value: config }) }); toast.success(`${channel === 'voice' ? 'Voice' : 'WhatsApp'} agent saved`) } catch (e) { toast.error(e instanceof Error ? e.message : 'Save failed') } }
  return <div className="space-y-7">
    <PageHeader title={`${channel === 'voice' ? 'Voice' : 'WhatsApp'} Agent`} description={`Configure channel-specific ${channel === 'voice' ? 'speech and call' : 'messaging and response'} behavior. Knowledge, Shopify, customers, and tool permissions come from the shared AI Brain.`} />
    <DataState loading={loading} error={error} onRetry={load}><div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="surface-panel rounded-[28px] p-6"><div className="grid gap-5 md:grid-cols-2">{channelFields[channel].map((field) => <label key={field.key} className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{field.label}</span><input value={config[field.key] ?? ''} onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })} /></label>)}</div><label className="mt-5 block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">Instructions</span><textarea rows={7} value={config.instructions ?? ''} onChange={(e) => setConfig({ ...config, instructions: e.target.value })} /></label><label className="mt-5 block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">Human handoff rules</span><textarea rows={4} value={config.human_handoff_rules ?? ''} onChange={(e) => setConfig({ ...config, human_handoff_rules: e.target.value })} /></label><div className="mt-6 flex flex-wrap gap-2"><ActionButton primary onClick={save} icon={<Save className="h-4 w-4" />}>Save agent</ActionButton><ActionButton icon={<TestTube2 className="h-4 w-4" />}>Test agent</ActionButton><ActionButton>Duplicate</ActionButton><ActionButton>Version history</ActionButton></div></div>
      <div className="space-y-5"><FeatureSection title="Shared brain access" description="This channel reads live shared context at response time." features={['Company knowledge','FAQs & policies','Customer profile','Shopify products','Inventory & orders','AI tool permissions']} /><FeatureSection title="Safety & escalation" features={['Restricted topics','Hallucination protection','Confidence threshold','Frustration detection','Human handoff','Enable / disable']} /></div>
    </div></DataState>
  </div>
}
