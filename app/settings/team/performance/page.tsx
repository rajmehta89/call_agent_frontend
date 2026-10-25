'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BarChart3, CheckCircle2, Clock3, ListChecks, PhoneCall, RefreshCw, Users, UserRound } from 'lucide-react'
import { PageHeader } from '../../../../components/OmniPage'
import { api, DataState, roleLabel, userFacingError } from '../../../../components/PlatformUI'
import { titleCase } from '../../../../components/PlatformUI'

type MemberMetric = {
  id: string; name: string; email: string; role: string; assigned_conversations: number; assigned_calls: number
  handled_calls: number; closed_conversations: number; follow_ups: number; open_tasks: number; won: number; assigned_leads: number; last_activity?: string
}
type Performance = { days: number; members: MemberMetric[]; totals: Record<string, number> }

const formatNumber = (value?: number) => new Intl.NumberFormat('en-IN').format(value || 0)
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString([], { day: '2-digit', month: 'short' }) : '—'

export default function TeamPerformancePage() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Performance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const result = await api<{ data: Performance }>(`/api/platform/team/performance?days=${days}`); setData(result.data) }
    catch (exception) { setError(userFacingError(exception, 'Only workspace admins can view team performance.')) }
    finally { setLoading(false) }
  }, [days])
  useEffect(() => { load() }, [load])

  const totals = data?.totals || {}
  const ranked = useMemo(() => [...(data?.members || [])].sort((a, b) => b.handled_calls - a.handled_calls || b.assigned_calls - a.assigned_calls), [data?.members])
  const rangeLabel = days === 0 ? 'All time' : `Last ${days} days`

  return <div className="space-y-6">
    <PageHeader title="Team performance" description={`See workload, completed calls, and follow-up coverage for ${rangeLabel.toLowerCase()}.`} icon={BarChart3}
      actions={<div className="flex flex-wrap items-center gap-2"><Link href="/settings/team" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E9DFFF] bg-white px-4 text-sm font-semibold text-slate-700 hover:border-[#6C3BFF]"><ArrowLeft className="h-4 w-4" />Team</Link><select value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="Performance date range" className="h-10 rounded-xl border border-[#E9DFFF] bg-white px-3 text-sm font-semibold text-slate-700"><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={0}>All time</option></select><button type="button" onClick={load} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E9DFFF] bg-white px-3 text-sm font-semibold text-slate-700 hover:border-[#6C3BFF]"><RefreshCw className="h-4 w-4" />Refresh</button></div>} />

    <DataState loading={loading} error={error} onRetry={load}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        <Metric label="Active members" value={totals.active_members} hint="in this workspace" icon={Users} />
        <Metric label="Assigned calls" value={totals.assigned_calls} hint={rangeLabel} icon={PhoneCall} />
        <Metric label="Handled calls" value={totals.handled_calls} hint="completed or transferred" icon={CheckCircle2} />
        <Metric label="Closed conversations" value={totals.closed_conversations} hint="completed by owner" icon={CheckCircle2} />
        <Metric label="Open follow-ups" value={totals.follow_ups} hint="needs a next touch" icon={Clock3} tone="amber" />
        <Metric label="Open tasks" value={totals.open_tasks} hint="across active stages" icon={ListChecks} />
        <Metric label="Unassigned" value={totals.unassigned_conversations} hint="open conversations" icon={UserRound} tone="rose" />
      </div>

      <section className="surface-panel overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E9DFFF] px-5 py-4"><div><h2 className="text-base font-bold text-slate-900">Member activity</h2><p className="mt-1 text-xs text-slate-500">Who owns the work, who has handled calls, and where follow-up is waiting.</p></div><span className="text-xs font-semibold text-slate-400">{rangeLabel}</span></div>
        {ranked.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">No active team members yet.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-[.12em] text-slate-400"><tr><th className="px-5 py-3">Member</th><th className="px-3 py-3 text-right">Assigned calls</th><th className="px-3 py-3 text-right">Handled</th><th className="px-3 py-3 text-right">Conversations</th><th className="px-3 py-3 text-right">Closed</th><th className="px-3 py-3 text-right">Follow-ups</th><th className="px-3 py-3 text-right">Open tasks</th><th className="px-5 py-3 text-right">Last call</th></tr></thead><tbody className="divide-y divide-slate-100">{ranked.map((member) => <tr key={member.id} className="hover:bg-[#FBFAFF]"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1EBFF] text-xs font-extrabold text-[#5A2BE6]">{initials(member.name)}</span><div><div className="font-semibold text-slate-800">{titleCase(member.name)}{member.role === 'owner' && <span className="ml-2 rounded-full bg-[#F1EBFF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#5A2BE6]">Owner</span>}</div><div className="mt-0.5 text-xs text-slate-500">{member.email} · {roleLabel(member.role)}</div></div></div></td><td className="px-3 py-4 text-right font-semibold text-slate-800">{formatNumber(member.assigned_calls)}</td><td className="px-3 py-4 text-right"><span className="font-semibold text-slate-800">{formatNumber(member.handled_calls)}</span><span className="ml-1 text-xs text-slate-400">{member.assigned_calls ? `${Math.round((member.handled_calls / member.assigned_calls) * 100)}%` : '—'}</span></td><td className="px-3 py-4 text-right text-slate-700">{formatNumber(member.assigned_conversations)}</td><td className="px-3 py-4 text-right text-slate-700">{formatNumber(member.closed_conversations)}</td><td className="px-3 py-4 text-right"><span className={member.follow_ups ? 'font-semibold text-amber-700' : 'text-slate-500'}>{formatNumber(member.follow_ups)}</span></td><td className="px-3 py-4 text-right text-slate-700">{formatNumber(member.open_tasks)}</td><td className="px-5 py-4 text-right text-xs text-slate-500">{formatDate(member.last_activity)}</td></tr>)}</tbody></table></div>}
      </section>

      <div className="grid gap-4 lg:grid-cols-3"><Insight title="Coverage" value={`${formatNumber(totals.assigned_leads)} leads owned`} detail={`${formatNumber(totals.assigned_conversations)} conversations assigned in the selected range.`} /><Insight title="Follow-up queue" value={`${formatNumber(totals.follow_ups)} open`} detail="These are conversations currently in the Follow-up stage and not closed." tone="amber" /><Insight title="Conversion signal" value={`${formatNumber(totals.won)} won`} detail="Conversations currently marked Won across the active team." tone="green" /></div>
    </DataState>
  </div>
}

function initials(value: string) { const parts = value.split(/\s+/).filter(Boolean); return (parts.length > 1 ? parts.slice(0, 2).map((part) => part[0]).join('') : (parts[0] || 'T').slice(0, 2)).toUpperCase() }
function Metric({ label, value, hint, icon: Icon, tone = 'default' }: { label: string; value?: number; hint: string; icon: any; tone?: 'default' | 'amber' | 'rose' }) { const toneClass = tone === 'amber' ? 'bg-amber-50 text-amber-700' : tone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-[#F1EBFF] text-[#5A2BE6]'; return <div className="surface-panel rounded-2xl p-4"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClass}`}><Icon className="h-4 w-4" /></span><div className="mt-4 text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">{label}</div><div className="mt-1 text-2xl font-extrabold tracking-[-.04em] text-slate-900">{formatNumber(value)}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></div> }
function Insight({ title, value, detail, tone = 'default' }: { title: string; value: string; detail: string; tone?: 'default' | 'amber' | 'green' }) { const color = tone === 'amber' ? 'text-amber-700' : tone === 'green' ? 'text-emerald-700' : 'text-[#5A2BE6]'; return <section className="surface-panel rounded-2xl p-5"><div className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">{title}</div><div className={`mt-2 text-lg font-extrabold ${color}`}>{value}</div><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></section> }
