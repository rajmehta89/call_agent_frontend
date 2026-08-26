'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowUpRight, Bot, Database, KeyRound, Save, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { ActionButton, api, DataState, MetricGrid, StatusBadge } from '@/components/PlatformUI'

const labels: Record<string, string> = {
  search_shopify_products: 'Search products',
  check_inventory: 'Check inventory',
  get_product_price: 'Get product price',
  get_product_details: 'Get product details',
  get_order: 'Get order',
  get_customer_orders: 'Get customer orders',
  create_lead: 'Create lead',
  update_lead: 'Update lead',
  send_whatsapp_message: 'Send WhatsApp message',
  transfer_voice_call: 'Transfer voice call',
  human_handoff: 'Human handoff',
  custom_api_calls: 'Custom API calls',
}

const descriptions: Record<string, string> = {
  search_shopify_products: 'Find live products when a customer asks about an item.',
  check_inventory: 'Read current stock from the connected store.',
  get_product_price: 'Return current live pricing and currency.',
  get_product_details: 'Read product and variant information.',
  get_order: 'Look up a specific customer order.',
  get_customer_orders: 'Review a customer\'s recent orders.',
  create_lead: 'Create a lead from a qualified conversation.',
  update_lead: 'Update captured requirements and lead status.',
  send_whatsapp_message: 'Send an approved outbound WhatsApp response.',
  transfer_voice_call: 'Route a voice call to a human team member.',
  human_handoff: 'Create a human takeover request with context.',
  custom_api_calls: 'Call configured external APIs; keep disabled until reviewed.',
}

const shopifyTools = new Set(['search_shopify_products', 'check_inventory', 'get_product_price', 'get_product_details', 'get_order', 'get_customer_orders'])
const commerceKeys = new Set(['search_shopify_products', 'check_inventory', 'get_product_price', 'get_product_details', 'get_order', 'get_customer_orders'])

export default function ToolsPage() {
  const [tools, setTools] = useState<Record<string, boolean>>({})
  const [shopify, setShopify] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([api<any>('/api/platform/tools'), api<any>('/api/platform/shopify/status')])
      .then(([toolPayload, shopifyPayload]) => {
        setTools(toolPayload.data || {})
        setShopify(shopifyPayload.data || {})
      })
      .catch((exception) => setError(exception instanceof Error ? exception.message : 'Unable to load AI tools'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    try {
      await api('/api/platform/tools', { method: 'PUT', body: JSON.stringify({ value: tools }) })
      toast.success('AI tool permissions saved')
    } catch (exception) {
      toast.error(exception instanceof Error ? exception.message : 'Save failed')
    }
  }

  const entries = useMemo(() => Object.entries(tools), [tools])
  const allowed = useMemo(() => entries.filter(([, enabled]) => enabled).length, [entries])
  const enabledCommerce = useMemo(() => entries.filter(([key, enabled]) => enabled && commerceKeys.has(key)).length, [entries])

  return <div className="space-y-7">
    <PageHeader title="AI Tools" description="Choose which actions the shared brain can use across WhatsApp and Voice. Select a tool below to review its setup and permissions." />
    <DataState loading={loading} error={error} onRetry={load}>
      <MetricGrid items={[
        { label: 'Available tools', value: entries.length },
        { label: 'Allowed', value: allowed },
        { label: 'Blocked', value: entries.length - allowed },
        { label: 'Scope', value: 'Shared brain', detail: 'WhatsApp + Voice' },
      ]} />

      <section className="surface-panel mt-6 overflow-hidden rounded-[24px] border border-[#d9def7] bg-[linear-gradient(110deg,#f4f6ff_0%,#ffffff_62%,#effaf4_100%)]">
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#5a67b1] shadow-sm"><ShoppingBag className="h-5 w-5" /></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-bold text-slate-900">Shopify commerce tool</h2><StatusBadge value={shopify.connected ? 'Connected' : 'Needs setup'} /></div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Give both agents live access to products, prices, inventory, and customer orders. Configure the store once; the tool permissions below control what the AI may use.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="rounded-lg bg-white/80 px-3 py-2">{enabledCommerce} of {shopifyTools.size} commerce tools allowed</span><span className="rounded-lg bg-white/80 px-3 py-2">{shopify.store_domain || 'No store connected'}</span></div>
            </div>
          </div>
          <Link href="/brain/shopify" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#5a67b1] px-4 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(90,103,177,.18)] transition hover:brightness-105"><KeyRound className="h-4 w-4" />{shopify.connected ? 'Manage Shopify' : 'Configure Shopify'}<ArrowUpRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <div className="mt-6 flex items-center justify-between gap-3"><div><div className="text-sm font-bold text-slate-900">Tool permissions</div><div className="mt-1 text-xs text-slate-500">These switches apply to the next AI request on either channel.</div></div><div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex"><Database className="h-4 w-4 text-[#5a67b1]" />Live records stay live</div></div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{entries.map(([key, enabled]) => <section key={key} className="surface-panel rounded-[22px] p-5"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${enabled ? 'bg-[#fff7ed] text-[#b45309]' : 'bg-slate-100 text-slate-400'}`}><Bot className="h-4 w-4" /></span><div><div className="font-semibold text-slate-900">{labels[key] || key}</div><p className="mt-2 text-xs leading-5 text-slate-500">{descriptions[key] || 'Shared brain action permission.'}</p></div></div><button type="button" aria-label={`${enabled ? 'Disable' : 'Enable'} ${labels[key] || key}`} onClick={() => setTools({ ...tools, [key]: !enabled })} className={`h-7 w-12 shrink-0 rounded-full p-1 transition ${enabled ? 'bg-[#d97706]' : 'bg-slate-200'}`}><span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition ${enabled ? 'translate-x-5' : 'translate-x-0'}`} /></button></div><div className="mt-4 flex items-center gap-2"><span className={`premium-badge ${enabled ? 'live' : 'pending'}`}>{enabled ? 'Allowed' : 'Blocked'}</span><span className="text-[11px] text-slate-400">{shopifyTools.has(key) ? 'Shopify live data' : 'WhatsApp + Voice'}</span></div></section>)}</div>
      <div className="mt-6 flex flex-wrap items-center gap-3"><ActionButton primary onClick={save} icon={<Save className="h-4 w-4" />}>Save permissions</ActionButton><div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-[#16805c]" />Only enabled tools can be called by the shared brain.</div></div>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 sm:hidden"><Sparkles className="h-4 w-4 text-[#5a67b1]" />Live records stay live.</div>
    </DataState>
  </div>
}
