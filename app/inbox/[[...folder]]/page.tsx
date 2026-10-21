'use client'

import Link from 'next/link'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowDownUp, ArrowRightLeft, AtSign, Bot, Check, ChevronDown, ChevronRight, ChevronUp, CalendarDays, Clock, Copy, Globe, Hash, PhoneIncoming, Headphones, Loader2, Lock, Maximize2, MessageSquare, Minimize2, MoreVertical, StickyNote, PanelRightOpen, Pencil, PhoneCall, PhoneMissed, Sparkles, Plus, Radio, RotateCcw, Search, Send, SlidersHorizontal, Trash2, UserMinus, UserPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, roleLabel, userFacingError } from '../../../components/PlatformUI'
import { STAGES, stageInfo } from '../../../components/stages'

type Folder = 'all' | 'unassigned' | 'mine' | 'assigned' | 'mentioned' | 'failed' | 'channel'
type Member = { id: string; name: string; email: string; role: string; assignable: boolean }
/** One caller's thread: every call from them, newest activity first in the list. */
type Conversation = { key: string; name: string; phone?: string; status?: string; last_at?: string; preview?: string; summary?: string; call_count: number; provider?: string; failed?: boolean; live?: boolean; closed?: boolean; closed_by_name?: string; assigned_to?: string; assigned_to_name?: string; assigned_by_name?: string; stage?: string; stage_by_name?: string }
type Line = { role: 'customer' | 'agent'; text: string; at?: string }
type CallEntry = { id: string; at: string; phone?: string; status: string; live: boolean; failed: boolean; provider: string; channel_type?: string; duration: number; summary?: string; recording_url?: string; disconnection_reason?: string; messages: Line[] }
type TeamMessage = { _id: string; author_id: string; author_name: string; text: string; mentions: string[]; mention_names?: string[]; conversation_id?: string; created_at: string; edited_at?: string; read_by?: string[] }
type ThreadEvent = { type: string; text: string; by_name?: string; at: string }
type Profile = { name?: string; email?: string; company?: string; address?: string; tags?: string[]; source?: string; lead_status?: string; created_at?: string; notes?: string; lead_id?: string }
type Detail = Conversation & { calls: CallEntry[]; discussion: TeamMessage[]; events?: ThreadEvent[]; profile?: Profile }
type ListFilter = 'all' | 'live' | 'assigned' | 'unassigned' | 'missed'

// The sidebar links to /inbox/<folder> and /inbox/status/<stage>; see components/omni-data.ts.
const FOLDER_TITLES: Record<Folder, string> = { all: 'All Conversations', unassigned: 'Unassigned', mine: 'Assigned to You', assigned: 'Assigned', mentioned: 'Mentioned', failed: 'Failed', channel: 'Team channel' }
const FILTERS: { id: ListFilter; label: string; test: (row: Conversation) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'live', label: 'Live', test: (row) => Boolean(row.live) },
  { id: 'unassigned', label: 'Unassigned', test: (row) => !row.assigned_to },
  { id: 'assigned', label: 'Assigned', test: (row) => Boolean(row.assigned_to) },
  { id: 'missed', label: 'Missed', test: (row) => Boolean(row.failed) },
]

/** Who is signed in and what they may do; shared by every message row and composer on the page. */
const Team = createContext<{ members: Member[]; me: string; canModerate: boolean }>({ members: [], me: '', canModerate: false })

/** Tell the sidebar to refresh its folder counts after anything that changes them. */
const countsChanged = () => window.dispatchEvent(new Event('inbox:changed'))

/** Browser-console trace for every inbox action; filter the console by "[inbox]". */
const log = (message: string, ...details: unknown[]) => console.info(`[inbox] ${message}`, ...details)

const asDate = (value?: string) => { const date = new Date(value || ''); return Number.isNaN(date.getTime()) ? null : date }
/** List timestamps like Podium: "now", "5m", "11h", "Sep 24", "Sep 24, 2025". */
const ago = (value?: string) => {
  const date = asDate(value); if (!date) return ''
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }) })
}
const when = ago
const clock = (value?: string) => asDate(value)?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) || ''
const fullDate = (value?: string) => asDate(value)?.toLocaleString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) || ''
const shortDate = (value?: string) => asDate(value)?.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) || ''
/** Day separator in the timeline: "Today", "Yesterday", "Friday, May 29". */
const dayLabel = (date: Date) => {
  const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', ...(date.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }) })
}
/** Calls grouped by local day, newest day and newest call first (Overview tab). */
const summaryDays = (calls: CallEntry[]) => {
  const days: { day: string; calls: CallEntry[] }[] = []
  ;[...calls].sort((a, b) => (asDate(b.at)?.getTime() || 0) - (asDate(a.at)?.getTime() || 0)).forEach((call) => {
    const day = asDate(call.at)?.toDateString(); if (!day) return
    const group = days.find((item) => item.day === day)
    if (group) group.calls.push(call); else days.push({ day, calls: [call] })
  })
  return days
}
const duration = (seconds = 0) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
const providerLabel = (provider?: string) => provider === 'retell' ? 'Retell AI' : provider === 'custom_twilio' ? 'Custom voice AI' : 'AI agent'
const encodeKey = (key: string) => encodeURIComponent(key)
const initials = (name = '') => name.replace(/^\+/, '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'
const callTitle = (call: CallEntry) => call.live ? 'Live call' : call.status === 'missed' || call.status === 'no-answer' ? 'Missed Call' : call.failed ? 'Failed Call' : 'Call Completed'
const rowPreview = (row: Conversation) => row.live ? 'On a call now…' : row.failed ? 'Call did not connect' : row.preview || 'Call Completed'
const copy = (text: string, what: string) => { navigator.clipboard?.writeText(text).then(() => toast.success(`${what} copied`)).catch(() => toast.error('Could not copy')) }

export default function InboxPage() {
  const params = useParams<{ folder?: string[] }>()
  const router = useRouter()
  const slug = params.folder?.[0] as Folder | undefined
  // /inbox/status/<stage> (sidebar STATUS group): every conversation in that pipeline stage.
  const stage = (slug as string) === 'status' && STAGES.some((item) => item.id === params.folder?.[1]) ? params.folder![1] : ''
  const folder: Folder = slug && slug in FOLDER_TITLES ? slug : 'all'
  const [members, setMembers] = useState<Member[]>([])
  const [me, setMe] = useState('')
  const [canAssign, setCanAssign] = useState(false)
  const [rows, setRows] = useState<Conversation[]>([])
  const [mentions, setMentions] = useState<TeamMessage[]>([])
  const [search, setSearch] = useState('')
  const [closedTab, setClosedTab] = useState(false)
  const [newestFirst, setNewestFirst] = useState(true)
  const [listFilter, setListFilter] = useState<ListFilter>('all')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [selectedMention, setSelectedMention] = useState<TeamMessage | null>(null)
  const shortcuts = useRef<(event: KeyboardEvent) => void>(() => {})
  useEffect(() => { const onKey = (event: KeyboardEvent) => shortcuts.current(event); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [])
  const selectedRef = useRef('')  // read inside loadFolder without reloading the list on every selection
  useEffect(() => { selectedRef.current = selectedId }, [selectedId])
  // Contact panel open/closed and wide/narrow are remembered per browser.
  const [showContact, setShowContact] = useState(true)
  const [wideContact, setWideContact] = useState(false)
  useEffect(() => { try { setShowContact(window.localStorage.getItem('relaydesk_contact_panel') !== 'closed') } catch {} }, [])
  const toggleContact = (open: boolean) => { setShowContact(open); log(`contact details ${open ? 'opened' : 'closed'}`); try { window.localStorage.setItem('relaydesk_contact_panel', open ? 'open' : 'closed') } catch {} }

  useEffect(() => {
    log('loading team members')
    api('/api/inbox/members').then((result) => { setMembers(result.data || []); setMe(result.me); setCanAssign(Boolean(result.can_assign)); log(`members loaded: ${result.data?.length || 0}, can assign: ${result.can_assign}`) }).catch((error) => toast.error(userFacingError(error)))
  }, [])

  const openConversation = useCallback(async (id: string, quiet = false) => {
    setSelectedId(id)
    if (!quiet) log(`opening conversation ${id}`)
    try { setDetail((await api(`/api/inbox/conversations/${encodeKey(id)}`)).data); if (!quiet) countsChanged() /* opening it reads its notifications */ } catch (error) { log(`conversation ${id} failed`, error); if (!quiet) toast.error(userFacingError(error)) }
  }, [])

  useEffect(() => {
    setDetail(null); setSelectedId(''); setSelectedMention(null)
    const open = new URLSearchParams(window.location.search).get('open')
    if (open && folder !== 'channel') openConversation(open)
  }, [folder, stage, closedTab, openConversation])

  // The header's notification bell asks to open a conversation (see GlobalHeader).
  useEffect(() => {
    const onOpen = (event: Event) => { const key = (event as CustomEvent<string>).detail; if (key) openConversation(key) }
    window.addEventListener('inbox:open', onOpen)
    return () => window.removeEventListener('inbox:open', onOpen)
  }, [openConversation])

  // Keep the open thread current: every 3s while a call is live, otherwise every 10s.
  useEffect(() => {
    if (!detail?.key) return
    const timer = window.setInterval(() => openConversation(detail.key, true), detail.live ? 3000 : 10000)
    return () => window.clearInterval(timer)
  }, [detail?.key, detail?.live, openConversation])

  const loadFolder = useCallback(async (quiet = false) => {
    if (folder === 'channel') return
    if (!quiet) { setLoading(true); log(`opening folder ${folder}`, { stage, search, closed: closedTab }) }
    try {
      if (folder === 'mentioned') {
        const result = await api('/api/inbox/mentions')
        const next: TeamMessage[] = result.data || []
        setMentions(next)
        setSelectedMention((current) => current ? next.find((message) => message._id === current._id) || null : null)
        // Desktop: open the newest mention straight away, like the other folders.
        if (!quiet && next[0] && !selectedRef.current && window.matchMedia('(min-width: 1024px)').matches) pickMention(next[0])
        await api('/api/inbox/mentions/read', { method: 'POST' })
        countsChanged()
      } else {
        const state = folder === 'assigned' ? 'open' : closedTab ? 'closed' : 'open'
        const result = await api(`/api/inbox/conversations?folder=${folder}&stage=${stage}&state=${state}&search=${encodeURIComponent(search)}`)
        setRows(result.data || [])
        if (!quiet) log(`folder ${folder}${stage ? ` / status ${stage}` : ''} (${state}): ${result.data?.length || 0} conversations`)
        // Like Podium: with nothing open yet, open the first (newest) conversation in the list.
        const first = result.data?.[0]?.key
        // Desktop only: on a phone the list comes first and a tap opens the conversation full screen.
        if (!quiet && first && !selectedRef.current && folder !== 'assigned' && window.matchMedia('(min-width: 1024px)').matches) { log(`opening first conversation ${first}`); openConversation(first) }
      }
    } catch (error) { log(`folder ${folder} failed`, error); if (!quiet) toast.error(userFacingError(error)) } finally { setLoading(false) }
  }, [folder, stage, search, closedTab, openConversation])

  useEffect(() => { const timer = window.setTimeout(loadFolder, 250); return () => window.clearTimeout(timer) }, [loadFolder])
  // Refresh the list too, so new calls, live badges and mentions appear without reloading.
  useEffect(() => { if (folder === 'channel') return; const timer = window.setInterval(() => loadFolder(true), 10000); return () => window.clearInterval(timer) }, [folder, loadFolder])

  // Live updates (components/realtime.ts): reload the list and the open conversation as soon as anything changes.
  const openKey = detail?.key
  useEffect(() => {
    const onRefresh = () => { loadFolder(true); if (openKey) openConversation(openKey, true) }
    window.addEventListener('inbox:refresh', onRefresh)
    return () => window.removeEventListener('inbox:refresh', onRefresh)
  }, [loadFolder, openConversation, openKey])

  /** Hand a conversation to a team member (or take it back with null). Used by the Assign chip and the Assigned list. */
  const assignThread = async (key: string, userId: string | null): Promise<boolean> => {
    log(`assigning ${key} to ${userId || 'nobody'}`)
    try {
      await api(`/api/inbox/conversations/${encodeKey(key)}/assign`, { method: 'POST', body: JSON.stringify({ user_id: userId }) })
      toast.success(userId ? `Sent to ${members.find((member) => member.id === userId)?.name}` : 'Moved back to Unassigned')
      await Promise.all([detail?.key === key ? openConversation(key, true) : Promise.resolve(), loadFolder(true)])
      countsChanged()
      return true
    } catch (error) { log('assign failed', error); toast.error(userFacingError(error)); return false }
  }
  const assign = (userId: string | null) => { if (detail) assignThread(detail.key, userId) }

  /** Move the open conversation to another pipeline stage (admins, or the team member it is assigned to). */
  const changeStage = async (next: string) => {
    if (!detail || next === detail.stage) return
    log(`moving ${detail.key} to status ${next}`)
    try {
      await api(`/api/inbox/conversations/${encodeKey(detail.key)}/stage`, { method: 'POST', body: JSON.stringify({ stage: next }) })
      toast.success(`Moved to ${stageInfo(next).label}`)
      await Promise.all([openConversation(detail.key, true), loadFolder(true)])
      countsChanged()
    } catch (error) { log('status change failed', error); toast.error(userFacingError(error)) }
  }

  /** Close the open conversation (it leaves the Open tab until the caller calls again) or reopen it. */
  const setClosed = async (closed: boolean) => {
    if (!detail) return
    log(`${closed ? 'closing' : 'reopening'} ${detail.key}`)
    try {
      await api(`/api/inbox/conversations/${encodeKey(detail.key)}/close`, { method: 'POST', body: JSON.stringify({ closed }) })
      toast.success(closed ? 'Conversation closed' : 'Conversation reopened')
      await Promise.all([openConversation(detail.key, true), loadFolder(true)])
      countsChanged()
    } catch (error) { log('close failed', error); toast.error(userFacingError(error)) }
  }

  const pickMention = (message: TeamMessage) => {
    log(`opening mention ${message._id}`)
    setSelectedMention(message)
    if (message.conversation_id) openConversation(message.conversation_id)
    else { setDetail(null); setSelectedId('') }
  }

  const team = { members, me, canModerate: canAssign }
  const canWork = Boolean(detail && (canAssign || detail.assigned_to === me))

  if (folder === 'channel') return <Team.Provider value={team}><TeamChannel onOpenConversation={(id) => router.push(`/inbox?open=${encodeKey(id)}`)} /></Team.Provider>

  const filtered = rows.filter(FILTERS.find((item) => item.id === listFilter)!.test)
  const shown = newestFirst ? filtered : [...filtered].reverse()
  const contactOpen = Boolean(detail && showContact && folder !== 'assigned')
  // Podium layout: conversation list | conversation | contact sheet, joined into one surface.
  const columns = folder === 'assigned' ? 'lg:grid-cols-[420px_minmax(0,1fr)]'
    : contactOpen ? `lg:grid-cols-[340px_minmax(0,1fr)] ${wideContact ? '2xl:grid-cols-[340px_minmax(0,1fr)_480px]' : '2xl:grid-cols-[340px_minmax(0,1fr)_380px]'}`
    : 'lg:grid-cols-[340px_minmax(0,1fr)]'
  const title = stage ? stageInfo(stage).label : FOLDER_TITLES[folder]
  // Keyboard: J/K or arrows move through the list, E closes or reopens, / searches (not while typing).
  shortcuts.current = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement
    if (event.metaKey || event.ctrlKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(target.tagName) || target.isContentEditable) return
    if (event.key === '/') { event.preventDefault(); document.getElementById('inbox-search')?.focus(); return }
    if (['j', 'k', 'ArrowDown', 'ArrowUp'].includes(event.key) && shown.length && folder !== 'mentioned' && folder !== 'assigned') {
      event.preventDefault()
      const index = shown.findIndex((row) => row.key === selectedId)
      const next = shown[Math.min(Math.max(index + (event.key === 'j' || event.key === 'ArrowDown' ? 1 : -1), 0), shown.length - 1)]
      if (next && next.key !== selectedId) openConversation(next.key)
      return
    }
    if (event.key === 'e' && detail && canWork) { event.preventDefault(); setClosed(!detail.closed) }
  }
  // Below lg one pane at a time, like Podium's app: the list, or the open conversation with a Back button.
  const reading = Boolean(detail || selectedMention)
  const back = () => { setDetail(null); setSelectedId(''); setSelectedMention(null); log('back to the list') }

  // Three floating cards on the white canvas (list | conversation | contact), as in the RelayDesk inbox concept.
  const card = 'min-h-0 overflow-hidden rounded-2xl border border-[#E9DFFF] bg-white shadow-[0_18px_40px_-34px_rgba(70,35,117,.55)]'
  return <Team.Provider value={team}><div className={`grid h-[calc(100dvh-88px)] gap-3 lg:h-[calc(100vh-150px)] ${columns}`}>
    <section className={`${reading ? 'hidden lg:flex' : 'flex'} ${card} flex-col`}>
      <div className="px-4 pb-2 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex min-w-0 items-center gap-2 truncate text-xl font-extrabold tracking-tight text-slate-900">{stage && <StageIcon stage={stage} />}{title}</h2>
          <Link href="/voice/browser-test" title="Start a test call" aria-label="Start a test call" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6C3BFF] text-white shadow-[0_10px_22px_-12px_rgba(108,59,255,.9)] transition hover:brightness-110"><Pencil className="h-4 w-4" /></Link>
        </div>
        {folder !== 'mentioned' && <>
          <div className="mt-3 flex gap-2">
            <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="inbox-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search callers…" className="h-10 w-full rounded-xl border border-[#E9DFFF] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#6C3BFF]" /></div>
            {folder !== 'assigned' && <div className="w-[124px] shrink-0"><MenuButton icon={<ArrowDownUp className="h-4 w-4" />} label={newestFirst ? 'Newest' : 'Oldest'} options={[{ id: 'newest', label: 'Newest first' }, { id: 'oldest', label: 'Oldest first' }]} value={newestFirst ? 'newest' : 'oldest'} onPick={(id) => setNewestFirst(id === 'newest')} /></div>}
          </div>
          {folder !== 'assigned' && <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Quick filters">{FILTERS.map((item) => { const count = rows.filter(item.test).length; const active = listFilter === item.id; return <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => { setListFilter(item.id); log(`filter ${item.id}`) }} disabled={!count && item.id !== 'all' && !active}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition disabled:opacity-40 ${active ? 'border-transparent bg-gradient-to-r from-[#8B5CF6] to-[#6C3BFF] text-white shadow-[0_8px_18px_-10px_rgba(108,59,255,.9)]' : 'border-[#E9DFFF] bg-white text-slate-600 hover:border-[#6C3BFF] hover:text-[#5A2BE6]'}`}>{item.id === 'live' && count > 0 && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8B5CF6]" />}{item.label}<span className={`rounded-full px-1.5 text-[11px] ${active ? 'bg-white/25 text-white' : 'text-slate-400'}`}>{count}</span></button> })}</div>}
        </>}
      </div>
      {folder !== 'mentioned' && folder !== 'assigned' && <div className="keep-cols mx-4 grid grid-cols-2 border-b border-[#E9DFFF] text-center text-sm font-semibold">
        {[false, true].map((closed) => <button key={String(closed)} type="button" onClick={() => setClosedTab(closed)} className={`-mb-px border-b-2 py-2.5 transition ${closedTab === closed ? 'border-[#6C3BFF] text-[#5A2BE6]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{closed ? 'Closed' : 'Open'}{closedTab === closed && !loading && <span className="ml-1.5 text-xs font-medium text-slate-400">{rows.length}</span>}</button>)}
      </div>}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {loading ? <div className="flex items-center justify-center py-12 text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</div>
          : folder === 'mentioned' ? (mentions.length ? mentions.map((message) => { const selected = selectedMention?._id === message._id; const unread = !message.read_by?.includes(me); return <button key={message._id} type="button" onClick={() => pickMention(message)} className={`mb-1 flex w-full gap-3 rounded-xl px-3 py-3 text-left transition ${selected ? 'bg-gradient-to-r from-[#F1EBFF] to-[#F8F5FF] shadow-[inset_3px_0_0_#6C3BFF]' : 'hover:bg-[#F8F5FF]'}`}>
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#5A2BE6] text-[13px] font-bold text-white">{initials(message.author_name)}{unread && !selected && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#9747FF]" />}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-1.5"><span className="truncate text-[15px] font-bold text-slate-900">{message.author_name}</span><span className="shrink-0 text-xs text-slate-400">{ago(message.created_at)}{message.edited_at ? ' · edited' : ''}</span></span>
              <span className="mt-0.5 line-clamp-2 block text-sm text-slate-600">{message.text}</span>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-[#F1EBFF] px-2 py-0.5 text-[11px] font-semibold text-[#5A2BE6]">{message.conversation_id ? <><MessageSquare className="h-3 w-3" />On a conversation</> : <><Hash className="h-3 w-3" />Team channel</>}</span>
            </span>
          </button> }) : <Empty text="Nobody has mentioned you yet. When a teammate types @ and your name, it shows up here." />)
          : folder === 'assigned' ? <AssignedList rows={rows} selectedId={selectedId} onOpen={openConversation} onAssign={assignThread} />
          : shown.length ? shown.map((row) => <ConversationRow key={row.key} row={row} selected={selectedId === row.key} onOpen={() => openConversation(row.key)} />)
          : <Empty text={closedTab ? 'No closed conversations here.' : stage ? `No open conversations in ${stageInfo(stage).label}. Change a conversation's status to move it here.` : listFilter !== 'all' ? 'Nothing matches this filter.' : EMPTY_TEXT[folder] || 'No conversations in this folder.'} />}
      </div>
    </section>

    <section className={`${reading ? 'flex' : 'hidden lg:flex'} ${card} min-w-0 flex-col`}>
      {reading && <button type="button" onClick={back} className="flex items-center gap-1 border-b border-[#E9DFFF] px-4 py-2.5 text-left text-sm font-semibold text-[#5A2BE6] lg:hidden"><ChevronRight className="h-4 w-4 rotate-180" />{title}</button>}
      {detail ? <ConversationDetail detail={detail} canAssign={canAssign} canWork={canWork} onAssign={assign} onStage={changeStage} onClose={setClosed}
          contactHidden={!contactOpen && folder !== 'assigned'} onToggleContact={() => toggleContact(!showContact)}
          onChanged={() => { openConversation(detail.key, true); if (folder === 'mentioned') loadFolder(true) }} />
        : selectedMention ? <ChannelMention message={selectedMention} onChanged={() => loadFolder(true)} />
        : <Empty text={folder === 'mentioned' ? 'Select a mention to read it in context and reply.' : 'Select a conversation to see the transcript, assign it, or discuss it with your team.'} />}
    </section>

    {contactOpen && detail && <ContactPanel detail={detail} editable={canWork} wide={wideContact} onWide={() => setWideContact(!wideContact)} onStage={changeStage} onClose={() => toggleContact(false)} onSaved={() => { openConversation(detail.key, true); loadFolder(true) }} />}
  </div></Team.Provider>
}

const EMPTY_TEXT: Partial<Record<Folder, string>> = {
  assigned: 'Nothing is assigned yet. Open a conversation from Unassigned, then pick a team member in the Assign box at the top right.',
  mine: 'Nothing is assigned to you yet. An admin assigns conversations from Unassigned.',
  unassigned: 'Every conversation has an owner.',
  failed: 'No failed calls.',
}

/** Small dropdown used for Filters and sort order in the list header. */
function MenuButton({ icon, label, options, value, onPick }: { icon: React.ReactNode; label: string; options: { id: string; label: string }[]; value: string; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  return <div className="relative">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex h-9 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition hover:border-[#6C3BFF]">
      <span className="text-slate-500">{icon}</span><span className="flex-1 truncate text-left">{label}</span><ChevronDown className="h-4 w-4 text-slate-400" />
    </button>
    {open && <>
      <button type="button" aria-label="Close" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
      <div className="absolute left-0 right-0 top-[40px] z-20 overflow-hidden rounded-xl border border-[#E9DFFF] bg-white py-1 shadow-lg">{options.map((option) => <button key={option.id} type="button" onClick={() => { setOpen(false); onPick(option.id) }} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition hover:bg-[#F8F5FF] ${option.id === value ? 'font-semibold text-[#5A2BE6]' : 'text-slate-700'}`}><span className="flex-1">{option.label}</span>{option.id === value && <Check className="h-4 w-4 text-[#6C3BFF]" />}</button>)}</div>
    </>}
  </div>
}

/** A conversation in the list: caller avatar (live dot while on a call), name and time, last line, status and owner pills, call-state icon on the right. */
function ConversationRow({ row, selected, onOpen }: { row: Conversation; selected: boolean; onOpen: () => void }) {
  const CallIcon = row.live ? Radio : row.failed ? PhoneMissed : PhoneCall
  return <button type="button" onClick={onOpen} aria-current={selected || undefined} className={`relative flex w-full gap-3 border-b border-[#F1EBFF] px-3 py-3.5 text-left transition last:border-b-0 ${selected ? 'rounded-xl border-transparent bg-gradient-to-r from-[#F1EBFF] to-[#F8F5FF] shadow-[inset_3px_0_0_#6C3BFF]' : 'hover:rounded-xl hover:bg-[#F8F5FF]'}`}>
    <span className="relative mt-0.5 shrink-0">
      <span className={`flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-bold ${row.failed ? 'bg-[#F1EBFF] text-[#6C3BFF] ring-1 ring-[#E9DFFF]' : 'bg-gradient-to-br from-[#8B5CF6] to-[#5A2BE6] text-white'}`}>{initials(row.name)}</span>
      {row.live && <span title="On a call now" className="absolute bottom-0 right-0 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-[#9747FF]" />}
    </span>
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-1.5"><span className="truncate text-[15px] font-bold text-slate-900">{row.name}</span>{row.live && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#9747FF]" />}<span className="shrink-0 text-xs text-slate-400">{ago(row.last_at)}</span></span>
      <span className="mt-0.5 block truncate text-[13px] text-slate-500">{rowPreview(row)}</span>
      <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        {row.live ? <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-[#8B5CF6] to-[#6C3BFF] px-2 py-0.5 font-bold text-white"><Radio className="h-3 w-3" />Live</span>
          : row.failed ? <span className="inline-flex items-center gap-1 rounded-md bg-[#6C3BFF] px-2 py-0.5 font-bold text-white"><PhoneMissed className="h-3 w-3" />Missed</span> : null}
        <span className="inline-flex items-center gap-1 rounded-md bg-[#F1EBFF] px-2 py-0.5 font-semibold text-[#5A2BE6]"><StageIcon stage={row.stage} small />{stageInfo(row.stage).label}</span>
        <span title={row.assigned_to_name ? `Assigned to ${row.assigned_to_name}` : undefined} className="max-w-[9rem] truncate rounded-md border border-[#E9DFFF] bg-white px-2 py-0.5 font-medium text-slate-500">{row.assigned_to_name || 'Unassigned'}</span>
        {row.call_count > 1 && <span className="text-slate-400">{row.call_count} calls</span>}
      </span>
    </span>
    <span aria-hidden="true" className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-white text-[#6C3BFF]' : 'bg-[#F8F5FF] text-[#8B5CF6]'}`}><CallIcon className={`h-4 w-4 ${row.live ? 'animate-pulse' : ''}`} /></span>
  </button>
}

/** Assigned folder: one section per team member (including those with nothing yet), their conversations underneath.
    Admins send conversations from here: "Assign conversation" per member, and Move / Unassign per conversation. */
function AssignedList({ rows, selectedId, onOpen, onAssign }: { rows: Conversation[]; selectedId: string; onOpen: (key: string) => void; onAssign: (key: string, userId: string | null) => Promise<boolean> }) {
  const { members } = useContext(Team)
  const [picking, setPicking] = useState('')  // member id whose "Assign conversation" list is open
  const [liveOnly, setLiveOnly] = useState(false)
  const teamMembers = members.filter((member) => member.assignable)
  const known = new Set(teamMembers.map((member) => member.id))
  const others = rows.filter((row) => row.assigned_to && !known.has(row.assigned_to))  // e.g. someone since deactivated
  const shown = liveOnly ? rows.filter((row) => row.live) : rows
  const groups = [...teamMembers.map((member) => ({ id: member.id, name: member.name, email: member.email, rows: shown.filter((row) => row.assigned_to === member.id) })),
    ...(others.length ? [{ id: 'others', name: 'No longer on the team', email: 'Move these to someone else', rows: others }] : [])]
  const live = rows.filter((row) => row.live).length

  if (!teamMembers.length) return <Empty text="No team members yet. Invite one in Settings → Team, then send them conversations from here." />
  return <div className="space-y-3 p-1">
    <div className="keep-cols grid grid-cols-3 gap-2">
      <SummaryCard label="Assigned" hint="conversations handed out" value={rows.length} active={!liveOnly} onClick={() => setLiveOnly(false)} />
      <SummaryCard label="Team members" hint="who can receive them" value={teamMembers.length} />
      <SummaryCard label="On a call" hint={live ? 'show only these' : 'nobody right now'} value={live} active={liveOnly} onClick={live ? () => setLiveOnly(!liveOnly) : undefined} />
    </div>
    {!rows.length && <p className="rounded-xl border border-dashed border-[#D8C8FF] bg-[#F8F5FF] px-3 py-2.5 text-xs leading-5 text-slate-600">Nothing is assigned yet. Click <b>Assign conversation</b> next to a team member to send them one.</p>}
    {groups.map((group) => <section key={group.id} className="overflow-hidden rounded-2xl border border-[#E9DFFF] bg-white shadow-[0_10px_24px_-22px_rgba(70,35,117,.45)]">
      <header className="flex items-center gap-3 border-b border-[#E9DFFF] bg-gradient-to-r from-[#F8F5FF] to-white px-3.5 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6C3BFF] to-[#5A2BE6] text-xs font-bold text-white ring-2 ring-white">{initials(group.name)}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{group.name}</span><span className="block truncate text-[11px] text-slate-500">{group.rows.length} {group.rows.length === 1 ? 'conversation' : 'conversations'} · {group.email}</span></span>
        {group.id !== 'others' && <button type="button" onClick={() => setPicking(picking === group.id ? '' : group.id)} aria-expanded={picking === group.id} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#6C3BFF] px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#5A2BE6]"><Plus className="h-3.5 w-3.5" />Assign conversation</button>}
      </header>
      {picking === group.id && <UnassignedPicker memberName={group.name} onPick={async (key) => { if (await onAssign(key, group.id)) setPicking('') }} onClose={() => setPicking('')} />}
      {group.rows.length ? <ul className="divide-y divide-[#E9DFFF]">{group.rows.map((row) => <AssignedRow key={row.key} row={row} selected={selectedId === row.key} ownerId={group.id} teamMembers={teamMembers} onOpen={onOpen} onAssign={onAssign} />)}</ul>
        : <p className="px-3.5 py-3 text-xs text-slate-400">{liveOnly ? 'Not on a call right now.' : 'No conversations yet.'}</p>}
    </section>)}
  </div>
}

function SummaryCard({ label, hint, value, active, onClick }: { label: string; hint: string; value: number; active?: boolean; onClick?: () => void }) {
  const body = <><div className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">{label}</div><div className="mt-1 text-xl font-extrabold tracking-tight text-[#32136B]">{value}</div><div className="mt-0.5 truncate text-[10px] text-slate-500">{hint}</div></>
  const style = `rounded-xl border px-3 py-2.5 text-left ${active && onClick ? 'border-[#6C3BFF] bg-[#F1EBFF]' : 'border-[#E9DFFF] bg-gradient-to-br from-white to-[#F8F5FF]'}`
  return onClick ? <button type="button" onClick={onClick} className={`${style} transition hover:border-[#A78BFA]`}>{body}</button> : <div className={style}>{body}</div>
}

/** A conversation in someone's list: click to open it, or move it to another team member / back to Unassigned. */
function AssignedRow({ row, selected, ownerId, teamMembers, onOpen, onAssign }: { row: Conversation; selected: boolean; ownerId: string; teamMembers: Member[]; onOpen: (key: string) => void; onAssign: (key: string, userId: string | null) => Promise<boolean> }) {
  const [moving, setMoving] = useState(false)
  const targets = teamMembers.filter((member) => member.id !== ownerId)
  return <li className={`group transition ${selected ? 'bg-[#F1EBFF]' : 'hover:bg-[#F8F5FF]'}`}>
    <div className="flex items-center gap-3 px-3.5 py-2.5">
      <button type="button" onClick={() => onOpen(row.key)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6C3BFF] to-[#5A2BE6] text-[10px] font-bold text-white">{initials(row.name)}{row.live && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-white bg-purple-500" />}</span>
        <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-[13px] font-semibold text-slate-900">{row.name}</span><span className="shrink-0 text-[10px] text-slate-400">{row.live ? 'on a call' : ago(row.last_at)}</span></span><span className="mt-0.5 block truncate text-[11px] italic text-slate-500">{rowPreview(row)}</span></span>
      </button>
      <span className="flex shrink-0 gap-1">
        {targets.length > 0 && <button type="button" onClick={() => setMoving(!moving)} title="Move to another team member" aria-label="Move to another team member" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-[#6C3BFF]"><ArrowRightLeft className="h-3.5 w-3.5" /></button>}
        <button type="button" onClick={() => onAssign(row.key, null)} title="Move back to Unassigned" className="inline-flex items-center gap-1 rounded-md border border-[#E9DFFF] bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-[#6C3BFF] hover:text-[#6C3BFF]"><UserMinus className="h-3.5 w-3.5" />Unassign</button>
      </span>
    </div>
    {moving && <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-2.5 pl-[3.6rem]"><span className="text-[11px] text-slate-500">Move to</span>{targets.map((member) => <button key={member.id} type="button" onClick={async () => { if (await onAssign(row.key, member.id)) setMoving(false) }} className="rounded-full border border-[#D8C8FF] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#5A2BE6] hover:border-[#6C3BFF]">{member.name}</button>)}</div>}
  </li>
}

/** "Assign conversation": the unassigned conversations, one click sends one to this team member. */
function UnassignedPicker({ memberName, onPick, onClose }: { memberName: string; onPick: (key: string) => void; onClose: () => void }) {
  const [items, setItems] = useState<Conversation[] | null>(null)
  const [query, setQuery] = useState('')
  const [sending, setSending] = useState('')
  useEffect(() => {
    log(`loading unassigned conversations to send to ${memberName}`)
    api('/api/inbox/conversations?folder=unassigned').then((result) => setItems(result.data || [])).catch((error) => { log('unassigned load failed', error); toast.error(userFacingError(error)); setItems([]) })
  }, [memberName])
  const shown = (items || []).filter((item) => `${item.name} ${item.phone || ''} ${item.preview || ''}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="border-b border-[#E9DFFF] bg-[#F8F5FF] p-3">
    <div className="flex items-center gap-2"><div className="relative flex-1"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Send a conversation to ${memberName}…`} className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 text-xs" /></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-slate-400 hover:bg-white"><X className="h-3.5 w-3.5" /></button></div>
    <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
      {items === null ? <p className="flex items-center gap-2 py-3 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading unassigned conversations…</p>
        : shown.length ? shown.map((item) => <button key={item.key} type="button" disabled={Boolean(sending)} onClick={() => { setSending(item.key); onPick(item.key) }} className="flex w-full items-center gap-2.5 rounded-lg border border-transparent bg-white px-2.5 py-2 text-left transition hover:border-[#D8C8FF] disabled:opacity-60">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6C3BFF] to-[#5A2BE6] text-[9px] font-bold text-white">{initials(item.name)}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-900">{item.name}</span><span className="block truncate text-[10px] text-slate-500">{item.preview || item.phone}</span></span>
          {sending === item.key ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6C3BFF]" /> : <span className="shrink-0 text-[11px] font-bold text-[#6C3BFF]">Send →</span>}
        </button>)
        : <p className="py-3 text-xs text-slate-500">{items.length ? 'No match.' : 'Every conversation is already assigned.'}</p>}
    </div>
  </div>
}

function Empty({ text }: { text: string }) {
  return <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F1EBFF] to-[#F1EBFF] text-[#6C3BFF] shadow-[0_14px_28px_-20px_rgba(95,52,126,.8)]"><MessageSquare className="h-6 w-6" /></span><p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">{text}</p></div>
}


type TimelineItem = { at: Date; kind: 'call'; call: CallEntry; latest: boolean } | { at: Date; kind: 'note'; message: TeamMessage } | { at: Date; kind: 'event'; event: ThreadEvent }

/** Middle pane, Podium style: header with the caller and chips, one timeline (calls, team notes, events) with day separators, then the composer. */
function ConversationDetail({ detail, canAssign, canWork, onAssign, onStage, onClose, contactHidden, onToggleContact, onChanged }: { detail: Detail; canAssign: boolean; canWork: boolean; onAssign: (userId: string | null) => void; onStage: (stage: string) => void; onClose: (closed: boolean) => void; contactHidden: boolean; onToggleContact: () => void; onChanged: () => void }) {
  const { members, me } = useContext(Team)
  const [menu, setMenu] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)
  const latestCall = detail.calls[detail.calls.length - 1]?.id
  const items: TimelineItem[] = [
    ...detail.calls.map((call) => ({ at: asDate(call.at) || new Date(0), kind: 'call' as const, call, latest: call.id === latestCall })),
    ...detail.discussion.map((message) => ({ at: asDate(message.created_at) || new Date(0), kind: 'note' as const, message })),
    ...(detail.events || []).map((event) => ({ at: asDate(event.at) || new Date(0), kind: 'event' as const, event })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime())
  const size = items.length + detail.calls.reduce((total, call) => total + call.messages.length, 0)
  // Jump to the newest item when the thread opens and whenever something is added (live lines, notes, events).
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [detail.key, size])
  let lastDay = ''
  const last = detail.calls[detail.calls.length - 1]
  const iconButton = 'flex h-10 w-10 items-center justify-center rounded-xl border border-[#E9DFFF] bg-white text-[#6C3BFF] transition hover:border-[#6C3BFF] hover:bg-[#F8F5FF]'
  return <>
    <div className="px-5 pb-3 pt-4">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onToggleContact} title="Contact details" className="flex min-w-0 items-center gap-3 rounded-xl py-1 pr-2 text-left transition hover:bg-[#F8F5FF]">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#5A2BE6] text-sm font-bold text-white shadow-[0_10px_22px_-12px_rgba(108,59,255,.9)]">{initials(detail.name)}{detail.live && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-white bg-[#9747FF]" />}</span>
          <span className="min-w-0">
            <span className="flex items-center gap-2"><span className="truncate text-lg font-extrabold tracking-tight text-slate-900">{detail.name}</span>{detail.live && <span className="premium-badge live shrink-0"><Radio className="h-3 w-3" />Live now</span>}</span>
            <span className="flex flex-wrap items-center gap-2 text-[13px] text-slate-500">{detail.phone && <span>{detail.phone}</span>}<span className="inline-flex items-center gap-1 rounded-md bg-[#F1EBFF] px-2 py-0.5 text-[11px] font-semibold text-[#5A2BE6]"><StageIcon stage={detail.stage} small />{stageInfo(detail.stage).label}</span>{detail.closed && <span className="inline-flex items-center gap-1 rounded-md border border-[#E9DFFF] px-2 py-0.5 text-[11px] font-semibold text-slate-500"><Check className="h-3 w-3" />Closed</span>}</span>
          </span>
        </button>
        <div className="relative flex shrink-0 items-center gap-2">
          <Link href="/voice/browser-test" title="Start a test call" aria-label="Start a test call" className={`${iconButton} hidden sm:flex`}><PhoneCall className="h-4 w-4" /></Link>
          {canWork && <button type="button" onClick={() => onClose(!detail.closed)} title={detail.closed ? 'Reopen (E)' : 'Close (E)'} className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition ${detail.closed ? 'border border-[#D8C8FF] bg-white text-[#5A2BE6] hover:border-[#6C3BFF]' : 'bg-gradient-to-r from-[#8B5CF6] to-[#6C3BFF] text-white shadow-[0_10px_20px_-12px_rgba(108,59,255,.9)] hover:brightness-110'}`}>{detail.closed ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}<span className="hidden sm:inline">{detail.closed ? 'Reopen' : 'Close'}</span></button>}
          {contactHidden && <button type="button" onClick={onToggleContact} title="Show contact details" aria-label="Show contact details" className={`${iconButton} hidden 2xl:flex`}><PanelRightOpen className="h-4 w-4" /></button>}
          <button type="button" onClick={() => setMenu(!menu)} aria-label="More actions" aria-expanded={menu} className={iconButton}><MoreVertical className="h-4 w-4" /></button>
          {menu && <>
            <button type="button" aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-xl border border-[#E9DFFF] bg-white py-1 shadow-lg">
              <MenuItem disabled={!canWork} icon={detail.closed ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />} label={detail.closed ? 'Reopen conversation' : 'Close conversation'} onClick={() => { setMenu(false); onClose(!detail.closed) }} />
              <MenuItem icon={<Copy className="h-4 w-4" />} label="Copy phone number" onClick={() => { setMenu(false); copy(detail.phone || '', 'Phone number') }} />
              <MenuItem icon={<PanelRightOpen className="h-4 w-4" />} label={contactHidden ? 'Show contact details' : 'Hide contact details'} onClick={() => { setMenu(false); onToggleContact() }} />
              {!canWork && <p className="border-t border-slate-100 px-3 py-2 text-[11px] leading-4 text-slate-400">Only an admin or the assigned team member can close it or change its status.</p>}
            </div>
          </>}
        </div>
      </div>
      {/* Owner and status controls. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canAssign ? <AssignChip detail={detail} members={members} onAssign={onAssign} />
          : <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E9DFFF] px-2.5 text-[13px] text-slate-600"><UserPlus className="h-3.5 w-3.5 text-[#8B5CF6]" />{detail.assigned_to === me ? 'Assigned to you' : detail.assigned_to_name || 'Unassigned'}</span>}
        <StagePicker stage={detail.stage} editable={canWork} onChange={onStage} compact />
      </div>
      {/* Call facts for the latest call (real fields only). */}
      <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#E9DFFF] bg-[#E9DFFF] sm:grid-cols-4">
        <CallFact icon={<Clock className="h-4 w-4" />} label="Duration" value={last?.live ? 'In progress' : last?.duration ? duration(last.duration) : '—'} />
        <CallFact icon={<PhoneIncoming className="h-4 w-4" />} label="Call type" value={last ? `Inbound · ${last.channel_type === 'web_call' ? 'Web' : 'Phone'}` : '—'} />
        <CallFact icon={<Globe className="h-4 w-4" />} label="Source" value={detail.profile?.source || '—'} />
        <CallFact icon={<Bot className="h-4 w-4" />} label="Answered by" value={last ? providerLabel(last.provider) : '—'} />
      </dl>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#F1EBFF] bg-gradient-to-b from-white to-[#F8F5FF] px-5 py-4">
      <SummaryBanner detail={detail} />
      <div className="mb-4 text-center"><div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#F1EBFF]"><PhoneCall className="h-4 w-4 text-[#6C3BFF]" /></div><div className="text-sm font-semibold text-slate-700">Beginning of conversation</div><div className="text-xs text-slate-400">{fullDate(detail.calls[0]?.at)}</div></div>
      <div className="space-y-4">
        {items.map((item, index) => {
          const day = item.at.toDateString()
          const separator = day !== lastDay && item.at.getTime() > 0 ? <DaySummary key={`day-${index}`} label={dayLabel(item.at)} calls={detail.calls.filter((call) => asDate(call.at)?.toDateString() === day)} /> : null
          lastDay = day
          const body = item.kind === 'call' ? <CallCard key={item.call.id} call={item.call} name={detail.name} defaultOpen={item.latest || item.call.live} />
            : item.kind === 'note' ? <NoteItem key={item.message._id} message={item.message} onChanged={onChanged} />
            : <EventLine key={`event-${index}`} event={item.event} />
          return <div key={`item-${index}`}>{separator}{body}</div>
        })}
      </div>
      <div ref={bottom} />
    </div>

    <div className="border-t border-[#F1EBFF] px-5 pb-3 pt-3">
      <Composer id="inbox-note" conversationId={detail.key} placeholder={`Add an internal note about ${detail.name} — type @ to mention`} onDone={onChanged}
        onSendAndClose={canWork && !detail.closed ? () => onClose(true) : undefined} boxed />
    </div>
  </>
}

/** Shown only while a call is live: the transcript below is updating. Summaries are not repeated here: each one
    appears once, in that day's Day summary in the timeline (they used to show three times: here, in the Day summary
    and inside the call card). */
function SummaryBanner({ detail }: { detail: Detail }) {
  const live = detail.calls.find((call) => call.live)
  if (!live) return null
  return <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#E9DFFF] bg-gradient-to-br from-[#F1EBFF] via-[#F8F5FF] to-white p-4">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#6C3BFF] text-white"><Radio className="h-4 w-4 animate-pulse" /></span>
    <div className="min-w-0"><div className="text-sm font-bold text-slate-900">Call in progress</div><div className="text-[13px] text-slate-600">Started {clock(live.at)} with {providerLabel(live.provider)}. The transcript below updates as they talk.</div></div>
  </div>
}

function CallFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex min-w-0 items-center gap-2.5 bg-white px-3 py-2.5"><span className="shrink-0 text-[#8B5CF6]">{icon}</span><span className="min-w-0"><dt className="text-[11px] font-medium text-slate-400">{label}</dt><dd className="truncate text-[13px] font-semibold text-slate-800" title={value}>{value}</dd></span></div>
}

function MenuItem({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-[#F8F5FF] disabled:cursor-not-allowed disabled:opacity-40"><span className="text-slate-500">{icon}</span>{label}</button>
}

function DaySeparator({ label }: { label: string }) {
  return <div className="my-4 flex items-center gap-3"><span className="h-px flex-1 bg-[#E9DFFF]" /><span className="rounded-full border border-[#E9DFFF] bg-white px-3 py-1 text-xs font-semibold text-slate-600">{label}</span><span className="h-px flex-1 bg-[#E9DFFF]" /></div>
}

/** Day header in a conversation: the date, that day's call totals, and every call's AI summary for the day, so an admin sees the day at a glance. */
function DaySummary({ label, calls }: { label: string; calls: CallEntry[] }) {
  const [open, setOpen] = useState(true)
  if (!calls.length) return <DaySeparator label={label} />
  const talk = calls.reduce((total, call) => total + (call.duration || 0), 0)
  const missed = calls.filter((call) => call.failed).length
  const summed = calls.filter((call) => call.summary || call.failed)
  return <div className="my-4">
    <DaySeparator label={label} />
    <div className="mx-auto max-w-[560px] rounded-2xl border border-[#E9DFFF] bg-white p-3.5 shadow-[0_10px_24px_-22px_rgba(70,35,117,.5)]">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-2 text-left">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1EBFF] text-[#6C3BFF]"><CalendarDays className="h-3.5 w-3.5" /></span>
        <span className="flex-1 text-[11px] font-bold uppercase tracking-[.12em] text-[#6C3BFF]">Day summary</span>
        {summed.length > 0 && (open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />)}
      </button>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-md bg-[#F1EBFF] px-2 py-0.5 font-semibold text-[#5A2BE6]">{calls.length} call{calls.length === 1 ? '' : 's'}</span>
        {talk > 0 && <span className="rounded-md bg-[#F1EBFF] px-2 py-0.5 font-semibold text-[#5A2BE6]">{duration(talk)} talk time</span>}
        {missed > 0 && <span className="rounded-md bg-[#6C3BFF] px-2 py-0.5 font-semibold text-white">{missed} missed</span>}
        {calls.some((call) => call.live) && <span className="rounded-md bg-gradient-to-r from-[#8B5CF6] to-[#6C3BFF] px-2 py-0.5 font-semibold text-white">Live now</span>}
      </div>
      {open && summed.length > 0 && <ol className="mt-3 space-y-2 border-t border-[#F1EBFF] pt-3">{summed.map((call) => <li key={call.id} className="flex gap-2.5 text-[13px] leading-5">
        <span className="w-16 shrink-0 pt-px text-[11px] font-semibold text-slate-400">{clock(call.at)}</span>
        <span className="min-w-0 text-slate-700">{call.failed ? `Call did not connect${call.disconnection_reason ? ` (${call.disconnection_reason})` : ''}.` : call.summary}{call.duration ? <span className="text-slate-400"> · {duration(call.duration)}</span> : null}</span>
      </li>)}</ol>}
    </div>
  </div>
}

/** "Conversation closed by …", "… assigned it to …": centred like Podium's system lines. */
function EventLine({ event }: { event: ThreadEvent }) {
  return <div className="py-1 text-center"><div className="text-[13px] font-semibold text-slate-600">{event.text}</div><div className="text-[11px] text-slate-400">{fullDate(event.at)}</div></div>
}

/** Admin control: hand the thread to a teammate. Owners and admins are not offered; they assign rather than receive. */
function AssignChip({ detail, members, onAssign }: { detail: Detail; members: Member[]; onAssign: (userId: string | null) => void }) {
  const teammates = members.filter((member) => member.assignable)
  if (!teammates.length) return <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 text-[12px] text-slate-500"><UserPlus className="h-3.5 w-3.5" />Invite a teammate to assign</span>
  return <label className="relative inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white pl-2.5 pr-1 text-[13px] text-slate-700 transition hover:border-[#6C3BFF]">
    <UserPlus className="h-3.5 w-3.5 text-slate-400" />
    <select value={detail.assigned_to || ''} onChange={(event) => onAssign(event.target.value || null)} aria-label="Assign conversation" className="h-7 min-h-0 w-auto appearance-none border-0 bg-transparent bg-none p-0 pr-6 font-semibold shadow-none outline-none focus:shadow-none"><option value="">Unassigned</option>{teammates.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select>
    <ChevronDown className="pointer-events-none absolute right-1.5 h-3.5 w-3.5 text-slate-400" />
  </label>
}

/** Status icon (Lucide line icon — the design system does not use emoji as icons). */
function StageIcon({ stage, small, light }: { stage?: string; small?: boolean; light?: boolean }) {
  const Icon = stageInfo(stage).icon
  return <Icon aria-hidden="true" className={`${small ? 'h-3 w-3' : 'h-4 w-4'} shrink-0 ${light ? 'text-white' : 'text-[#6C3BFF]'}`} />
}

/** Podium-style status: a dropdown of the pipeline stages; the full version adds the progress steps underneath. */
function StagePicker({ stage, byName, editable, onChange, compact }: { stage?: string; byName?: string; editable: boolean; onChange: (stage: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const current = stageInfo(stage)
  const position = STAGES.findIndex((item) => item.id === current.id)
  return <div className={`relative ${compact ? '' : 'w-full'}`}>
    <button type="button" disabled={!editable} onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Conversation status" title={editable ? 'Change status' : 'Only an admin or the assigned team member can change the status'}
      className={`flex items-center gap-2 rounded-lg border font-semibold transition enabled:hover:border-[#6C3BFF] disabled:cursor-default ${compact ? 'h-8 border-[#E9DFFF] bg-white px-2.5 text-[13px] text-slate-800' : 'h-10 w-full border-transparent bg-[#F1EBFF] px-3 text-sm text-[#5A2BE6]'}`}>
      <StageIcon stage={current.id} /><span className="flex-1 text-left">{current.label}</span>{editable && <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />}
    </button>
    {!compact && <div className="mt-3 flex gap-1" aria-hidden="true">{STAGES.map((item, index) => <span key={item.id} title={item.label} className={`h-1.5 flex-1 rounded-full ${index <= position ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6C3BFF]' : 'bg-[#E9DFFF]'}`} />)}</div>}
    {!compact && <div className="mt-1.5 flex justify-between gap-2 text-[11px] text-slate-400"><span>Step {position + 1} of {STAGES.length}</span>{byName && <span className="truncate">Set by {byName}</span>}</div>}
    {open && <>
      <button type="button" aria-label="Close" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
      <div className={`absolute z-20 w-60 overflow-hidden rounded-xl border border-[#E9DFFF] bg-white py-1 shadow-lg ${compact ? 'left-0 top-9' : 'left-0 right-0 top-11 w-auto'}`}>{STAGES.map((item) => <button key={item.id} type="button" onClick={() => { setOpen(false); onChange(item.id) }}
        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-[#F8F5FF] ${item.id === current.id ? 'font-semibold text-[#5A2BE6]' : 'text-slate-700'}`}>
        <StageIcon stage={item.id} /><span className="flex-1">{item.label}</span>{item.id === current.id && <Check className="h-4 w-4 text-[#6C3BFF]" />}</button>)}</div>
    </>}
  </div>
}

/** Contact sheet (Podium style): header with expand / close, who the caller is, quick actions, status with steps, then Details / Activity / Overview. */
function ContactPanel({ detail, editable, wide, onWide, onStage, onClose, onSaved }: { detail: Detail; editable: boolean; wide: boolean; onWide: () => void; onStage: (stage: string) => void; onClose: () => void; onSaved: () => void }) {
  const [tab, setTab] = useState<'details' | 'activity' | 'overview'>('details')
  const [profileOpen, setProfileOpen] = useState(true)
  const [editing, setEditing] = useState(false)
  const profile = detail.profile || {}
  useEffect(() => setEditing(false), [detail.key])
  const activity = [
    ...detail.calls.map((call) => ({ at: call.at, icon: call.live ? Radio : call.failed ? PhoneMissed : PhoneCall, text: call.live ? 'On a call now' : call.failed ? `${callTitle(call)}${call.disconnection_reason ? ` (${call.disconnection_reason})` : ''}` : `${callTitle(call)} with ${providerLabel(call.provider)}${call.duration ? ` · ${duration(call.duration)}` : ''}` })),
    ...(detail.events || []).map((event) => ({ at: event.at, icon: event.type === 'stage' ? Hash : event.type === 'closed' || event.type === 'reopened' ? Check : UserPlus, text: event.text })),
  ].sort((a, b) => (asDate(b.at)?.getTime() || 0) - (asDate(a.at)?.getTime() || 0))
  const field = (label: string, value?: React.ReactNode) => <div className="flex gap-3 py-2.5 text-sm"><span className="w-32 shrink-0 font-semibold text-slate-800">{label}</span><span className="min-w-0 flex-1 break-words text-slate-600">{value || <span className="text-slate-400">—</span>}</span></div>
  return <aside className="hidden min-h-0 flex-col overflow-hidden rounded-2xl border border-[#E9DFFF] bg-white shadow-[0_18px_40px_-34px_rgba(70,35,117,.55)] 2xl:flex">
    <div className="flex items-center justify-between px-5 pb-2 pt-4">
      <span className="truncate text-base font-extrabold tracking-tight text-slate-900">Contact Details</span>
      <span className="flex gap-1">
        <button type="button" onClick={onWide} aria-label={wide ? 'Shrink sheet' : 'Expand sheet'} title={wide ? 'Shrink' : 'Expand'} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-[#F1EBFF] hover:text-[#6C3BFF]">{wide ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
        <button type="button" onClick={onClose} aria-label="Close contact details" title="Close" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-[#F1EBFF] hover:text-[#6C3BFF]"><X className="h-4 w-4" /></button>
      </span>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="px-4 pt-2">
        {/* Profile card: vibrant brand gradient with the caller's identity and status. */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#6C3BFF] via-[#8B5CF6] to-[#9747FF] p-4 text-white shadow-[0_18px_34px_-20px_rgba(108,59,255,.9)]">
          <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-bold ring-2 ring-white/80">{initials(detail.name)}</span>
            <span className="min-w-0">
              <button type="button" onClick={() => copy(detail.name, 'Name')} title="Copy name" className="block max-w-full truncate text-lg font-extrabold tracking-tight text-white hover:underline">{detail.name}</button>
              {detail.phone && <button type="button" onClick={() => copy(detail.phone!, 'Phone number')} title="Copy phone number" className="block truncate text-[13px] text-white/85 hover:underline">{detail.phone}</button>}
              {profile.email && <button type="button" onClick={() => copy(profile.email!, 'Email')} title="Copy email" className="block max-w-full truncate text-[13px] text-white/85 hover:underline">{profile.email}</button>}
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-[#5A2BE6]"><StageIcon stage={detail.stage} small />{stageInfo(detail.stage).label}</span>
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <QuickAction icon={<Headphones className="h-4 w-4" />} label="Test call" href="/voice/browser-test" />
          <QuickAction icon={<Copy className="h-4 w-4" />} label="Copy number" onClick={() => copy(detail.phone || '', 'Phone number')} />
          <QuickAction icon={<StickyNote className="h-4 w-4" />} label="Add note" onClick={() => document.getElementById('inbox-note')?.focus()} />
          <QuickAction icon={<UserPlus className="h-4 w-4" />} label="Open lead" href={profile.lead_id ? `/leads/${profile.lead_id}` : undefined} />
        </div>
        <div className="mt-3 rounded-2xl border border-[#E9DFFF] p-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">Lead status</div>
          <StagePicker stage={detail.stage} byName={detail.stage_by_name} editable={editable} onChange={onStage} />
        </div>
      </div>
      <div className="mx-4 mt-4 flex gap-1 border-b border-[#E9DFFF]" role="tablist">{(['details', 'activity', 'overview'] as const).map((name) => <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold capitalize transition ${tab === name ? 'border-[#6C3BFF] text-[#5A2BE6]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{name}</button>)}</div>
      <div className="px-5 pb-6 pt-3">
        {tab === 'details' ? <div>
          <div className="flex items-center justify-between py-2">
            <button type="button" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen} className="flex items-center gap-2 text-base font-bold text-slate-900">Profile{profileOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}</button>
            {editable && profileOpen && !editing && <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#5A2BE6] transition hover:bg-[#F1EBFF]"><Pencil className="h-3.5 w-3.5" />Edit</button>}
          </div>
          {profileOpen && editing && <ProfileForm detail={detail} onDone={(saved) => { setEditing(false); if (saved) onSaved() }} />}
          {profileOpen && !editing && <div className="divide-y divide-slate-100">
            {field('Name', profile.name || detail.name)}
            {field('Primary Phone', detail.phone)}
            {field('Primary Email', profile.email)}
            {field('Company', profile.company)}
            {field('Address', profile.address)}
            {field('Tags', profile.tags?.length ? <span className="flex flex-wrap gap-1">{profile.tags.map((tag) => <span key={tag} className="rounded-full bg-[#F1EBFF] px-2 py-0.5 text-xs font-semibold text-[#5A2BE6]">{tag}</span>)}</span> : undefined)}
            {field('Contact Source', profile.source)}
            {field('Assigned to', detail.assigned_to_name || 'Unassigned')}
            {field('Create Date', shortDate(profile.created_at))}
          </div>}
          {activity.length > 0 && <div className="mt-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Clock className="h-4 w-4 text-[#6C3BFF]" />Recent activity</div>
            <button type="button" onClick={() => setTab('activity')} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-[#E9DFFF] p-3 text-left transition hover:border-[#6C3BFF] hover:bg-[#F8F5FF]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1EBFF] text-[#6C3BFF]">{(() => { const Icon = activity[0].icon; return <Icon className="h-4 w-4" /> })()}</span>
              <span className="min-w-0 flex-1"><span className="block text-[11px] text-slate-400">{ago(activity[0].at)}{ago(activity[0].at) === 'now' ? '' : ' ago'}</span><span className="block truncate text-[13px] font-medium text-slate-700">{activity[0].text}</span></span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          </div>}
        </div>
          : tab === 'activity' ? (activity.length ? <ol className="space-y-3">{activity.map((item, index) => { const Icon = item.icon; return <li key={index} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F1EBFF]"><Icon className="h-3.5 w-3.5 text-[#6C3BFF]" /></span><span className="min-w-0"><span className="block text-sm text-slate-700">{item.text}</span><span className="text-[11px] text-slate-400">{fullDate(item.at)}</span></span></li> })}</ol> : <p className="py-6 text-center text-sm text-slate-400">No activity yet.</p>)
          : (detail.calls.length ? <div className="space-y-4">{summaryDays(detail.calls).map(({ day, calls }) => <section key={day}>
              <div className="flex items-baseline justify-between gap-2"><h4 className="text-sm font-bold text-slate-900">{dayLabel(new Date(day))}</h4><span className="text-[11px] text-slate-400">{calls.length} call{calls.length === 1 ? '' : 's'}{calls.some((call) => call.failed) ? ` · ${calls.filter((call) => call.failed).length} missed` : ''}{calls.reduce((total, call) => total + (call.duration || 0), 0) ? ` · ${duration(calls.reduce((total, call) => total + (call.duration || 0), 0))}` : ''}</span></div>
              <ol className="mt-2 space-y-2">{calls.map((call) => <li key={call.id} className="rounded-xl border border-[#E9DFFF] p-3"><div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">{call.failed ? <PhoneMissed className="h-3 w-3 text-[#6C3BFF]" /> : <Sparkles className="h-3 w-3 text-[#6C3BFF]" />}{clock(call.at)}{call.duration ? ` · ${duration(call.duration)}` : ''} · {providerLabel(call.provider)}</div><p className="mt-1 text-sm leading-6 text-slate-700">{call.live ? 'On a call now.' : call.failed ? `Call did not connect${call.disconnection_reason ? ` (${call.disconnection_reason})` : ''}.` : call.summary || <span className="text-slate-400">No summary for this call.</span>}</p></li>)}</ol>
            </section>)}</div>
            : <p className="py-6 text-center text-sm text-slate-400">No calls yet. Summaries appear here, day by day, after each call.</p>)}
      </div>
    </div>
  </aside>
}

/** Click-to-edit contact details; saves to the caller's lead and customer records (PUT …/profile). */
function ProfileForm({ detail, onDone }: { detail: Detail; onDone: (saved: boolean) => void }) {
  const profile = detail.profile || {}
  const [form, setForm] = useState({ name: profile.name || detail.name || '', email: profile.email || '', company: profile.company || '', address: profile.address || '', tags: (profile.tags || []).join(', ') })
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    log(`saving contact for ${detail.key}`)
    try {
      await api(`/api/inbox/conversations/${encodeKey(detail.key)}/profile`, { method: 'PUT', body: JSON.stringify({ ...form, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean) }) })
      toast.success('Contact updated'); onDone(true)
    } catch (error) { log('contact save failed', error); toast.error(userFacingError(error)) } finally { setSaving(false) }
  }
  const input = (key: keyof typeof form, label: string, placeholder = '') => <label className="block py-1.5"><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span><input value={form[key]} placeholder={placeholder} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="h-9 min-h-0 rounded-lg px-3 py-1 text-sm" /></label>
  return <div className="space-y-0.5 pb-2">
    {input('name', 'Name')}{input('email', 'Primary Email', 'name@company.com')}{input('company', 'Company')}{input('address', 'Address')}{input('tags', 'Tags', 'comma, separated')}
    <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => onDone(false)} className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:border-slate-300">Cancel</button><button type="button" disabled={saving} onClick={save} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6C3BFF] px-4 text-sm font-semibold text-white hover:bg-[#5A2BE6] disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</button></div>
  </div>
}

function QuickAction({ icon, label, onClick, href }: { icon: React.ReactNode; label: string; onClick?: () => void; href?: string }) {
  const style = 'flex h-11 items-center justify-center rounded-xl border border-[#E9DFFF] bg-white text-[#6C3BFF] transition hover:border-[#6C3BFF] hover:bg-[#F8F5FF]'
  if (href) return <Link href={href} title={label} aria-label={label} className={style}>{icon}</Link>
  return <button type="button" onClick={onClick} disabled={!onClick} title={label} aria-label={label} className={`${style} disabled:opacity-40`}>{icon}</button>
}

/** One call in the timeline, like Podium's call card: icon, title, number, recording and summary, with the transcript behind "View call details". */
function CallCard({ call, name, defaultOpen }: { call: CallEntry; name: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => { if (call.live) setOpen(true) }, [call.live])
  const Icon = call.live ? Radio : call.failed ? PhoneMissed : PhoneCall
  return <div className="space-y-3">
    {/* The call itself: a compact card with its facts, recording and (for older calls) its summary. */}
    <div className="mx-auto max-w-[560px] overflow-hidden rounded-2xl border border-[#E9DFFF] bg-white shadow-[0_10px_24px_-22px_rgba(70,35,117,.5)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${call.live ? 'bg-gradient-to-br from-[#8B5CF6] to-[#6C3BFF] text-white' : 'bg-[#F1EBFF] text-[#6C3BFF]'}`}><Icon className={`h-4 w-4 ${call.live ? 'animate-pulse' : ''}`} /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900">{callTitle(call)}</span><span className="block truncate text-xs text-slate-500">{clock(call.at)}{call.duration ? ` • ${duration(call.duration)}` : ''} • {call.phone || name} • {providerLabel(call.provider)}</span></span>
        {!call.failed && <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-[#5A2BE6] transition hover:bg-[#F1EBFF]">{open ? 'Hide transcript' : 'Transcript'}{open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>}
      </div>
      {call.recording_url && <div className="px-4 pb-3"><audio className="w-full" controls preload="none" src={call.recording_url} /></div>}
      {call.failed && <p className="px-4 pb-3 text-sm text-slate-600">This call did not connect{call.disconnection_reason ? ` (${call.disconnection_reason})` : ''}.</p>}
    </div>
    {/* Transcript as a conversation: caller on the left, the AI agent on the right. */}
    {open && !call.failed && <div className="space-y-3">
      {call.messages.length ? call.messages.map((line, index) => { const customer = line.role === 'customer'; return <div key={index} className={`flex items-end gap-2.5 ${customer ? 'justify-start' : 'justify-end'}`}>
        {customer && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#5A2BE6] text-[11px] font-bold text-white">{initials(name)}</span>}
        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${customer ? 'rounded-bl-md border border-[#E9DFFF] bg-white text-slate-700' : 'rounded-br-md bg-gradient-to-br from-[#8B5CF6] to-[#6C3BFF] text-white shadow-[0_12px_24px_-16px_rgba(108,59,255,.9)]'}`}>{line.text}<div className={`mt-1 flex items-center gap-1 text-[10px] ${customer ? 'text-slate-400' : 'justify-end text-white/75'}`}>{customer ? 'Caller' : providerLabel(call.provider)}{clock(line.at) ? ` · ${clock(line.at)}` : ''}</div></div>
        {!customer && <span title={providerLabel(call.provider)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1EBFF] text-[#6C3BFF] ring-2 ring-white"><Bot className="h-4 w-4" /></span>}
      </div> }) : <p className="py-2 text-center text-xs text-slate-400">{call.live ? 'Waiting for the first words…' : 'No transcript for this call.'}</p>}
      {call.live && call.messages.length > 0 && <p className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-[#6C3BFF]"><Loader2 className="h-3 w-3 animate-spin" />Call in progress — transcript updates live</p>}
    </div>}
  </div>
}

/** A team note in the timeline: right-aligned like an outgoing message, marked as visible to the team only. */
function NoteItem({ message, onChanged }: { message: TeamMessage; onChanged: () => void }) {
  return <div className="ml-auto max-w-[560px]">
    <div className="rounded-2xl rounded-br-md border border-[#E9DFFF] bg-[#F1EBFF] px-2 py-1"><MessageRow message={message} onChanged={onChanged} /></div>
    <div className="mt-1 flex items-center justify-end gap-1 pr-1 text-[11px] text-slate-400"><Lock className="h-3 w-3" />{message.mentions?.length ? 'Only visible to you and the people mentioned' : 'Only visible to your team'}</div>
  </div>
}

/** Right pane for a mention made in the team channel: the message itself, plus a reply that goes back to the channel. */
function ChannelMention({ message, onChanged }: { message: TeamMessage; onChanged: () => void }) {
  const { members } = useContext(Team)
  const author = members.find((member) => member.id === message.author_id)
  return <>
    <div className="border-b border-[#E9DFFF] px-5 py-4"><div className="flex items-center gap-2 text-lg font-bold text-slate-900"><AtSign className="h-4 w-4 text-[#6C3BFF]" />{message.author_name} mentioned you</div><div className="mt-1 text-xs text-slate-500">In the team channel · {ago(message.created_at)}</div></div>
    <div className="min-h-0 flex-1 overflow-y-auto p-5"><MessageRow message={message} onChanged={onChanged} /></div>
    <div className="border-t border-[#E9DFFF] px-5 pb-3 pt-3"><Composer key={message._id} placeholder="Write a reply — type @ to mention" initialText={author ? `@${author.name} ` : ''} initialMentions={author ? [author] : []} onDone={onChanged} boxed label="Reply in team channel" /></div>
  </>
}

function TeamChannel({ onOpenConversation }: { onOpenConversation: (id: string) => void }) {
  const { members } = useContext(Team)
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const bottom = useRef<HTMLDivElement>(null)
  const { me } = useContext(Team)
  const load = useCallback(() => api('/api/inbox/channel').then(async (result) => {
    const rows: TeamMessage[] = result.data || []
    setMessages(rows)
    // Being on the channel means its new posts are read: clear the sidebar badge and the bell.
    if (rows.some((row) => row.author_id !== me && !row.read_by?.includes(me))) { await api('/api/inbox/channel/read', { method: 'POST' }); countsChanged(); log('team channel marked read') }
  }).catch((error) => { log('channel load failed', error); toast.error(userFacingError(error)) }), [me])
  useEffect(() => {
    log('opening team channel'); load()
    const timer = window.setInterval(load, 8000)  // backup for when the live connection is down
    const onRefresh = (event: Event) => { if ((event as CustomEvent<{ kind?: string }>).detail?.kind !== 'call') load() }
    window.addEventListener('inbox:refresh', onRefresh)
    return () => { window.clearInterval(timer); window.removeEventListener('inbox:refresh', onRefresh) }
  }, [load])
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [messages.length])
  let lastDay = ''
  return <section className="flex h-[calc(100dvh-88px)] flex-col overflow-hidden rounded-2xl border border-[#E9DFFF] bg-white shadow-[0_18px_40px_-34px_rgba(70,35,117,.55)] lg:h-[calc(100vh-150px)]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9DFFF] bg-gradient-to-r from-[#F8F5FF] to-white px-5 py-4">
      <div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#5A2BE6] text-white shadow-[0_12px_24px_-14px_rgba(95,52,126,.95)]"><Hash className="h-5 w-5" /></span><div className="min-w-0"><div className="text-xl font-extrabold tracking-tight text-slate-900">Team channel</div><div className="text-xs text-slate-500">Everyone in the workspace · type @ to mention someone</div></div></div>
      <div className="flex items-center"><div className="flex -space-x-2">{members.slice(0, 6).map((member) => <span key={member.id} title={`${member.name} · ${roleLabel(member.role)}`} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#8B5CF6] to-[#5A2BE6] text-[10px] font-bold text-white">{initials(member.name)}</span>)}</div><span className="ml-2 text-xs font-semibold text-slate-500">{members.length} member{members.length === 1 ? '' : 's'}</span></div>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-[#F8F5FF] to-white px-5 py-4">{messages.length ? <div className="space-y-1">{messages.map((message) => {
      const date = asDate(message.created_at); const day = date ? date.toDateString() : ''; const separator = day && day !== lastDay ? <DaySeparator label={dayLabel(date!)} /> : null; lastDay = day || lastDay
      return <div key={message._id}>{separator}<MessageRow message={message} onChanged={load} onOpenConversation={onOpenConversation} /></div>
    })}</div> : <Empty text="No messages yet. Say hello to your team — or @mention someone to start a private thread with them." />}<div ref={bottom} /></div>
    <div className="border-t border-[#E9DFFF] px-5 pb-3 pt-3"><Composer placeholder="Message the team — type @ to mention" onDone={load} boxed label="Team message" /><p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500"><Lock className="h-3 w-3" />Mention someone with @ and only they (and you) will see that message. Without a mention, the whole team sees it.</p></div>
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

  return <div className={`group flex gap-3 rounded-xl p-2 ${mentionsMe ? 'bg-[#F1EBFF]' : 'hover:bg-slate-50/60'} ${deleting ? 'opacity-50' : ''}`}>
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1EBFF] text-[11px] font-bold text-[#5A2BE6]">{initials(message.author_name)}</span>
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline gap-2 text-xs"><span className="font-semibold text-slate-900">{mine ? 'You' : message.author_name}</span><span className="text-slate-400">{clock(message.created_at)}{message.edited_at ? ' · edited' : ''}</span>
        {!editing && (mine || canModerate) && <span className="ml-auto flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          {mine && <button type="button" onClick={() => setEditing(true)} aria-label="Edit message" title="Edit" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-3.5 w-3.5" /></button>}
          <button type="button" onClick={remove} aria-label="Delete message" title="Delete" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-purple-50 hover:text-purple-600"><Trash2 className="h-3.5 w-3.5" /></button>
        </span>}
      </div>
      {editing ? <div className="mt-1"><Composer editing={message} placeholder="Edit message" initialText={message.text} initialMentions={members.filter((member) => message.mentions?.includes(member.id))} onDone={() => { setEditing(false); onChanged() }} onCancel={() => setEditing(false)} /></div>
        : <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{parts.map((part, index) => part.startsWith('@') && names.includes(part.slice(1)) ? <span key={index} className="rounded bg-[#F1EBFF] px-1 font-semibold text-[#5A2BE6]">{part}</span> : part)}</p>}
      {message.conversation_id && onOpenConversation && !editing && <button type="button" onClick={() => onOpenConversation(message.conversation_id!)} className="mt-1 text-[11px] font-semibold text-[#6C3BFF] hover:underline">Open linked conversation</button>}
    </div>
  </div>
}

/** Text box with @mention autocomplete, for new messages and edits. Mentions are sent as user ids; the backend notifies each person.
    "boxed" gives the Podium composer look (bordered box, toolbar, Send and close, key hints). */
function Composer({ id, conversationId, placeholder, onDone, editing, onCancel, onSendAndClose, boxed, label = 'Internal note', initialText = '', initialMentions = [] }: { id?: string; conversationId?: string; placeholder: string; onDone: () => void; editing?: TeamMessage; onCancel?: () => void; onSendAndClose?: () => void; boxed?: boolean; label?: string; initialText?: string; initialMentions?: Member[] }) {
  const { members } = useContext(Team)
  const [text, setText] = useState(initialText)
  const [picked, setPicked] = useState<Member[]>(initialMentions)
  const [sending, setSending] = useState(false)
  const box = useRef<HTMLTextAreaElement>(null)
  const query = /(?:^|\s)@([\w.-]*)$/.exec(text)?.[1]
  const suggestions = query === undefined ? [] : members.filter((member) => member.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)

  const pick = (member: Member) => {
    setText((current) => current.replace(/@[\w.-]*$/, `@${member.name} `))
    setPicked((current) => current.some((item) => item.id === member.id) ? current : [...current, member])
    log(`mention picked: ${member.name}`)
  }

  const send = async (thenClose = false) => {
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
        log('posting message', { conversationId, mentions, thenClose })
        await api('/api/inbox/channel', { method: 'POST', body: JSON.stringify({ text: body, mentions, conversation_id: conversationId || null }) })
        setText(''); setPicked([])
      }
      onDone(); countsChanged()
      if (thenClose && onSendAndClose) onSendAndClose()
    } catch (error) { log(editing ? 'edit failed' : 'post failed', error); toast.error(userFacingError(error)) } finally { setSending(false) }
  }

  const suggestionList = suggestions.length > 0 && <div className="absolute bottom-full left-0 z-10 mb-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">{suggestions.map((member) => <button key={member.id} type="button" onMouseDown={(event) => { event.preventDefault(); pick(member) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F1EBFF] text-[10px] font-bold text-[#5A2BE6]">{initials(member.name)}</span><span className="flex-1 truncate">{member.name}</span><span className="text-[10px] text-slate-400">{roleLabel(member.role)}</span></button>)}</div>
  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === 'Escape' && onCancel) onCancel(); if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (suggestions.length) pick(suggestions[0]); else send() } }

  if (boxed) return <div className="relative">
    {suggestionList}
    <div className="overflow-hidden rounded-2xl border border-[#E9DFFF] bg-white shadow-[0_10px_24px_-22px_rgba(70,35,117,.5)] transition focus-within:border-[#6C3BFF] focus-within:shadow-[0_0_0_3px_rgba(108,59,255,.12)]">
      {/* Callers are reached by voice, so the composer writes internal notes only (no outbound message tab). */}
      <div className="flex items-center gap-4 border-b border-[#F1EBFF] px-4"><span title="Notes are internal: callers never see them" className="-mb-px inline-flex items-center gap-1.5 border-b-2 border-[#6C3BFF] py-2.5 text-[13px] font-semibold text-[#5A2BE6]"><Lock className="h-3.5 w-3.5" />{label}</span></div>
      <textarea id={id} ref={box} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown} rows={2} placeholder={placeholder} className="block min-h-[56px] w-full resize-none rounded-none border-0 bg-transparent px-4 pb-1 pt-3 text-sm shadow-none outline-none focus:shadow-none" />
      <div className="flex items-center justify-between gap-2 px-2 pb-2">
        <button type="button" onClick={() => { setText((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}@`); box.current?.focus() }} title="Mention a teammate" aria-label="Mention a teammate" className="rounded-lg p-2 text-[#6C3BFF] transition hover:bg-[#F1EBFF]"><AtSign className="h-4 w-4" /></button>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 hidden text-[11px] text-slate-400 md:inline">Shift + Enter for new line</span>
          {onSendAndClose && <button type="button" onClick={() => send(true)} disabled={!text.trim() || sending} className="h-9 rounded-lg border border-[#D8C8FF] px-3 text-[13px] font-semibold text-[#5A2BE6] transition hover:border-[#6C3BFF] disabled:opacity-40">Send and close</button>}
          <button type="button" onClick={() => send()} disabled={!text.trim() || sending} aria-label="Send" title="Send (Enter)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6C3BFF] text-white shadow-[0_8px_18px_-10px_rgba(108,59,255,.9)] transition hover:brightness-110 disabled:opacity-40">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
        </div>
      </div>
    </div>
  </div>

  return <div className="relative">
    {suggestionList}
    <div className="flex items-end gap-2">
      <textarea id={id} ref={box} autoFocus={Boolean(editing)} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown} rows={2} placeholder={placeholder} className="min-h-[44px] flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
      {onCancel && <button type="button" onClick={onCancel} aria-label="Cancel edit" title="Cancel (Esc)" className="action-button action-button-neutral inline-flex h-10 w-10 items-center justify-center rounded-md"><X className="h-4 w-4" /></button>}
      <button type="button" onClick={() => send()} disabled={!text.trim() || sending} aria-label={editing ? 'Save' : 'Send'} title={editing ? 'Save (Enter)' : 'Send (Enter)'} className="action-button action-button-primary inline-flex h-10 w-10 items-center justify-center rounded-md disabled:opacity-40">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
    </div>
  </div>
}
