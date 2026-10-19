'use client'

import { FormEvent, useEffect, useState } from 'react'
import { BrainCircuit, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/OmniPage'
import { ActionButton, api, DataState } from '@/components/PlatformUI'

type Brain = { company_information?: string; business_description?: string; services?: string[]; faqs?: unknown[]; custom_knowledge?: string; index?: { documents_count?: number; chunks_count?: number } }

export default function KnowledgePage() {
  const [brain, setBrain] = useState<Brain>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try { setBrain((await api<{ data: Brain }>('/api/platform/brain')).data || {}) }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'Unable to load the AI Brain') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const saveBrain = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true)
    try {
      const result = await api<{ data: { value?: Brain } }>('/api/platform/brain', { method: 'PUT', body: JSON.stringify({ value: brain }) })
      setBrain(result.data?.value || brain); toast.success('Knowledge saved and indexed')
    } catch (exception) { toast.error(exception instanceof Error ? exception.message : 'Could not save knowledge') }
    finally { setSaving(false) }
  }

  return <div className="space-y-4">
    <PageHeader title="Knowledge" description="The business facts the AI uses to answer callers. Store data such as products, stock and orders comes live from Shopify." />
    <DataState loading={loading} error={error} onRetry={load}>
      <form onSubmit={saveBrain} className="surface-panel rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700"><BrainCircuit className="h-[18px] w-[18px]" /></span>
          <div><h2 className="text-[15px] font-bold text-slate-950">Shared business knowledge</h2><p className="mt-0.5 text-sm text-slate-600">Used by every channel before the AI answers. Only facts written here are quoted to callers.</p></div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="block"><span className="field-label">Business information</span><textarea value={brain.company_information || ''} onChange={(event) => setBrain({ ...brain, company_information: event.target.value })} placeholder="Who you are, what you offer, location, hours, pricing, and key facts." className="min-h-64 w-full" /></label>
          <label className="block"><span className="field-label">Additional knowledge / FAQs</span><textarea value={brain.custom_knowledge || ''} onChange={(event) => setBrain({ ...brain, custom_knowledge: event.target.value })} placeholder="FAQs, typical timelines, policies, and approved answers." className="min-h-64 w-full" /></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500">Indexed: {brain.index?.documents_count || 0} documents · {brain.index?.chunks_count || 0} chunks</span>
          <ActionButton primary disabled={saving} icon={<Save className="h-4 w-4" />}>{saving ? 'Saving…' : 'Save & index'}</ActionButton>
        </div>
      </form>
    </DataState>
  </div>
}
