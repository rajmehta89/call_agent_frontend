'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, Download, FileText, Globe, RefreshCw, ShoppingBag, Upload } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { ActionButton, api, DataState, MetricGrid } from '@/components/PlatformUI'

const fields = [['company_information', 'Company information'], ['business_description', 'Business description'], ['locations', 'Locations'], ['working_hours', 'Working hours'], ['services', 'Services'], ['faqs', 'FAQs'], ['policies', 'Policies'], ['custom_knowledge', 'Custom knowledge']]
const listFields = new Set(['locations', 'services', 'faqs', 'policies'])
const staticTypes = new Set(['settings', 'web', 'pdf'])

function sourceLabel(sourceType: string) {
  if (sourceType === 'web') return 'Webpage'
  if (sourceType === 'pdf') return 'PDF'
  if (sourceType === 'shopify') return 'Shopify live'
  return 'Business knowledge'
}

export default function KnowledgePage() {
  const [data, setData] = useState<any>({})
  const [sources, setSources] = useState<any[]>([])
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [resyncing, setResyncing] = useState('')
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    setError('')
    api<any>('/api/platform/brain').then((payload) => { setData(payload.data || {}); setSources(payload.data?.sources || []) }).catch((exception) => setError(exception.message)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    const normalized = { ...data }
    for (const [key] of fields) if (listFields.has(key)) normalized[key] = Array.isArray(data[key]) ? data[key] : String(data[key] || '').split('\n').map((item) => item.trim()).filter(Boolean)
    try {
      const payload = await api<any>('/api/platform/brain', { method: 'PUT', body: JSON.stringify({ value: normalized }) })
      setData({ ...normalized, index: payload.data?.index || normalized.index })
      toast.success('Knowledge saved and indexed')
      load()
    } catch (exception) { toast.error(exception instanceof Error ? exception.message : 'Save failed') }
  }

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setWorking(true)
    try {
      const body = new FormData()
      body.append('file', file)
      await api('/api/platform/brain/upload', { method: 'POST', body })
      toast.success(`${file.name} added to the brain`)
      load()
    } catch (exception) { toast.error(exception instanceof Error ? exception.message : 'Upload failed') } finally { setWorking(false); event.target.value = '' }
  }

  const scrape = async () => {
    if (!url.trim()) return toast.error('Enter a webpage URL first')
    setWorking(true)
    try { await api('/api/platform/brain/scrape', { method: 'POST', body: JSON.stringify({ url: url.trim() }) }); toast.success('Webpage added to the brain'); setUrl(''); load() } catch (exception) { toast.error(exception instanceof Error ? exception.message : 'Scrape failed') } finally { setWorking(false) }
  }

  const syncShopify = async () => {
    setWorking(true)
    try { await api('/api/platform/brain/shopify', { method: 'POST' }); toast.success('Shopify catalog added to the brain'); load() } catch (exception) { toast.error(exception instanceof Error ? exception.message : 'Shopify sync failed') } finally { setWorking(false) }
  }

  const resyncSource = async (sourceId: string, sourceName: string) => {
    setResyncing(sourceId)
    try { await api(`/api/platform/brain/resync/${encodeURIComponent(sourceId)}`, { method: 'POST' }); toast.success(`${sourceName} refreshed`); load() } catch (exception) { toast.error(exception instanceof Error ? exception.message : 'Source refresh failed') } finally { setResyncing('') }
  }

  const resyncStatic = async () => {
    setResyncing('all')
    try {
      const payload = await api<any>('/api/platform/brain/resync', { method: 'POST' })
      const failures = payload.data?.errors?.length || 0
      if (failures) toast.error(`${failures} source${failures === 1 ? '' : 's'} could not be refreshed`)
      else toast.success('All static sources refreshed')
      load()
    } catch (exception) { toast.error(exception instanceof Error ? exception.message : 'Static source refresh failed') } finally { setResyncing('') }
  }

  const exportKnowledge = () => { const anchor = document.createElement('a'); const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); anchor.href = blobUrl; anchor.download = 'agentflow-knowledge.json'; anchor.click(); URL.revokeObjectURL(blobUrl) }
  const index = data.index || {}
  const staticSourceCount = sources.filter((source) => staticTypes.has(source.source_type)).length

  return <div className="space-y-7">
    <PageHeader title="Knowledge Base" description="One shared business knowledge layer for WhatsApp and Voice. Add business facts, PDFs, webpages, and live commerce data in one place." />
    <DataState loading={loading} error={error} onRetry={load}>
      <MetricGrid items={[{ label: 'Indexed items', value: index.documents_count || 0, detail: 'Business knowledge and sources' }, { label: 'Knowledge sources', value: index.source_count || 0, detail: 'Static and live sources' }, { label: 'Last updated', value: index.last_indexed_at ? new Date(index.last_indexed_at).toLocaleDateString() : '—', detail: index.last_indexed_at ? new Date(index.last_indexed_at).toLocaleTimeString() : 'Add a source to begin' }, { label: 'Index status', value: index.ready ? 'Ready' : 'Needs content', detail: 'Shared with both agents' }]} />
      <section className="surface-panel rounded-[28px] p-6">
        <div><div className="text-sm font-bold text-slate-900">Add a source</div><p className="mt-1 text-xs leading-5 text-slate-500">Add business content once. Manage full refreshes and individual source updates in Source management.</p></div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1.2fr_auto]">
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://yourwebsite.com/page" aria-label="Webpage URL" />
          <div className="flex flex-wrap gap-2"><ActionButton onClick={scrape} disabled={working || resyncing !== ''} icon={<Globe className="h-4 w-4" />}>Add webpage</ActionButton><ActionButton onClick={() => fileInput.current?.click()} disabled={working || resyncing !== ''} icon={<Upload className="h-4 w-4" />}>Upload PDF</ActionButton><input ref={fileInput} type="file" accept="application/pdf,.pdf" onChange={upload} className="hidden" /><ActionButton onClick={syncShopify} disabled={working || resyncing !== ''} icon={<ShoppingBag className="h-4 w-4" />}>Sync Shopify catalog</ActionButton></div>
          <div className="text-xs leading-5 text-slate-400 lg:text-right">PDF limit: 25 MB<br />Shopify stays live-managed</div>
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="surface-panel rounded-[28px] p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><div className="text-sm font-bold text-slate-900">Business knowledge</div><p className="mt-1 text-xs leading-5 text-slate-500">Use one item per line for locations, services, FAQs, and policies. Add webpages above when the source is your website.</p></div>{index.ready && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f7ec] px-2.5 py-1 text-[10px] font-bold text-[#16805c]"><CheckCircle2 className="h-3 w-3" />Indexed</span>}</div><div className="grid gap-5 md:grid-cols-2">{fields.map(([key, label]) => <label key={key} className={['company_information', 'business_description', 'custom_knowledge'].includes(key) ? 'md:col-span-2' : ''}><span className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{label}</span><textarea rows={key === 'custom_knowledge' ? 7 : 3} value={Array.isArray(data[key]) ? data[key].join('\n') : data[key] || ''} onChange={(event) => setData({ ...data, [key]: event.target.value })} /></label>)}</div><div className="mt-6 flex flex-wrap gap-2"><ActionButton primary onClick={save} icon={<RefreshCw className="h-4 w-4" />}>Save & re-index</ActionButton><ActionButton onClick={exportKnowledge} icon={<Download className="h-4 w-4" />}>Export JSON</ActionButton></div></div>
        <div className="space-y-5"><section className="surface-panel rounded-[24px] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileText className="h-4 w-4 text-[#d97706]" />Source management</div><div className="mt-1 text-xs text-slate-500">{staticSourceCount} static source{staticSourceCount === 1 ? '' : 's'} · refresh all or one at a time</div></div><ActionButton onClick={resyncStatic} disabled={resyncing !== '' || staticSourceCount === 0} icon={<RefreshCw className="h-4 w-4" />}>{resyncing === 'all' ? 'Refreshing...' : 'Resync all'}</ActionButton></div><div className="mt-4 space-y-2">{sources.length ? sources.map((source) => { const isStatic = staticTypes.has(source.source_type); const busy = resyncing === source.source_id || resyncing === 'all'; return <div key={source.source_id} className="rounded-xl bg-slate-50 px-3 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-xs font-semibold text-slate-800">{source.source_name}</div><div className="mt-1 text-[10px] text-slate-400">{sourceLabel(source.source_type)} · {source.chunks} items</div>{source.updated_at && <div className="mt-1 text-[10px] text-slate-400">Updated {new Date(source.updated_at).toLocaleString()}</div>}</div><div className="flex shrink-0 items-center gap-2"><span className={`premium-badge ${source.status === 'ready' ? 'live' : 'pending'}`}>{source.status === 'ready' ? 'Ready' : 'Needs attention'}</span>{isStatic ? <ActionButton onClick={() => resyncSource(source.source_id, source.source_name)} disabled={busy} icon={<RefreshCw className="h-3.5 w-3.5" />}>{busy ? 'Refreshing' : 'Resync'}</ActionButton> : <span className="text-[10px] font-semibold text-slate-400">Live</span>}</div></div></div> }) : <p className="text-xs leading-5 text-slate-500">No sources yet. Add a PDF, webpage, or Shopify catalog above.</p>}</div><p className="mt-4 text-[11px] leading-5 text-slate-400">Use Resync all after broad content changes, or use a source’s own Resync button for a single update. Webpages are fetched again, PDFs are rebuilt from the stored upload, and Shopify stays live-managed.</p></section></div>
      </div>
    </DataState>
  </div>
}
