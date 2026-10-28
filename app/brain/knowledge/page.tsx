'use client'

import { useEffect, useRef, useState } from 'react'
import { BrainCircuit, FileText, Globe, Plus, RefreshCw, Save, ShoppingBag, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/OmniPage'
import { ActionButton, api, DataState, Spinner } from '@/components/PlatformUI'

type Brain = Record<string, unknown> & { index?: { documents_count?: number; chunks_count?: number; source_count?: number } }
type Source = { source_id: string; source_type: string; source_name: string; chunks?: number; updated_at?: string; metadata?: { url?: string; filename?: string; pages?: number } }

/** Every field the AI Brain indexes (brain_service._knowledge_source_items). Lists are edited one item per line. */
const FIELDS: { key: string; label: string; hint: string; list?: boolean; tall?: boolean }[] = [
  { key: 'company_information', label: 'Business information', hint: 'Who you are, contact details, and key facts.', tall: true },
  { key: 'business_description', label: 'What the business does', hint: 'A short description callers can be told.' },
  { key: 'services', label: 'Services', hint: 'One service per line.', list: true, tall: true },
  { key: 'faqs', label: 'FAQs', hint: 'One question and its answer per line.', list: true, tall: true },
  { key: 'policies', label: 'Policies and answering rules', hint: 'One rule per line, e.g. how prices are quoted.', list: true },
  { key: 'locations', label: 'Locations', hint: 'One location per line.', list: true },
  { key: 'working_hours', label: 'Working hours', hint: 'When and how people can reach you.' },
  { key: 'website_content', label: 'Website summary', hint: 'Key points from your website.' },
  { key: 'custom_knowledge', label: 'Additional knowledge', hint: 'Anything else: timelines, approved answers, details.', tall: true },
]

const SOURCE_ICON: Record<string, typeof Globe> = { web: Globe, pdf: FileText, shopify: ShoppingBag, settings: BrainCircuit }
const asText = (value: unknown, list?: boolean) => list ? (Array.isArray(value) ? value.map(String).join('\n') : String(value || '')) : typeof value === 'string' ? value : value ? JSON.stringify(value, null, 2) : ''
const updated = (value?: string) => { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '' }

export default function KnowledgePage() {
  const [brain, setBrain] = useState<Brain>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState('')  // source id (or 'url' / 'pdf') with an action in progress
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const file = useRef<HTMLInputElement>(null)

  const loadSources = async () => setSources((await api<{ data: Source[] }>('/api/platform/brain/sources')).data || [])
  const load = async () => {
    setLoading(true); setError('')
    try {
      const data = (await api<{ data: Brain }>('/api/platform/brain')).data || {}
      setBrain(data)
      setDrafts(Object.fromEntries(FIELDS.map((field) => [field.key, asText(data[field.key], field.list)])))
      await loadSources()
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Unable to load the AI Brain') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const saveBrain = async () => {
    setSaving(true)
    // Keep fields this page does not edit (e.g. name); drop read-only status the server sent with the knowledge.
    const { index: _index, sources: _sources, ...rest } = brain as Brain & { sources?: unknown }
    const value: Record<string, unknown> = { ...rest }
    for (const field of FIELDS) value[field.key] = field.list ? drafts[field.key].split('\n').map((line) => line.trim()).filter(Boolean) : drafts[field.key].trim()
    try {
      const result = await api<{ data: { value?: Brain; index?: Brain['index'] } }>('/api/platform/brain', { method: 'PUT', body: JSON.stringify({ value }) })
      setBrain({ ...value, index: result.data?.index || brain.index })
      await loadSources()
      toast.success('Knowledge saved — calls and chats use it from the next question')
    } catch (exception) { toast.error(exception instanceof Error ? exception.message : 'Could not save knowledge') }
    finally { setSaving(false) }
  }

  const run = async (key: string, action: () => Promise<unknown>, done: string) => {
    setBusy(key)
    try { await action(); await loadSources(); toast.success(done) }
    catch (exception) { toast.error(exception instanceof Error ? exception.message : 'That did not work') }
    finally { setBusy('') }
  }
  const addWebsite = () => {
    const address = url.trim()
    if (!/^https?:\/\//i.test(address)) { toast.error('Enter a full address starting with https://'); return }
    run('url', () => api('/api/platform/brain/scrape', { method: 'POST', body: JSON.stringify({ url: address }) }), 'Website added to the knowledge').then(() => setUrl(''))
  }
  const uploadPdf = (picked?: File) => {
    if (!picked) return
    const form = new FormData(); form.append('file', picked)
    run('pdf', () => api('/api/platform/brain/upload', { method: 'POST', body: form }), `${picked.name} added to the knowledge`).finally(() => { if (file.current) file.current.value = '' })
  }
  const remove = (source: Source) => {
    if (!window.confirm(`Remove "${source.source_name}" from the knowledge? Calls and chats will stop using it right away.`)) return
    run(source.source_id, () => api(`/api/platform/brain/sources/${encodeURIComponent(source.source_id)}`, { method: 'DELETE' }), 'Source removed')
  }
  const refresh = (source: Source) => run(source.source_id, () => api(`/api/platform/brain/resync/${encodeURIComponent(source.source_id)}`, { method: 'POST' }), 'Source refreshed')

  const chunks = sources.reduce((total, source) => total + (source.chunks || 0), 0)
  return <div className="space-y-4">
    <PageHeader title="Knowledge" description="The business facts the AI uses to answer callers and chats. Store data such as products, stock and orders comes live from Shopify." />
    <DataState loading={loading} error={error} onRetry={load}>
      <section className="surface-panel rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700"><BrainCircuit className="h-[18px] w-[18px]" /></span>
            <div><h2 className="text-[15px] font-bold text-slate-950">Business knowledge</h2><p className="mt-0.5 text-sm text-slate-600">Only facts written here (and in the sources below) are quoted. Clear a box and save to remove it.</p></div>
          </div>
          <ActionButton primary disabled={saving} onClick={saveBrain} icon={saving ? <Spinner /> : <Save className="h-4 w-4" />}>{saving ? 'Saving…' : 'Save & index'}</ActionButton>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {FIELDS.map((field) => <label key={field.key} className="block min-w-0">
            <span className="field-label">{field.label}</span>
            <textarea value={drafts[field.key] || ''} onChange={(event) => setDrafts({ ...drafts, [field.key]: event.target.value })} placeholder={field.hint} className={`w-full ${field.tall ? 'min-h-48' : 'min-h-28'}`} />
            <span className="mt-1 block text-xs text-slate-500">{field.hint}{field.list && drafts[field.key] ? ` · ${drafts[field.key].split('\n').filter((line) => line.trim()).length} items` : ''}</span>
          </label>)}
        </div>
      </section>

      <section className="surface-panel mt-4 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-[15px] font-bold text-slate-950">Sources the AI searches</h2><p className="mt-0.5 text-sm text-slate-600">{sources.length} sources · {chunks} chunks. Removing a source stops calls and chats quoting it immediately.</p></div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 gap-2">
            <input value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addWebsite() }} placeholder="https://your-website.com/page" aria-label="Website address" className="min-w-0 flex-1" />
            <ActionButton disabled={busy === 'url'} onClick={addWebsite} icon={busy === 'url' ? <Spinner /> : <Plus className="h-4 w-4" />}>Add website</ActionButton>
          </div>
          <div>
            <input ref={file} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => uploadPdf(event.target.files?.[0])} />
            <ActionButton disabled={busy === 'pdf'} onClick={() => file.current?.click()} icon={busy === 'pdf' ? <Spinner /> : <Upload className="h-4 w-4" />}>Upload PDF</ActionButton>
          </div>
        </div>
        {sources.length ? <ul className="mt-4 divide-y divide-[#E9DFFF] overflow-hidden rounded-xl border border-[#E9DFFF]">
          {sources.map((source) => {
            const Icon = SOURCE_ICON[source.source_type] || FileText
            const settings = source.source_id === 'brain_settings'
            const working = busy === source.source_id
            return <li key={source.source_id} className="flex flex-wrap items-center gap-3 bg-white px-3.5 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1EBFF] text-[#6C3BFF]"><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900" title={source.source_name}>{source.source_name}</span>
                <span className="block truncate text-xs text-slate-500">{settings ? 'The form above' : source.metadata?.url || source.metadata?.filename || source.source_type} · {source.chunks || 0} chunks{updated(source.updated_at) ? ` · updated ${updated(source.updated_at)}` : ''}</span>
              </span>
              {settings ? <span className="text-xs text-slate-500">Edit with the form above</span> : <span className="flex shrink-0 gap-2">
                {source.source_type !== 'shopify' && <ActionButton disabled={working} onClick={() => refresh(source)} title={`Refresh ${source.source_name}`} icon={working ? <Spinner /> : <RefreshCw className="h-4 w-4" />}>Refresh</ActionButton>}
                <ActionButton tone="danger" disabled={working} onClick={() => remove(source)} title={`Remove ${source.source_name}`} icon={<Trash2 className="h-4 w-4" />}>Remove</ActionButton>
              </span>}
            </li>
          })}
        </ul> : <p className="mt-4 rounded-xl border border-dashed border-[#D8C8FF] bg-[#F8F5FF] px-3 py-4 text-center text-sm text-slate-600">No sources yet. Save the form above, add a website, or upload a PDF.</p>}
      </section>
    </DataState>
  </div>
}
