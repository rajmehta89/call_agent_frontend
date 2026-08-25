'use client'

import { useEffect, useState } from 'react'
import { Activity, Bot, MessageSquare, PhoneCall, ShoppingBag } from 'lucide-react'
import { ChannelCard, PageHeader } from '@/components/OmniPage'
import { api, DataState, MetricGrid, Toolbar } from '@/components/PlatformUI'

export default function Dashboard() {
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    api('/api/platform/dashboard')
      .then((payload) => setData(payload.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])
  const metrics = data.metrics || {}

  return (
    <div className="space-y-7">
      <PageHeader
        title="Command Center"
        description="One clear operating view for WhatsApp, Voice, customers, leads, Shopify, automation, and human handoff."
      />
      <Toolbar onRefresh={load} onExport={() => window.print()}>
        <input type="date" className="min-w-[180px] flex-1" />
        <select className="min-w-[180px] flex-1"><option>All channels</option><option>WhatsApp</option><option>Voice</option></select>
        <select className="min-w-[180px] flex-1"><option>All agents</option></select>
      </Toolbar>
      <DataState loading={loading} error={error} onRetry={load}>
        <MetricGrid items={[
          { label: 'Total conversations', value: metrics.total_conversations || 0 },
          { label: 'WhatsApp', value: metrics.whatsapp_conversations || 0 },
          { label: 'Voice calls', value: metrics.voice_calls || 0 },
          { label: 'Customers', value: metrics.customers || 0 },
          { label: 'Total leads', value: metrics.total_leads || 0 },
          { label: 'Qualified leads', value: metrics.qualified_leads || 0 },
          { label: 'AI resolution', value: `${metrics.ai_resolution_percent || 0}%` },
          { label: 'Human handoff', value: `${metrics.human_handoff_percent || 0}%` },
          { label: 'Shopify enquiries', value: metrics.shopify_product_enquiries || 0 },
          { label: 'Orders influenced', value: metrics.orders_influenced || 0 },
          { label: 'AI usage', value: metrics.ai_usage || 0 },
          { label: 'Errors', value: metrics.error_count || 0 },
        ]} />

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <ChannelCard title="WhatsApp Agent" description="Messaging, customer context, live Shopify answers, lead capture, and human takeover." status={data.channels?.whatsapp?.connected ? 'Connected' : 'Not connected'} icon={MessageSquare} />
          <ChannelCard title="Voice Agent" description="Inbound and outbound calls, transcripts, summaries, leads, and team transfers." status={data.channels?.voice?.connected ? 'Connected' : 'Not connected'} icon={PhoneCall} />
          <ChannelCard title="AI Assistant" description="Business knowledge, customer memory, Shopify access, tool permissions, and activity." status="Active" icon={Bot} />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <section className="surface-panel rounded-[28px] p-6">
            <div className="flex items-center gap-2 font-bold text-slate-900"><Activity className="h-4 w-4 text-[#d97706]" />Recent activity</div>
            <div className="mt-4 divide-y divide-slate-100">
              {(data.recent_activity || []).length ? (data.recent_activity || []).map((row: any) => (
                <div key={row._id} className="py-4">
                  <div className="flex justify-between gap-3"><span className="text-sm font-medium text-slate-800">{row.channel} · {row.agent}</span><span className="text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</span></div>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-500">{row.request}</p>
                </div>
              )) : <div className="py-10 text-center text-sm text-slate-500">AI activity appears after the first customer interaction.</div>}
            </div>
          </section>
          <section className="surface-panel rounded-[28px] p-6">
            <div className="flex items-center gap-2 font-bold text-slate-900"><ShoppingBag className="h-4 w-4 text-[#f09a36]" />Shopify commerce</div>
            <div className="mt-5 text-3xl font-extrabold text-slate-900">{data.shopify?.connected ? 'Live' : 'Not connected'}</div>
            <p className="mt-3 text-sm leading-6 text-slate-500">{data.shopify?.connected ? `Live queries use ${data.shopify.store_domain}.` : 'Connect Shopify to unlock product, inventory, order, and customer tools.'}</p>
          </section>
        </div>
      </DataState>
    </div>
  )
}
