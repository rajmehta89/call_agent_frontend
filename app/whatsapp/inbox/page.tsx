'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Archive, Bot, Check, Download, FileText, MessageSquare, Send, UserRound, Users, Webhook } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { ActionButton, api, DataState, StatusBadge, Toolbar } from '@/components/PlatformUI'

type Conversation = { _id: string; customer_name?: string; customer_phone?: string; status?: string; last_message?: string; last_message_direction?: string; updated_at?: string; last_message_at?: string; unread_count?: number; message_count?: number; ai_enabled?: boolean; assigned_to?: string; tags?: string[]; notes?: string; lead?: { name?: string; email?: string; lead_id?: string } }
type Message = { _id: string; text?: string; direction?: string; status?: string; created_at?: string }

const formatTime = (value?: string) => { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
const formatDay = (value?: string) => { if (!value) return 'Unknown day'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Unknown day' : date.toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }) }
const initials = (name?: string) => (name || 'WA').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

function HandlingChoice({ active, icon: Icon, title, description, onClick }: { active: boolean; icon: any; title: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`w-full rounded-xl border p-3 text-left transition ${active ? 'border-[#bdebd0] bg-[#effaf4] shadow-sm' : 'border-slate-200 bg-white hover:border-[#cbd5e1] hover:bg-slate-50'}`}><div className="flex items-start gap-3"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-[#e3f7ec] text-[#16805c]' : 'bg-slate-100 text-slate-500'}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800">{title}</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">{description}</span></span>{active && <Check className="h-4 w-4 shrink-0 text-[#16805c]" />}</div></button>
}

export default function Inbox() {
  const [rows, setRows] = useState<Conversation[]>([])
  const [selected, setSelected] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [directionFilter, setDirectionFilter] = useState('all')
  const [draft, setDraft] = useState('')
  const [summary, setSummary] = useState<any>(null)
  const [team, setTeam] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const current = useMemo(() => rows.find((row) => row._id === selected), [rows, selected])
  const visible = useMemo(() => rows.filter((row) => {
    const haystack = `${row.customer_name || ''} ${row.customer_phone || ''} ${row.last_message || ''}`.toLowerCase()
    const matchesSearch = haystack.includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || (filter === 'unread' && (row.unread_count || 0) > 0) || (filter === 'ai' && row.ai_enabled !== false) || (filter === 'human' && row.ai_enabled === false) || row.status === filter
    const matchesDirection = directionFilter === 'all' || (row.last_message_direction || 'inbound') === directionFilter
    return matchesSearch && matchesFilter && matchesDirection
  }), [directionFilter, filter, rows, search])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [conversations, channelSummary, teamResult] = await Promise.all([api('/api/whatsapp/conversations?limit=200'), api('/api/omnichannel/summary'), api('/api/platform/team')])
      const nextRows = conversations.data || []
      setRows(nextRows)
      setSummary(channelSummary.data || {})
      setTeam(teamResult.data || [])
      setSelected((currentSelected) => currentSelected && nextRows.some((row: Conversation) => row._id === currentSelected) ? currentSelected : nextRows[0]?._id || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load WhatsApp conversations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (!selected) { setMessages([]); return }; api(`/api/whatsapp/conversations/${selected}/messages`).then((payload) => setMessages(payload.data || [])).catch(() => setMessages([])) }, [selected])

  const update = async (value: Record<string, any>) => {
    if (!current) return
    try { await api(`/api/whatsapp/conversations/${current._id}`, { method: 'PUT', body: JSON.stringify(value) }); await load(); toast.success('Conversation updated') } catch (err) { toast.error(err instanceof Error ? err.message : 'Conversation update failed') }
  }

  const send = async () => {
    if (!current || !draft.trim()) return
    try { await api('/api/whatsapp/messages', { method: 'POST', body: JSON.stringify({ to: current.customer_phone, text: draft.trim(), conversation_id: current._id }) }); setDraft(''); const payload = await api(`/api/whatsapp/conversations/${current._id}/messages`); setMessages(payload.data || []); await load(); toast.success('Message sent') } catch (err) { toast.error(err instanceof Error ? err.message : 'Message could not be sent') }
  }

  const exportTranscript = () => {
    if (!current) return
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(new Blob([messages.map((message) => `${message.direction || 'message'}: ${message.text || ''}`).join('\n')], { type: 'text/plain' }))
    anchor.download = `whatsapp-${current.customer_phone || 'conversation'}.txt`
    anchor.click()
    URL.revokeObjectURL(anchor.href)
  }

  const exportConversations = () => {
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const csv = [['Customer', 'Phone', 'Direction', 'Status', 'Handled by', 'Messages', 'Last activity'], ...visible.map((row) => [row.customer_name || 'Unknown customer', row.customer_phone || '', row.last_message_direction || 'inbound', row.status || 'open', row.ai_enabled === false ? row.assigned_to || 'Human team' : 'AI agent', row.message_count || 0, row.last_message_at || row.updated_at || ''])].map((line) => line.map(escape).join(',')).join('\n')
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    anchor.download = 'whatsapp-conversations.csv'
    anchor.click()
    URL.revokeObjectURL(anchor.href)
  }

  const meta = summary?.channels?.whatsapp?.meta || {}

  return <div className="space-y-6">
    <PageHeader title="WhatsApp inbox" description="Review customer questions, let the AI agent respond, or assign any conversation to a named human agent." actionLabel="WhatsApp overview" actionHref="/whatsapp" />
    <Toolbar search={search} onSearch={setSearch} onRefresh={load}><select aria-label="Conversation direction" value={directionFilter} onChange={(event) => setDirectionFilter(event.target.value)}><option value="all">All directions</option><option value="inbound">Inbound</option><option value="outbound">Outbound</option></select><select aria-label="Conversation filter" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">AI + human</option><option value="unread">Unread</option><option value="ai">AI active</option><option value="human">Human active</option><option value="closed">Closed</option><option value="archived">Archived</option></select><ActionButton onClick={exportConversations} icon={<Download className="h-4 w-4" />}>Export CSV</ActionButton>{current && <ActionButton onClick={exportTranscript} icon={<FileText className="h-4 w-4" />}>Export transcript</ActionButton>}</Toolbar>
    <DataState loading={loading} error={error} onRetry={load}>
      {!summary?.channels?.whatsapp?.enabled && <div className="flex items-start gap-3 rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-4 text-sm text-slate-700"><Webhook className="mt-0.5 h-4 w-4 shrink-0 text-[#b45309]" /><div><div className="font-semibold text-slate-900">Meta WhatsApp is not connected</div><div className="mt-1 text-xs leading-5 text-slate-600">The inbox is ready for customer threads, but live delivery requires the Meta access token and phone number ID.</div><Link href="/whatsapp" className="mt-2 inline-flex text-xs font-semibold text-[#b45309] hover:underline">Check connection readiness</Link></div></div>}
      <div className="grid min-h-[720px] gap-4 xl:grid-cols-[310px_minmax(420px,1fr)_310px]">
        <aside className="surface-panel flex min-h-[720px] flex-col overflow-hidden rounded-[22px]"><div className="border-b border-slate-200 px-4 py-4"><div className="flex items-center justify-between"><div><div className="text-sm font-bold text-slate-900">Customer conversations</div><div className="mt-1 text-xs text-slate-500">{visible.length} of {rows.length} threads</div></div><MessageSquare className="h-4 w-4 text-[#16805c]" /></div></div><div className="min-h-0 flex-1 overflow-y-auto p-2">{visible.map((row) => <button key={row._id} type="button" onClick={() => setSelected(row._id)} className={`mb-1 w-full rounded-xl border p-3 text-left transition ${selected === row._id ? 'border-[#bdebd0] bg-[#effaf4] shadow-sm' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">{initials(row.customer_name || row.customer_phone)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{row.customer_name || row.customer_phone || 'Unknown customer'}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{row.customer_phone || 'No phone number'}</span></span>{(row.unread_count || 0) > 0 && <span className="rounded-full bg-[#16805c] px-2 py-1 text-[10px] font-bold text-white">{row.unread_count}</span>}</div><div className="mt-3 flex items-center justify-between gap-2"><span className="max-w-[170px] truncate text-xs text-slate-500">{row.last_message || 'No message preview'}</span><StatusBadge value={row.ai_enabled === false ? `Human · ${row.assigned_to || 'team'}` : 'AI agent'} /></div></button>)}{!visible.length && <div className="px-3 py-12 text-center"><Users className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No conversations found</p><p className="mt-1 text-xs leading-5 text-slate-500">Customer questions will appear here after Meta delivers a message.</p></div>}</div></aside>
        <main className="surface-panel flex min-h-[720px] min-w-0 flex-col overflow-hidden rounded-[22px]">{current ? <><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e3f7ec] text-sm font-bold text-[#16805c]">{initials(current.customer_name || current.customer_phone)}</span><div className="min-w-0"><div className="truncate text-base font-bold text-slate-900">{current.customer_name || current.customer_phone}</div><div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500"><span>{current.customer_phone}</span>{current.lead?.name && <><span>·</span><span>{current.lead.name}</span></>}</div></div></div><div className="flex flex-wrap items-center gap-2"><StatusBadge value={current.ai_enabled === false ? `Human · ${current.assigned_to || 'team'}` : 'AI agent'} /><ActionButton onClick={() => update(current.ai_enabled === false ? { ai_enabled: true, assigned_to: '' } : { ai_enabled: false })} icon={current.ai_enabled === false ? <Bot className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}>{current.ai_enabled === false ? 'Return to AI' : 'Take over'}</ActionButton><ActionButton onClick={() => update({ status: 'archived' })} icon={<Archive className="h-3.5 w-3.5" />}>Archive</ActionButton></div></div><div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-3"><div><div className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">Customer conversation</div><div className="mt-1 text-xs text-slate-500">Inbound on the left · AI or human replies on the right</div></div><span className="text-xs text-slate-400">{messages.length} messages</span></div><div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="space-y-4">{messages.map((message, index) => { const previous = messages[index - 1]; const showDay = !previous || formatDay(previous.created_at) !== formatDay(message.created_at); const outbound = message.direction === 'outbound'; return <div key={message._id} className="space-y-3">{showDay && <div className="flex items-center gap-3 py-2"><span className="h-px flex-1 bg-slate-200" /><span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-white">{formatDay(message.created_at)}</span><span className="h-px flex-1 bg-slate-200" /></div>}<div className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[78%] rounded-2xl border px-4 py-3 shadow-sm ${outbound ? 'border-[#bdebd0] bg-[#effaf4]' : 'border-slate-200 bg-white'}`}><div className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${outbound ? 'bg-[#e3f7ec] text-[#16805c]' : 'bg-slate-100 text-slate-500'}`}>{outbound ? <Bot className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}</span><span className="text-xs font-bold text-slate-800">{outbound ? (current.ai_enabled === false ? current.assigned_to || 'Human agent' : 'AI agent') : current.customer_name || 'Customer'}</span></div><p className="mt-3 text-sm leading-6 text-slate-700">{message.text || 'No message text'}</p><div className="mt-2 text-[10px] text-slate-400">{formatTime(message.created_at)} · {message.status || 'stored'}</div></div></div></div> })}{!messages.length && <div className="flex min-h-72 items-center justify-center text-center"><div><MessageSquare className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No messages stored yet</p><p className="mt-1 text-xs text-slate-500">The next Meta-delivered customer message will appear here.</p></div></div>}</div></div><div className="border-t border-slate-200 p-4"><div className="flex gap-2"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') send() }} placeholder={current.ai_enabled === false ? 'Reply as a human agent…' : 'Send a message or take over…'} className="bg-white" /><ActionButton primary onClick={send} icon={<Send className="h-4 w-4" />}>Send</ActionButton></div><div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-400"><span>{current.ai_enabled === false ? `Human mode: ${current.assigned_to || 'select a team member'} is replying.` : 'AI mode: incoming messages use the shared WhatsApp AI agent.'}</span><span>{meta.ready ? 'Meta ready' : 'Meta setup required'}</span></div></div></> : <div className="flex flex-1 items-center justify-center p-8 text-center"><div><MessageSquare className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Select a customer conversation</p><p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">Choose a thread on the left to see the customer question and let AI or a human agent respond.</p></div></div>}</main>
        <aside className="space-y-4 xl:min-h-[720px]"><section className="surface-panel rounded-[22px] p-5"><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Users className="h-4 w-4 text-[#16805c]" />Conversation handling</div><p className="mt-1 text-xs leading-5 text-slate-500">Choose AI or the team member who owns this customer thread.</p>{current ? <div className="mt-4 space-y-2.5"><HandlingChoice active={current.ai_enabled !== false} icon={Bot} title="AI agent" description="The shared WhatsApp AI replies using your knowledge and tools." onClick={() => update({ ai_enabled: true, assigned_to: '' })} /><HandlingChoice active={current.ai_enabled === false} icon={UserRound} title="Human agent" description="A named team member takes over and sends replies manually." onClick={() => update({ ai_enabled: false })} />{current.ai_enabled === false && <label className="block"><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned team member</span><select value={current.assigned_to || ''} onChange={(event) => update({ ai_enabled: false, assigned_to: event.target.value })} className="mt-2 bg-white"><option value="">Select a human agent</option>{team.filter((member) => member.active !== false).map((member) => <option key={member._id} value={member.name}>{member.name} · {member.role || 'agent'}</option>)}</select></label>}</div> : <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">Select a conversation to choose AI or human handling.</div>}</section><section className="surface-panel rounded-[22px] p-5"><div className="text-sm font-bold text-slate-900">Customer profile</div>{current ? <div className="mt-5 space-y-5 text-sm"><div><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contact</div><div className="mt-2 font-semibold text-slate-800">{current.customer_name || 'Unknown customer'}</div><div className="mt-1 text-slate-600">{current.customer_phone}</div><div className="mt-1 text-xs text-slate-500">{current.lead?.email || 'No email available'}</div></div><div><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lead</div>{current.lead?.lead_id ? <Link href={`/leads/${current.lead.lead_id}`} className="mt-2 inline-flex items-center gap-1 font-semibold text-[#16805c] hover:underline">{current.lead.name || 'Open linked lead'} <ArrowUpRightIcon /></Link> : <div className="mt-2 text-xs text-slate-500">No linked lead yet.</div>}</div><label className="block"><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tags</span><input key={`${current._id}-tags`} defaultValue={(current.tags || []).join(', ')} onBlur={(event) => update({ tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} className="mt-2 bg-white" placeholder="Add tags separated by commas" /></label><label className="block"><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Notes</span><textarea key={`${current._id}-notes`} rows={4} defaultValue={current.notes || ''} onBlur={(event) => update({ notes: event.target.value })} className="mt-2 bg-white" placeholder="Add an internal note" /></label></div> : <div className="mt-5 text-xs text-slate-500">Select a conversation to view customer details.</div>}</section></aside>
      </div>
    </DataState>
  </div>
}

function ConversationActivityTable({ rows, selectedId, onOpen }: { rows: Conversation[]; selectedId: string; onOpen: (id: string) => void }) {
  return <section className="surface-panel overflow-hidden rounded-[22px]"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><div className="text-sm font-bold text-slate-900">Message activity</div><div className="mt-1 text-xs text-slate-500">{rows.length} matching conversations · newest first</div></div><MessageSquare className="h-4 w-4 text-[#16805c]" /></div><div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-[.12em] text-slate-400"><tr><th className="px-5 py-3">Customer</th><th className="px-3 py-3">Direction</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Handled by</th><th className="px-3 py-3">Messages</th><th className="px-5 py-3">Last activity</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.slice(0, 200).map((row) => { const human = row.ai_enabled === false; const inbound = (row.last_message_direction || 'inbound') === 'inbound'; return <tr key={row._id} onClick={() => onOpen(row._id)} className={`cursor-pointer transition hover:bg-slate-50 ${selectedId === row._id ? 'bg-[#effaf4]/70' : ''}`}><td className="px-5 py-3.5"><div className="font-semibold text-slate-800">{row.customer_name || row.customer_phone || 'Unknown customer'}</div><div className="mt-0.5 text-xs text-slate-500">{row.customer_phone || 'No phone number'}</div></td><td className="px-3 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${inbound ? 'bg-slate-100 text-slate-600' : 'bg-[#effaf4] text-[#16805c]'}`}>{inbound ? 'Inbound' : 'Outbound'}</span></td><td className="px-3 py-3.5"><StatusBadge value={row.status || 'open'} /></td><td className="px-3 py-3.5"><div className={`text-xs font-semibold ${human ? 'text-[#16805c]' : 'text-[#5a67b1]'}`}>{human ? row.assigned_to || 'Human team' : 'AI agent'}</div><div className="mt-0.5 text-[10px] text-slate-400">{human ? 'Human handling' : 'AI handling'}</div></td><td className="px-3 py-3.5 text-xs text-slate-600">{row.message_count || 0}</td><td className="px-5 py-3.5 text-xs text-slate-500">{formatTime(row.last_message_at || row.updated_at)}</td></tr> })}</tbody></table>{!rows.length && <div className="p-10 text-center text-sm text-slate-500">No conversations match the current filters.</div>}</div></section>
}

function ArrowUpRightIcon() { return <span aria-hidden="true">↗</span> }
