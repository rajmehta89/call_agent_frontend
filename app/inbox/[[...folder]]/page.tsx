'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AtSign, Hash, Loader2, MessageSquare, Pencil, PhoneCall, Search, Send, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, StatusBadge, userFacingError } from '../../../components/PlatformUI'

type Folder = 'all' | 'unassigned' | 'mine' | 'mentioned' | 'failed' | 'channel'
type Member = { id: string; name: string; email: string; role: string }
type Conversation = { _id: string; name: string; phone_number?: string; status?: string; when?: string; call_summary?: string; duration?: number; assigned_to?: string; assigned_to_name?: string; assigned_by_name?: string; failed?: boolean; disconnection_reason?: string }
type Line = { type?: string; content?: string; timestamp?: string }
type TeamMessage = { _id: string; author_id: string; author_name: string; text: string; mentions: string[]; mention_names?: string[]; conversation_id?: string; created_at: string; edited_at?: string; read_by?: string[] }
type Detail = Conversation & { transcription: Line[]; ai_responses: Line[]; recording_url?: string; discussion: TeamMessage[] }

// The sidebar links to /inbox/<folder>; see components/omni-data.ts.
const FOLDER_TITLES: Record<Folder, string> = { all: 'All Conversations', unassigned: 'Unassigned', mine: 'Assigned to You', mentioned: 'Mentioned', failed: 'Failed', channel: 'Team channel' }

/** Who is signed in and what they may do; shared by every message row and composer on the page. */
const Team = createContext<{ members: Member[]; me: string; canModerate: boolean }>({ members: [], me: '', canModerate: false })

/** Tell the sidebar to refresh its folder counts after anything that changes them. */
const countsChanged = () => window.dispatchEvent(new Event('inbox:changed'))

/** Browser-console trace for every inbox action; filter the console by "[inbox]". */
const log = (message: string, ...details: unknown[]) => console.info(`[inbox] ${message}`, ...details)

const when = (value?: string) => { if (!value) return ''; const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; const today = new Date().toDateString() === date.toDateString(); return today ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString([], { day: '2-digit', month: 'short' }) }
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'

export default function InboxPage() {
  const params = useParams<{ folder?: string[] }>()
  const router = useRouter()
  const slug = params.folder?.[0] as Folder | undefined
  const folder: Folder = slug && slug in FOLDER_TITLES ? slug : 'all'
  const [members, setMembers] = useState<Member[]>([])
  const [me, setMe] = useState('')
  const [canAssign, setCanAssign] = useState(false)
  const [rows, setRows] = useState<Conversation[]>([])
  const [mentions, setMentions] = useState<TeamMessage[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [selectedMention, setSelectedMention] = useState<TeamMessage | null>(null)

  useEffect(() => {
    log('loading team members')
    api('/api/inbox/members').then((result) => { setMembers(result.data || []); setMe(result.me); setCanAssign(Boolean(result.can_assign)); log(`members loaded: ${result.data?.length || 0}, can assign: ${result.can_assign}`) }).catch((error) => toast.error(userFacingError(error)))
  }, [])

  const openConversation = useCallback(async (id: string, quiet = false) => {
    setSelectedId(id)
    if (!quiet) log(`opening conversation ${id}`)
    try { setDetail((await api(`/api/inbox/conversations/${id}`)).data) } catch (error) { log(`conversation ${id} failed`, error); if (!quiet) toast.error(userFacingError(error)) }
  }, [])

  useEffect(() => {
    setDetail(null); setSelectedId(''); setSelectedMention(null)
    const open = new URLSearchParams(window.location.search).get('open')
    if (open && folder !== 'channel') openConversation(open)
  }, [folder, openConversation])

  // Keep the open conversation's team discussion current while teammates post, edit or delete.
  useEffect(() => {
    if (!detail?._id) return
    const timer = window.setInterval(() => openConversation(detail._id, true), 10000)
    return () => window.clearInterval(timer)
  }, [detail?._id, openConversation])

  const loadFolder = useCallback(async (quiet = false) => {
    if (folder === 'channel') return
    if (!quiet) { setLoading(true); log(`opening folder ${folder}`, { search }) }
    try {
      if (folder === 'mentioned') {
        const result = await api('/api/inbox/mentions')
        const next: TeamMessage[] = result.data || []
        setMentions(next)
        setSelectedMention((current) => current ? next.find((message) => message._id === current._id) || null : null)
        await api('/api/inbox/mentions/read', { method: 'POST' })
        countsChanged()
      } else {
        const result = await api(`/api/inbox/conversations?folder=${folder}&search=${encodeURIComponent(search)}`)
        setRows(result.data || [])
        if (!quiet) log(`folder ${folder}: ${result.data?.length || 0} conversations`)
      }
    } catch (error) { log(`folder ${folder} failed`, error); if (!quiet) toast.error(userFacingError(error)) } finally { setLoading(false) }
  }, [folder, search])

  useEffect(() => { const timer = window.setTimeout(loadFolder, 250); return () => window.clearTimeout(timer) }, [loadFolder])
  useEffect(() => { if (folder !== 'mentioned') return; const timer = window.setInterval(() => loadFolder(true), 10000); return () => window.clearInterval(timer) }, [folder, loadFolder])

  const assign = async (userId: string | null) => {
    if (!detail) return
    log(`assigning ${detail._id} to ${userId || 'nobody'}`)
    try {
      await api(`/api/inbox/conversations/${detail._id}/assign`, { method: 'POST', body: JSON.stringify({ user_id: userId }) })
      toast.success(userId ? `Assigned to ${members.find((member) => member.id === userId)?.name}` : 'Unassigned')
      await Promise.all([openConversation(detail._id), loadFolder()])
      countsChanged()
    } catch (error) { log('assign failed', error); toast.error(userFacingError(error)) }
  }

  const pickMention = (message: TeamMessage) => {
    log(`opening mention ${message._id}`)
    setSelectedMention(message)
    if (message.conversation_id) openConversation(message.conversation_id)
    else { setDetail(null); setSelectedId('') }
  }

  const team = { members, me, canModerate: canAssign }

  if (folder === 'channel') return <Team.Provider value={team}><TeamChannel onOpenConversation={(id) => router.push(`/inbox?open=${id}`)} /></Team.Provider>

  return <Team.Provider value={team}><div className="grid min-h-[calc(100vh-180px)] gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
    <section className="surface-panel flex min-h-0 flex-col overflow-hidden">
      <div className="border-b border-slate-200 p-3">
        <div className="text-sm font-bold text-slate-900">{FOLDER_TITLES[folder]}</div>
        {folder !== 'mentioned' && <div className="relative mt-3"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, number, summary..." className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 text-xs" /></div>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? <div className="flex items-center justify-center py-12 text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</div>
          : folder === 'mentioned' ? (mentions.length ? mentions.map((message) => <button key={message._id} type="button" onClick={() => pickMention(message)} className={`mb-1 w-full rounded-xl border p-3 text-left transition ${selectedMention?._id === message._id ? 'border-[#cfc7e8] bg-[#f1efff]' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}><div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-900">{message.author_name}</span><span className="text-slate-400">{when(message.created_at)}{message.edited_at ? ' · edited' : ''}</span></div><p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-600">{message.text}</p><span className={`mt-2 inline-block text-[10px] font-semibold ${message.conversation_id ? 'text-[#6d58eb]' : 'text-slate-400'}`}>{message.conversation_id ? 'On a conversation' : 'Team channel'}</span></button>) : <Empty text="Nobody has mentioned you yet." />)
          : rows.length ? rows.map((row) => <button key={row._id} type="button" onClick={() => openConversation(row._id)} className={`mb-1 w-full rounded-xl border p-3 text-left transition ${selectedId === row._id ? 'border-[#cfc7e8] bg-[#f1efff]' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}>
            <div className="flex items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${row.failed ? 'bg-rose-100 text-rose-600' : 'bg-slate-900 text-white'}`}>{initials(row.name)}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-slate-900">{row.name}</span><span className="shrink-0 text-[10px] text-slate-400">{when(row.when)}</span></span><span className="mt-0.5 block truncate text-xs text-slate-500">{row.call_summary || row.phone_number || 'No summary yet'}</span></span></div>
            <div className="mt-2 flex items-center justify-between text-[10px]"><StatusBadge value={row.status || 'unknown'} /><span className={row.assigned_to_name ? 'font-semibold text-slate-600' : 'text-slate-400'}>{row.assigned_to_name ? `→ ${row.assigned_to === me ? 'You' : row.assigned_to_name}` : 'Unassigned'}</span></div>
          </button>) : <Empty text="No conversations in this folder." />}
      </div>
    </section>

    <section className="surface-panel flex min-h-0 flex-col overflow-hidden">
      {detail ? <ConversationDetail detail={detail} canAssign={canAssign} onAssign={assign} onChanged={() => { openConversation(detail._id, true); if (folder === 'mentioned') loadFolder(true) }} />
        : selectedMention ? <ChannelMention message={selectedMention} onChanged={() => loadFolder(true)} />
        : <Empty text={folder === 'mentioned' ? 'Select a mention to read it in context and reply.' : 'Select a conversation to see the transcript, assign it, or discuss it with your team.'} />}
    </section>
  </div></Team.Provider>
}

function Empty({ text }: { text: string }) {
  return <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center"><MessageSquare className="h-7 w-7 text-slate-300" /><p className="mt-3 max-w-xs text-sm text-slate-500">{text}</p></div>
}

function ConversationDetail({ detail, canAssign, onAssign, onChanged }: { detail: Detail; canAssign: boolean; onAssign: (userId: string | null) => void; onChanged: () => void }) {
  const { members, me } = useContext(Team)
  const lines = useMemo(() => [...(detail.transcription || []), ...(detail.ai_responses || [])].filter((line) => line.content).sort((a, b) => new Date(a.timestamp || '').getTime() - new Date(b.timestamp || '').getTime()), [detail])
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <div className="min-w-0"><div className="flex items-center gap-2"><PhoneCall className="h-4 w-4 text-[#6d58eb]" /><span className="truncate text-base font-bold text-slate-900">{detail.name}</span><StatusBadge value={detail.status || 'unknown'} /></div><div className="mt-1 text-xs text-slate-500">{detail.phone_number} · {when(detail.when)}{detail.assigned_by_name && detail.assigned_to_name ? ` · assigned by ${detail.assigned_by_name}` : ''}</div></div>
      {canAssign ? <select value={detail.assigned_to || ''} onChange={(event) => onAssign(event.target.value || null)} aria-label="Assign conversation" className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="">Unassigned</option>{members.map((member) => <option key={member.id} value={member.id}>{member.id === me ? `${member.name} (you)` : member.name}</option>)}</select>
        : <span className="text-xs text-slate-500">{detail.assigned_to_name ? `Assigned to ${detail.assigned_to === me ? 'you' : detail.assigned_to_name}` : 'Unassigned — an admin will assign it'}</span>}
    </div>
    {detail.failed && <div className="border-b border-rose-100 bg-rose-50 px-5 py-2 text-xs text-rose-700">This call did not connect{detail.disconnection_reason ? ` (${detail.disconnection_reason})` : ''}.</div>}
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-5">
      {detail.call_summary && <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-800">Summary: </span>{detail.call_summary}</div>}
      {detail.recording_url && <audio className="w-full" controls src={detail.recording_url} />}
      {lines.length ? lines.map((line, index) => { const customer = line.type === 'user'; return <div key={index} className={`flex ${customer ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-6 ${customer ? 'bg-white text-slate-700 ring-1 ring-slate-200' : 'bg-[#6d58eb] text-white'}`}>{line.content}</div></div> }) : <p className="py-6 text-center text-xs text-slate-400">No transcript for this call.</p>}
    </div>
    <div className="border-t border-slate-200 p-4">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-slate-400">Team discussion · only your team sees this</div>
      <div className="mb-3 max-h-56 space-y-1 overflow-y-auto">{detail.discussion.map((message) => <MessageRow key={message._id} message={message} onChanged={onChanged} />)}</div>
      <Composer conversationId={detail._id} placeholder="Add a note — type @ to mention a teammate" onDone={onChanged} />
    </div>
  </>
}

/** Right pane for a mention made in the team channel: the message itself, plus a reply that goes back to the channel. */
function ChannelMention({ message, onChanged }: { message: TeamMessage; onChanged: () => void }) {
  const { members } = useContext(Team)
  const author = members.find((member) => member.id === message.author_id)
  return <>
    <div className="border-b border-slate-200 px-5 py-4"><div className="flex items-center gap-2 text-base font-bold text-slate-900"><AtSign className="h-4 w-4 text-[#6d58eb]" />{message.author_name} mentioned you</div><div className="mt-1 text-xs text-slate-500">In the team channel · {when(message.created_at)}</div></div>
    <div className="min-h-0 flex-1 overflow-y-auto p-5"><MessageRow message={message} onChanged={onChanged} /></div>
    <div className="border-t border-slate-200 p-4"><div className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-slate-400">Reply in team channel</div><Composer key={message._id} placeholder="Write a reply — type @ to mention" initialText={author ? `@${author.name} ` : ''} initialMentions={author ? [author] : []} onDone={onChanged} /></div>
  </>
}

function TeamChannel({ onOpenConversation }: { onOpenConversation: (id: string) => void }) {
  const { members } = useContext(Team)
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const bottom = useRef<HTMLDivElement>(null)
  const load = useCallback(() => api('/api/inbox/channel').then((result) => setMessages(result.data || [])).catch((error) => { log('channel load failed', error); toast.error(userFacingError(error)) }), [])
  useEffect(() => { log('opening team channel'); load(); const timer = window.setInterval(load, 8000); return () => window.clearInterval(timer) }, [load])
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [messages.length])
  return <section className="surface-panel flex h-full min-h-[calc(100vh-180px)] flex-col overflow-hidden">
    <div className="border-b border-slate-200 px-5 py-4"><div className="flex items-center gap-2 text-base font-bold text-slate-900"><Hash className="h-4 w-4 text-[#6d58eb]" />Team channel</div><div className="mt-1 text-xs text-slate-500">Shared by everyone in the workspace · {members.length} members · type @ to mention someone</div></div>
    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-5">{messages.length ? messages.map((message) => <MessageRow key={message._id} message={message} onChanged={load} onOpenConversation={onOpenConversation} />) : <Empty text="No messages yet. Say hello to your team." />}<div ref={bottom} /></div>
    <div className="border-t border-slate-200 p-4"><Composer placeholder="Message the team — type @ to mention" onDone={load} /></div>
  </section>
}

/** One team message. Authors can edit or delete it; admins can delete anyone's. Every view reads the same record, so changes show everywhere. */
function MessageRow({ message, onChanged, onOpenConversation }: { message: TeamMessage; onChanged: () => void; onOpenConversation?: (id: string) => void }) {
  const { members, me, canModerate } = useContext(Team)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const mine = message.author_id === me
  const mentionsMe = message.mentions?.includes(me) && !mine
  const names = message.mention_names || []
  const parts = names.length ? message.text.split(new RegExp(`(${names.map((name) => `@${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).join('|')})`, 'g')) : [message.text]

  const remove = async () => {
    if (!window.confirm('Delete this message for everyone?')) return
    setDeleting(true)
    log(`deleting message ${message._id}`)
    try { await api(`/api/inbox/channel/${message._id}`, { method: 'DELETE' }); toast.success('Message deleted'); onChanged(); countsChanged() }
    catch (error) { log('delete failed', error); toast.error(userFacingError(error)); setDeleting(false) }
  }

  return <div className={`group flex gap-3 rounded-xl p-2 ${mentionsMe ? 'bg-[#fff3d5]' : 'hover:bg-slate-50'} ${deleting ? 'opacity-50' : ''}`}>
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eeeaff] text-[11px] font-bold text-[#40347e]">{initials(message.author_name)}</span>
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline gap-2 text-xs"><span className="font-semibold text-slate-900">{mine ? 'You' : message.author_name}</span><span className="text-slate-400">{when(message.created_at)}{message.edited_at ? ' · edited' : ''}</span>
        {!editing && (mine || canModerate) && <span className="ml-auto flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          {mine && <button type="button" onClick={() => setEditing(true)} aria-label="Edit message" title="Edit" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-3.5 w-3.5" /></button>}
          <button type="button" onClick={remove} aria-label="Delete message" title="Delete" className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
        </span>}
      </div>
      {editing ? <div className="mt-1"><Composer editing={message} placeholder="Edit message" initialText={message.text} initialMentions={members.filter((member) => message.mentions?.includes(member.id))} onDone={() => { setEditing(false); onChanged() }} onCancel={() => setEditing(false)} /></div>
        : <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{parts.map((part, index) => part.startsWith('@') && names.includes(part.slice(1)) ? <span key={index} className="rounded bg-[#eeeaff] px-1 font-semibold text-[#40347e]">{part}</span> : part)}</p>}
      {message.conversation_id && onOpenConversation && !editing && <button type="button" onClick={() => onOpenConversation(message.conversation_id!)} className="mt-1 text-[11px] font-semibold text-[#6d58eb] hover:underline">Open linked conversation</button>}
    </div>
  </div>
}

/** Text box with @mention autocomplete, for new messages and edits. Mentions are sent as user ids; the backend notifies each person. */
function Composer({ conversationId, placeholder, onDone, editing, onCancel, initialText = '', initialMentions = [] }: { conversationId?: string; placeholder: string; onDone: () => void; editing?: TeamMessage; onCancel?: () => void; initialText?: string; initialMentions?: Member[] }) {
  const { members } = useContext(Team)
  const [text, setText] = useState(initialText)
  const [picked, setPicked] = useState<Member[]>(initialMentions)
  const [sending, setSending] = useState(false)
  const query = /(?:^|\s)@([\w.-]*)$/.exec(text)?.[1]
  const suggestions = query === undefined ? [] : members.filter((member) => member.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)

  const pick = (member: Member) => {
    setText((current) => current.replace(/@[\w.-]*$/, `@${member.name} `))
    setPicked((current) => current.some((item) => item.id === member.id) ? current : [...current, member])
    log(`mention picked: ${member.name}`)
  }

  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    const mentions = picked.filter((member) => body.includes(`@${member.name}`)).map((member) => member.id)
    setSending(true)
    try {
      if (editing) {
        log(`editing message ${editing._id}`, { mentions })
        await api(`/api/inbox/channel/${editing._id}`, { method: 'PUT', body: JSON.stringify({ text: body, mentions }) })
        toast.success('Message updated')
      } else {
        log('posting message', { conversationId, mentions })
        await api('/api/inbox/channel', { method: 'POST', body: JSON.stringify({ text: body, mentions, conversation_id: conversationId || null }) })
        setText(''); setPicked([])
      }
      onDone(); countsChanged()
    } catch (error) { log(editing ? 'edit failed' : 'post failed', error); toast.error(userFacingError(error)) } finally { setSending(false) }
  }

  return <div className="relative">
    {suggestions.length > 0 && <div className="absolute bottom-full left-0 z-10 mb-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">{suggestions.map((member) => <button key={member.id} type="button" onMouseDown={(event) => { event.preventDefault(); pick(member) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#eeeaff] text-[10px] font-bold text-[#40347e]">{initials(member.name)}</span><span className="flex-1 truncate">{member.name}</span><span className="text-[10px] capitalize text-slate-400">{member.role}</span></button>)}</div>}
    <div className="flex items-end gap-2">
      <textarea autoFocus={Boolean(editing)} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape' && onCancel) onCancel(); if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (suggestions.length) pick(suggestions[0]); else send() } }} rows={2} placeholder={placeholder} className="min-h-[44px] flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
      {onCancel && <button type="button" onClick={onCancel} aria-label="Cancel edit" title="Cancel (Esc)" className="action-button action-button-neutral inline-flex h-10 w-10 items-center justify-center rounded-md"><X className="h-4 w-4" /></button>}
      <button type="button" onClick={send} disabled={!text.trim() || sending} aria-label={editing ? 'Save' : 'Send'} title={editing ? 'Save (Enter)' : 'Send (Enter)'} className="action-button action-button-primary inline-flex h-10 w-10 items-center justify-center rounded-md disabled:opacity-40">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
    </div>
  </div>
}
