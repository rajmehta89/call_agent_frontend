'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowUpRight, Bot, Check, Link2, MessageSquare, RefreshCw, ShieldCheck, Webhook } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { ActionButton, api, DataState, MetricGrid, StatusBadge, Toolbar } from '@/components/PlatformUI'

type WhatsAppConversation = { _id: string; customer_name?: string; customer_phone?: string; status?: string; last_message?: string; last_message_at?: string; updated_at?: string; message_count?: number; ai_enabled?: boolean }

const formatDate = (value?: string) => {
  if (!value) return 'No recent activity'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No recent activity' : date.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function CheckRow({ label, ready, detail }: { label: string; ready: boolean; detail: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${ready ? 'bg-[#e3f7ec] text-[#16805c]' : 'bg-[#fff1dc] text-[#b45309]'}`}>{ready ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}</span><div className="min-w-0 flex-1"><div className="text-xs font-semibold text-slate-800">{label}</div><div className="mt-0.5 text-[11px] text-slate-500">{detail}</div></div><span className={`text-[10px] font-bold uppercase tracking-wider ${ready ? 'text-[#16805c]' : 'text-[#b45309]'}`}>{ready ? 'Ready' : 'Needed'}</span></div>
}

export default function WhatsAppOverview() {
  const [stats, setStats] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [statsResult, summaryResult, conversationsResult] = await Promise.all([
        api('/api/whatsapp/stats'),
        api('/api/omnichannel/summary'),
        api('/api/whatsapp/conversations?limit=6'),
      ])
      setStats(statsResult.data || {})
      setSummary(summaryResult.data || {})
      setConversations(conversationsResult.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load WhatsApp overview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const whatsapp = summary?.channels?.whatsapp || {}
  const meta = whatsapp.meta || {}
  const agent = whatsapp.agent || {}
  const ai = summary?.ai || {}
  const providerLabel = whatsapp.provider === 'meta' ? 'Meta WhatsApp Cloud API' : whatsapp.provider === 'twilio' ? 'Twilio WhatsApp' : 'Meta WhatsApp Cloud API'

  return <div className="space-y-6">
    <PageHeader title="WhatsApp overview" description="Monitor Meta WhatsApp Cloud API, AI conversations, delivery readiness, and human handoff from one place." actionLabel="Open inbox" actionHref="/whatsapp/inbox" />
    <Toolbar onRefresh={load} onExport={() => window.print()}><span className="px-2 text-xs font-semibold uppercase tracking-[.12em] text-slate-400">Live provider data</span></Toolbar>
    <DataState loading={loading} error={error} onRetry={load}>
      <section className="relative overflow-hidden rounded-[24px] border border-[#bdebd0] bg-[linear-gradient(110deg,#effaf4_0%,#ffffff_68%,#f4f6ff_100%)] p-6 shadow-[0_16px_34px_rgba(15,23,42,.07)]"><div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#bdebd0]/50 blur-3xl" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#16805c]"><MessageSquare className="h-3.5 w-3.5" />Meta WhatsApp channel</div><h2 className="mt-3 text-2xl font-extrabold tracking-[-.05em] text-slate-900">AI-led WhatsApp conversations.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{whatsapp.enabled ? `Messages are connected through ${providerLabel}.` : 'Connect the Meta Cloud API to receive messages and let the shared AI agent respond automatically.'}</p></div><div className="flex flex-wrap items-center gap-2"><StatusBadge value={whatsapp.enabled ? 'Connected' : 'Setup required'} /><Link href="/whatsapp/agent" className="inline-flex h-9 items-center gap-2 rounded-md bg-[#16805c] px-3.5 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(22,128,92,.18)] transition hover:brightness-105">Configure AI agent <ArrowUpRight className="h-4 w-4" /></Link></div></div></section>

      <MetricGrid items={[{ label: 'Messages', value: stats?.messages || 0, detail: 'All stored WhatsApp messages' }, { label: 'Conversations', value: stats?.conversations || 0, detail: 'Customer threads' }, { label: 'Open', value: stats?.open_conversations || 0, detail: 'Needs attention' }, { label: 'Unread', value: stats?.unread_conversations || 0, detail: 'Waiting for review' }, { label: 'AI handled', value: stats?.ai_handled || 0, detail: 'AI enabled threads' }, { label: 'Human handled', value: stats?.human_handled || 0, detail: 'Human-owned threads' }]} />

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <section className="surface-panel rounded-[22px] p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldCheck className="h-4 w-4 text-[#16805c]" />Meta connection readiness</div><p className="mt-1 text-xs leading-5 text-slate-500">The Cloud API needs the access token and phone number ID before live delivery can start.</p></div><StatusBadge value={meta.ready ? 'Ready' : 'Setup required'} /></div><div className="mt-5 space-y-2.5"><CheckRow label="Access token" ready={Boolean(meta.access_token_configured)} detail="WHATSAPP_ACCESS_TOKEN or WHATSAPP_TOKEN" /><CheckRow label="Phone number ID" ready={Boolean(meta.phone_number_id_configured)} detail="WHATSAPP_PHONE_NUMBER_ID" /><CheckRow label="Verify token" ready={Boolean(meta.verify_token_configured)} detail="Required for Meta webhook verification" /><CheckRow label="Webhook route" ready={Boolean(meta.webhook_ready)} detail={meta.webhook_path || '/api/whatsapp/webhook'} /></div><div className="mt-5 flex flex-wrap gap-2"><Link href="/integrations" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"><Link2 className="h-4 w-4" />Open integrations</Link><ActionButton onClick={load} icon={<RefreshCw className="h-4 w-4" />}>Refresh status</ActionButton></div></section>
        <section className="surface-panel rounded-[22px] p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Bot className="h-4 w-4 text-[#5a67b1]" />WhatsApp AI agent</div><p className="mt-1 text-xs leading-5 text-slate-500">The WhatsApp agent uses the shared knowledge, tools, and policies used by Voice AI.</p></div><StatusBadge value={ai.enabled ? 'Active' : 'Needs setup'} /></div><div className="mt-5 rounded-2xl border border-[#d9def7] bg-[#f4f6ff] p-4"><div className="text-sm font-bold text-slate-900">{agent.name || 'WhatsApp Concierge'}</div><div className="mt-1 text-xs leading-5 text-slate-600">{agent.personality || 'Configured for customer conversations'}</div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/80 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Knowledge</div><div className="mt-1 text-xs font-semibold text-slate-700">{agent.knowledge_enabled ? 'Enabled' : 'Needs setup'}</div></div><div className="rounded-xl bg-white/80 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Auto reply</div><div className="mt-1 text-xs font-semibold text-slate-700">{whatsapp.enabled ? 'Ready after connection' : 'Waiting for connection'}</div></div></div></div><Link href="/whatsapp/agent" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#5a67b1] hover:underline">Review WhatsApp behavior <ArrowUpRight className="h-3.5 w-3.5" /></Link></section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <section className="surface-panel overflow-hidden rounded-[22px]"><div className="flex items-center justify-between border-b border-slate-200 p-5"><div><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><MessageSquare className="h-4 w-4 text-[#16805c]" />Recent conversations</div><p className="mt-1 text-xs text-slate-500">Latest customer threads from MongoDB.</p></div><Link href="/whatsapp/inbox" className="text-xs font-semibold text-[#16805c] hover:underline">Open inbox</Link></div><div className="divide-y divide-slate-100">{conversations.map((conversation) => <Link key={conversation._id} href="/whatsapp/inbox" className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e3f7ec] text-xs font-bold text-[#16805c]">{(conversation.customer_name || conversation.customer_phone || 'WA').slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{conversation.customer_name || conversation.customer_phone || 'Unknown customer'}</span><span className="mt-1 block truncate text-xs text-slate-500">{conversation.last_message || 'No message preview'}</span></span><span className="shrink-0 text-right"><span className="block text-[10px] text-slate-400">{formatDate(conversation.updated_at || conversation.last_message_at)}</span><span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">{conversation.message_count || 0} messages</span></span></Link>)}{!conversations.length && <div className="p-10 text-center"><MessageSquare className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-700">No WhatsApp conversations yet</p><p className="mt-1 text-xs text-slate-500">Once Meta delivers a message, the AI conversation will appear here.</p></div>}</div></section>
        <section className="surface-panel rounded-[22px] p-5"><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Webhook className="h-4 w-4 text-[#b45309]" />Delivery and handoff</div><div className="mt-5 space-y-3"><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-700">Inbound messages</span><span className="text-lg font-extrabold text-slate-900">{stats?.inbound_messages || 0}</span></div><div className="mt-1 text-[11px] text-slate-500">Received from customers</div></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-700">AI replies sent</span><span className="text-lg font-extrabold text-slate-900">{stats?.outbound_messages || 0}</span></div><div className="mt-1 text-[11px] text-slate-500">Generated through the shared AI layer</div></div><div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-4"><div className="text-xs font-bold text-[#b45309]">Human handoff</div><p className="mt-1 text-xs leading-5 text-slate-600">{summary?.operations?.human_handoff_enabled ? 'Enabled when a customer requests a person or the AI cannot safely resolve the conversation.' : 'Currently disabled.'}</p></div></div></section>
      </div>
    </DataState>
  </div>
}
