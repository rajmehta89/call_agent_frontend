'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowUpRight, Brain, MessageSquare, PhoneCall, ShoppingBag } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { ActionButton, api, DataState, MetricGrid, StatusBadge, Toolbar } from '@/components/PlatformUI'

const catalog = [
  { name: 'WhatsApp', category: 'Customer messages', description: 'Receive messages through Meta and let AI or a team member reply.', icon: MessageSquare, href: '/whatsapp' },
  { name: 'Twilio Voice', category: 'Phone calls', description: 'Handle inbound and outbound calls, recordings, and transfers.', icon: PhoneCall, href: '/voice' },
  { name: 'OpenAI', category: 'AI brain', description: 'Power the shared reasoning and response layer for both channels.', icon: Brain, href: '/brain/tools' },
  { name: 'Shopify', category: 'Commerce data', description: 'Give both agents live access to products, prices, inventory, and orders.', icon: ShoppingBag, href: '/brain/shopify' },
]

export default function IntegrationsPage() {
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = () => { setLoading(true); setError(''); Promise.all([api<any>('/api/platform/dashboard'), api<any>('/api/omnichannel/summary')]).then(([dashboard, summary]) => setData({ dashboard: dashboard.data, summary: summary.data })).catch((exception) => setError(exception.message)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])
  const status = (name: string) => name === 'WhatsApp' ? data.dashboard?.channels?.whatsapp?.connected : name === 'Twilio Voice' ? data.dashboard?.channels?.voice?.connected : name === 'OpenAI' ? data.summary?.ai?.enabled : data.dashboard?.shopify?.connected
  const connected = catalog.filter((item) => status(item.name)).length

  return <div className="space-y-7"><PageHeader title="Integrations" description="Connect the services your agents use. Each card explains what it does and opens its own setup page." /><Toolbar onRefresh={load} /><DataState loading={loading} error={error} onRetry={load}><MetricGrid items={[{ label: 'Services', value: catalog.length, detail: 'User-configurable connections' }, { label: 'Connected', value: connected, detail: 'Ready to use' }, { label: 'Needs setup', value: catalog.length - connected, detail: 'Requires credentials' }, { label: 'Shared scope', value: 'Both agents', detail: 'WhatsApp + Voice' }]} /><div className="mt-6 grid gap-4 md:grid-cols-2">{catalog.map(({ name, category, description, icon: Icon, href }) => { const isConnected = Boolean(status(name)); return <section key={name} className="surface-panel rounded-[24px] p-5"><div className="flex items-start justify-between gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4f6ff] text-[#5a67b1]"><Icon className="h-5 w-5" /></span><StatusBadge value={isConnected ? 'Connected' : 'Needs setup'} /></div><div className="mt-5 text-base font-bold text-slate-900">{name}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">{category}</div><p className="mt-3 min-h-12 text-sm leading-6 text-slate-500">{description}</p><Link href={href} className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">{isConnected ? 'Manage' : 'Set up'}<ArrowUpRight className="h-4 w-4" /></Link></section> })}</div><div className="mt-6 rounded-2xl border border-[#d9def7] bg-[#f4f6ff] p-4 text-sm text-slate-600"><span className="font-semibold text-slate-900">What belongs here:</span> provider connections only. AI permissions are managed in AI Tools, and company content is managed in Knowledge Base.</div></DataState></div>
}
