'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, LayoutGrid, ListChecks, Sparkles, Table2, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { api, DataState } from '@/components/PlatformUI'
import { ListPaging, readListWindow, type ListPage } from '@/components/ListPaging'
import { Avatar, EmptyHint, timeAgo } from '@/components/premium'
import { TASK_STAGES } from '@/components/omni-data'
import { stageInfo } from '@/components/stages'
import { ANY_TIME, DayRangeMenu, rangeLabel, rangeQuery, type DayRange } from '@/components/day-range'

type Thread = { key: string; name: string; phone?: string; preview?: string; summary?: string; last_at?: string; stage?: string; stage_reason?: string; stage_by_name?: string; stage_at?: string; assigned_to?: string; assigned_to_name?: string }

/** Tasks: every open conversation in a status where the team has to act (callbacks, scheduling, follow-ups,
    servicing, payments). The same numbers as those Status items in the sidebar; real conversations only. */
export default function TasksPage() {
  const [groups, setGroups] = useState<Record<string, Thread[]>>({})
  const [pages, setPages] = useState<Record<string, ListPage<Thread>>>({})
  const pageCounts = useRef<Record<string, number>>({})
  const requestId = useRef(0)
  const [moreLoading, setMoreLoading] = useState('')
  const [me, setMe] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)
  const [range, setRange] = useState<DayRange>(ANY_TIME)  // when the conversation moved into its status
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const request = ++requestId.current
    setError('')
    try {
      const [members, ...lists] = await Promise.all([
        api<{ me: string }>('/api/inbox/members'),
        ...TASK_STAGES.map((stage) => readListWindow<Thread>(`/api/inbox/conversations?folder=${onlyMine ? 'mine' : 'all'}&state=open&stage=${stage}${rangeQuery(range)}`, pageCounts.current[stage] || 1)),
      ])
      if (request !== requestId.current) return
      setPages(Object.fromEntries(TASK_STAGES.map((stage, index) => [stage, lists[index]])))
      setMe(members.me)
      setGroups(Object.fromEntries(TASK_STAGES.map((stage, index) => [stage, lists[index].data || []])))
    } catch (exception) { if (request === requestId.current) setError(exception instanceof Error ? exception.message : 'Unable to load tasks') }
    finally { if (request === requestId.current) { setLoading(false); setMoreLoading('') } }
  }, [range, onlyMine])
  useEffect(() => { pageCounts.current = {}; setLoading(true); void load() }, [load])
  // Live: refresh when anything in the inbox changes (new call, status change, assignment).
  useEffect(() => { window.addEventListener('inbox:refresh', load); return () => window.removeEventListener('inbox:refresh', load) }, [load])

  const visible = (rows: Thread[]) => onlyMine ? rows.filter((row) => row.assigned_to === me) : rows
  const total = TASK_STAGES.reduce((sum, stage) => sum + (pages[stage]?.total || 0), 0)

  return <div className="space-y-4">
    <PageHeader title="Tasks" description="Conversations where the team has something to do, sorted by status. The AI files each call here from what the caller asked for." icon={ListChecks}
      actions={<div className="flex flex-wrap items-center gap-2">
        <DayRangeMenu value={range} onChange={setRange} className="w-44" />
        <div className="flex rounded-xl bg-[#F1EBFF] p-1 text-xs font-semibold" role="group" aria-label="Task assignment filter">{[false, true].map((mine) => <button key={String(mine)} type="button" onClick={() => setOnlyMine(mine)} aria-pressed={onlyMine === mine} className={`h-8 rounded-lg px-3 transition ${onlyMine === mine ? 'bg-white text-[#5A2BE6] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{mine ? 'Assigned to me' : 'All tasks'}</button>)}</div>
        <div className="flex rounded-xl bg-[#F1EBFF] p-1 text-xs font-semibold" role="group" aria-label="Task view">{([{ id: 'cards', label: 'Cards', Icon: LayoutGrid }, { id: 'table', label: 'Table', Icon: Table2 }] as const).map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => setView(id)} aria-pressed={view === id} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 transition ${view === id ? 'bg-white text-[#5A2BE6] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div>
      </div>} />
    <DataState loading={loading} error={error} onRetry={load}>
      {total === 0 ? <div className="surface-panel rounded-2xl p-6"><EmptyHint text={range.id !== 'any' ? `No tasks filed ${range.id === 'date' ? `on ${rangeLabel(range)}` : rangeLabel(range).toLowerCase()}${onlyMine ? ' for you' : ''}. Pick another day or clear the filter.` : onlyMine ? 'Nothing assigned to you needs action right now.' : 'No open tasks. Calls asking for a callback, a time, a follow-up, a service or a payment appear here.'} /></div>
        : view === 'cards' ? <div className="grid gap-4 xl:grid-cols-2">{TASK_STAGES.map((stage) => {
          const rows = visible(groups[stage] || [])
          if (!rows.length) return null
          const info = stageInfo(stage)
          return <section key={stage} className="surface-panel overflow-hidden rounded-2xl">
            <header className="flex items-center gap-3 border-b border-[#E9DFFF] bg-gradient-to-r from-[#F8F5FF] to-white px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1EBFF] text-[#6C3BFF]"><info.icon className="h-4 w-4" /></span>
              <h2 className="flex-1 text-[15px] font-bold text-slate-900">{info.label}</h2>
              <Link href={`/inbox/status/${stage}`} title={`Open all ${info.label}`} className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#F1EBFF] px-2.5 text-xs font-bold text-[#5A2BE6] hover:bg-[#E9DFFF]">{pages[stage]?.total || 0}</Link>
            </header>
            <div className="grid gap-2 p-3 sm:grid-cols-2">{rows.map((row) => <article key={row.key} className="min-w-0 rounded-xl border border-[#E9DFFF] bg-white p-3 transition hover:border-[#D8C8FF] hover:bg-[#FCFBFF]">
              <div className="flex min-w-0 items-start gap-2.5"><Avatar name={row.name} size="sm" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><Link href={`/inbox?open=${encodeURIComponent(row.key)}`} className="truncate text-sm font-bold text-slate-900 hover:text-[#5A2BE6]">{row.name || row.phone || 'Unknown caller'}</Link><span className="shrink-0 text-[10px] text-slate-400">{timeAgo(row.stage_at || row.last_at)}</span></div>{row.phone && <p className="mt-0.5 truncate text-[11px] text-slate-500">{row.phone}</p>}</div></div>
              <p className="mt-2 line-clamp-2 min-h-10 text-[12px] leading-5 text-slate-600">{row.stage_reason || row.summary || row.preview || 'Open the conversation for details.'}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="inline-flex min-w-0 items-center gap-1 rounded-lg bg-[#F8F5FF] px-2 py-1 text-[10px] font-medium text-slate-600"><UserRound className="h-3 w-3 shrink-0" /><span className="truncate">{row.assigned_to ? (row.assigned_to === me ? 'You' : row.assigned_to_name || 'Assigned') : 'Unassigned'}</span></span>{row.stage_reason && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#6C3BFF]"><Sparkles className="h-3 w-3" />{row.stage_by_name || 'AI assistant'}</span>}</div>
              <div className="mt-2 flex justify-end"><Link href={`/inbox?open=${encodeURIComponent(row.key)}`} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#D8C8FF] px-2.5 text-xs font-semibold text-[#5A2BE6] transition hover:border-[#6C3BFF]">Open<ArrowRight className="h-3.5 w-3.5" /></Link></div>
            </article>)}</div>
            <ListPaging loaded={rows.length} total={pages[stage]?.total || 0} hasMore={Boolean(pages[stage]?.next_cursor)} loading={moreLoading === stage} noun="tasks" onMore={() => { pageCounts.current[stage] = (pageCounts.current[stage] || 1) + 1; setMoreLoading(stage); void load() }} />
          </section>
        })}</div> : <div className="space-y-4">{TASK_STAGES.map((stage) => {
          const rows = visible(groups[stage] || [])
          if (!rows.length) return null
          const info = stageInfo(stage)
          return <section key={stage} className="surface-panel overflow-hidden rounded-2xl">
            <header className="flex items-center gap-3 border-b border-[#E9DFFF] bg-gradient-to-r from-[#F8F5FF] to-white px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1EBFF] text-[#6C3BFF]"><info.icon className="h-4 w-4" /></span>
              <h2 className="flex-1 text-[15px] font-bold text-slate-900">{info.label}</h2>
              <Link href={`/inbox/status/${stage}`} title={`Open all ${info.label}`} className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#F1EBFF] px-2.5 text-xs font-bold text-[#5A2BE6] hover:bg-[#E9DFFF]">{pages[stage]?.total || 0}</Link>
            </header>
            <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm" aria-label={`${info.label} tasks`}>
              <thead className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-[.1em] text-slate-500"><tr><th className="px-4 py-3">Conversation</th><th className="px-4 py-3">Task details</th><th className="px-3 py-3">Assigned to</th><th className="px-3 py-3">Updated</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.key} className="transition hover:bg-[#FCFBFF]">
                <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar name={row.name} size="sm" /><div className="min-w-0"><Link href={`/inbox?open=${encodeURIComponent(row.key)}`} className="block max-w-[230px] truncate font-semibold text-slate-900 hover:text-[#5A2BE6]">{row.name || row.phone || 'Unknown caller'}</Link>{row.phone && <span className="block max-w-[230px] truncate text-xs text-slate-500">{row.phone}</span>}</div></div></td>
                <td className="max-w-[360px] px-4 py-3"><p className="line-clamp-2 text-[13px] leading-5 text-slate-600">{row.stage_reason || row.summary || row.preview || 'Open the conversation for details.'}</p>{row.stage_reason && <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-[#6C3BFF]"><Sparkles className="h-3 w-3" />{row.stage_by_name || 'AI assistant'}</span>}</td>
                <td className="px-3 py-3"><span className="inline-flex items-center gap-1.5 text-xs text-slate-600"><UserRound className="h-3.5 w-3.5 text-slate-400" />{row.assigned_to ? (row.assigned_to === me ? 'You' : row.assigned_to_name || 'Assigned') : 'Unassigned'}</span></td>
                <td className="px-3 py-3 text-xs text-slate-500">{timeAgo(row.stage_at || row.last_at)}</td>
                <td className="px-4 py-3 text-right"><Link href={`/inbox?open=${encodeURIComponent(row.key)}`} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#D8C8FF] px-2.5 text-xs font-semibold text-[#5A2BE6] transition hover:border-[#6C3BFF]">Open<ArrowRight className="h-3.5 w-3.5" /></Link></td>
              </tr>)}</tbody>
            </table></div>
            <ListPaging loaded={rows.length} total={pages[stage]?.total || 0} hasMore={Boolean(pages[stage]?.next_cursor)} loading={moreLoading === stage} noun="tasks" onMore={() => { pageCounts.current[stage] = (pageCounts.current[stage] || 1) + 1; setMoreLoading(stage); void load() }} />
          </section>
        })}</div>}
    </DataState>
  </div>
}
