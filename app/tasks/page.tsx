'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, ListChecks, Sparkles, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { api, DataState } from '@/components/PlatformUI'
import { Avatar, EmptyHint, timeAgo } from '@/components/premium'
import { TASK_STAGES } from '@/components/omni-data'
import { stageInfo } from '@/components/stages'

type Thread = { key: string; name: string; phone?: string; preview?: string; summary?: string; last_at?: string; stage?: string; stage_reason?: string; stage_by_name?: string; stage_at?: string; assigned_to?: string; assigned_to_name?: string }

/** Tasks: every open conversation in a status where the team has to act (callbacks, scheduling, follow-ups,
    servicing, payments). The same numbers as those Status items in the sidebar; real conversations only. */
export default function TasksPage() {
  const [groups, setGroups] = useState<Record<string, Thread[]>>({})
  const [me, setMe] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const [members, ...lists] = await Promise.all([
        api<{ me: string }>('/api/inbox/members'),
        ...TASK_STAGES.map((stage) => api<{ data: Thread[] }>(`/api/inbox/conversations?folder=all&state=open&stage=${stage}`)),
      ])
      setMe(members.me)
      setGroups(Object.fromEntries(TASK_STAGES.map((stage, index) => [stage, lists[index].data || []])))
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Unable to load tasks') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  // Live: refresh when anything in the inbox changes (new call, status change, assignment).
  useEffect(() => { window.addEventListener('inbox:refresh', load); return () => window.removeEventListener('inbox:refresh', load) }, [load])

  const visible = (rows: Thread[]) => onlyMine ? rows.filter((row) => row.assigned_to === me) : rows
  const total = TASK_STAGES.reduce((sum, stage) => sum + visible(groups[stage] || []).length, 0)

  return <div className="space-y-4">
    <PageHeader title="Tasks" description="Conversations where the team has something to do, sorted by status. The AI files each call here from what the caller asked for." icon={ListChecks}
      actions={<div className="flex rounded-xl bg-[#F1EBFF] p-1 text-xs font-semibold">{[false, true].map((mine) => <button key={String(mine)} type="button" onClick={() => setOnlyMine(mine)} className={`h-8 rounded-lg px-3 transition ${onlyMine === mine ? 'bg-white text-[#5A2BE6] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{mine ? 'Assigned to me' : 'All tasks'}</button>)}</div>} />
    <DataState loading={loading} error={error} onRetry={load}>
      {total === 0 ? <div className="surface-panel rounded-2xl p-6"><EmptyHint text={onlyMine ? 'Nothing assigned to you needs action right now.' : 'No open tasks. Calls asking for a callback, a time, a follow-up, a service or a payment appear here.'} /></div>
        : <div className="grid gap-4 xl:grid-cols-2">{TASK_STAGES.map((stage) => {
          const rows = visible(groups[stage] || [])
          if (!rows.length) return null
          const info = stageInfo(stage)
          return <section key={stage} className="surface-panel overflow-hidden rounded-2xl">
            <header className="flex items-center gap-3 border-b border-[#E9DFFF] bg-gradient-to-r from-[#F8F5FF] to-white px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1EBFF] text-[#6C3BFF]"><info.icon className="h-4 w-4" /></span>
              <h2 className="flex-1 text-[15px] font-bold text-slate-900">{info.label}</h2>
              <Link href={`/inbox/status/${stage}`} title={`Open all ${info.label}`} className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#F1EBFF] px-2.5 text-xs font-bold text-[#5A2BE6] hover:bg-[#E9DFFF]">{rows.length}</Link>
            </header>
            <ul className="divide-y divide-[#F1EBFF]">{rows.map((row) => <li key={row.key} className="flex items-start gap-3 px-4 py-3">
              <Avatar name={row.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2"><span className="truncate text-sm font-bold text-slate-900">{row.name}</span><span className="shrink-0 text-[11px] text-slate-400">{timeAgo(row.stage_at || row.last_at)}</span></div>
                <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-slate-600">{row.stage_reason || row.summary || row.preview || 'Open the conversation for details.'}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                  {row.stage_reason && <span className="inline-flex items-center gap-1 text-[#6C3BFF]"><Sparkles className="h-3 w-3" />{row.stage_by_name || 'AI assistant'}</span>}
                  <span className="inline-flex items-center gap-1 rounded-md border border-[#E9DFFF] px-1.5 py-0.5 text-slate-500"><UserRound className="h-3 w-3" />{row.assigned_to ? (row.assigned_to === me ? 'You' : row.assigned_to_name) : 'Unassigned'}</span>
                </div>
              </div>
              <Link href={`/inbox?open=${encodeURIComponent(row.key)}`} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#D8C8FF] px-2.5 py-1.5 text-xs font-semibold text-[#5A2BE6] transition hover:border-[#6C3BFF]">Open<ArrowRight className="h-3.5 w-3.5" /></Link>
            </li>)}</ul>
          </section>
        })}</div>}
    </DataState>
  </div>
}
