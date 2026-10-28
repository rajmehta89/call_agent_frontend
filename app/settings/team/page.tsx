'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { BarChart3, Check, Copy, Link2, MailPlus, UserMinus, UserPlus, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '../../../components/OmniPage'
import { ActionButton, DataState, StatusBadge, api, roleLabel, userFacingError, Spinner } from '../../../components/PlatformUI'

// The two roles a team needs (auth_service.DEFAULT_ROLES). "agent" is the team member role's internal name.
const TEAM_ROLES = [
  { name: 'agent', label: 'Team member', description: 'Works the inbox: conversations assigned to them, @mentions and the team channel, plus calls and their leads.' },
  { name: 'admin', label: 'Admin', description: 'Everything, including this Team page and settings. Assigns conversations to team members.' },
]
type Row = { _id: string; name: string; email: string; role: string; active?: boolean; member_type: 'user' | 'invitation'; invitation_status: string; created_at?: string; expires_at?: string }
type Invite = { email: string; invite_url: string; delivery: string }

/** Browser-console trace for every team action; filter the console by "[team]". */
const log = (message: string, ...details: unknown[]) => console.info(`[team] ${message}`, ...details)
const shortDate = (value?: string) => { const date = new Date(value || ''); return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) }

export default function TeamSettingsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [me, setMe] = useState('')
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', role: 'agent' })
  const [sending, setSending] = useState(false)
  const [invite, setInvite] = useState<Invite | null>(null)
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    log('loading team')
    try {
      const [team, profile] = await Promise.all([api('/api/platform/team'), api('/api/auth/me')])
      setRows(team.data || []); setMe(profile.data?.id || '')
      const permissions = ['owner', 'admin'].includes(String(profile.data?.role || '').toLowerCase()) ? ['*'] : (profile.data?.permissions || [])
      setCanManage(permissions.includes('*') || permissions.includes('manage_team'))
      log(`team loaded: ${team.data?.length || 0} rows`)
    } catch (err) { log('team load failed', err); setError(userFacingError(err)) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const sendInvite = async (event: FormEvent) => {
    event.preventDefault()
    setSending(true)
    log('inviting', { email: form.email, role: form.role })
    try {
      const result = await api('/api/platform/team', { method: 'POST', body: JSON.stringify(form) })
      setInvite({ email: form.email, invite_url: result.data.invite_url, delivery: result.data.delivery })
      toast.success(`Invitation created for ${form.email}`)
      setForm({ name: '', email: '', role: form.role })
      load()
    } catch (err) { log('invite failed', err); toast.error(userFacingError(err)) } finally { setSending(false) }
  }

  const act = async (row: Row, label: string, request: () => Promise<unknown>) => {
    setBusy(row._id)
    log(`${label} ${row.email}`)
    try { await request(); toast.success(`${row.name || row.email}: ${label}`); await load() }
    catch (err) { log(`${label} failed`, err); toast.error(userFacingError(err)) } finally { setBusy('') }
  }
  const changeRole = (row: Row, role: string) => act(row, `role changed to ${role}`, () => api(`/api/platform/team/${row._id}`, { method: 'PUT', body: JSON.stringify({ role }) }))
  const setActive = (row: Row, active: boolean) => act(row, active ? 'reactivated' : 'deactivated', () => active ? api(`/api/platform/team/${row._id}`, { method: 'PUT', body: JSON.stringify({ active: true }) }) : api(`/api/platform/team/${row._id}`, { method: 'DELETE' }))
  const revoke = (row: Row) => act(row, 'invitation revoked', () => api(`/api/platform/team/invitations/${row._id}`, { method: 'DELETE' }))

  const members = rows.filter((row) => row.member_type === 'user')
  const pending = rows.filter((row) => row.member_type === 'invitation')

  return <div className="space-y-6">
    <PageHeader title="Team" description="See everyone in this workspace. Admins can invite people, manage access, and review workload." actions={canManage ? <Link href="/settings/team/performance" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6C3BFF] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_-14px_rgba(150,77,234,.9)] hover:bg-[#5A2BE6]"><BarChart3 className="h-4 w-4" />Performance</Link> : undefined} />

    {canManage ? <section className="surface-panel p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><MailPlus className="h-4 w-4 text-[#6C3BFF]" />Invite a teammate</div>
      <form onSubmit={sendInvite} className="mt-4 grid gap-3 md:grid-cols-[1fr_1.3fr_180px_auto]">
        <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Full name" aria-label="Full name" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
        <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@company.com" aria-label="Email" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} aria-label="Role" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">{TEAM_ROLES.map((role) => <option key={role.name} value={role.name}>{role.label}</option>)}</select>
        <button type="submit" disabled={sending} className="action-button action-button-primary inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold disabled:opacity-50">{sending ? <Spinner /> : <UserPlus className="h-4 w-4" />}Send invite</button>
      </form>
      <p className="mt-2 text-xs text-slate-500">{TEAM_ROLES.find((role) => role.name === form.role)?.description}</p>
      {invite && <InviteLink invite={invite} onClose={() => setInvite(null)} />}
    </section> : <section className="surface-panel flex items-start gap-3 p-5"><Users className="mt-0.5 h-5 w-5 shrink-0 text-[#6C3BFF]" /><div><div className="text-sm font-bold text-slate-900">Workspace team</div><p className="mt-1 text-sm leading-6 text-slate-500">You can see the current roster here. Ask an Admin if you need someone invited or access changed.</p></div></section>}

    <RoleGuide />

    <DataState loading={loading} error={error} onRetry={load}>
      <section className="surface-panel overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4"><div className="text-sm font-bold text-slate-900">Members</div><div className="mt-1 text-xs text-slate-500">{members.filter((row) => row.active !== false).length} active · {members.filter((row) => row.active === false).length} deactivated</div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-[.12em] text-slate-400"><tr><th className="px-5 py-3">Person</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Joined</th><th className="px-5 py-3 text-right">Access</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{members.map((row) => { const self = row._id === me; const owner = row.role === 'owner'; const locked = self || owner; return <tr key={row._id} className={busy === row._id ? 'opacity-50' : ''}>
            <td className="px-5 py-3.5"><div className="font-semibold text-slate-800">{row.name}{self && <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>}</div><div className="mt-0.5 text-xs text-slate-500">{row.email}</div></td>
            <td className="px-3 py-3.5">{locked || !canManage ? <span className="text-xs font-semibold text-slate-600">{roleLabel(row.role)}</span> : <select value={row.role} onChange={(event) => changeRole(row, event.target.value)} aria-label={`Role for ${row.name}`} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs">{TEAM_ROLES.map((role) => <option key={role.name} value={role.name}>{role.label}</option>)}</select>}</td>
            <td className="px-3 py-3.5"><StatusBadge value={row.active === false ? 'disabled' : 'active'} /></td>
            <td className="px-3 py-3.5 text-xs text-slate-500">{shortDate(row.created_at)}</td>
            <td className="px-5 py-3.5 text-right">{!canManage ? <span className="text-xs text-slate-400">View only</span> : locked ? <span className="text-xs text-slate-400">{owner ? 'Owner' : 'Your account'}</span> : row.active === false ? <ActionButton onClick={() => setActive(row, true)} icon={<Check className="h-4 w-4" />}>Reactivate</ActionButton> : <ActionButton tone="danger" onClick={() => { if (window.confirm(`Remove access for ${row.name}? They are signed out straight away.`)) setActive(row, false) }} icon={<UserMinus className="h-4 w-4" />}>Deactivate</ActionButton>}</td>
          </tr> })}</tbody>
        </table></div>
      </section>

      {pending.length > 0 && <section className="surface-panel mt-6 overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4"><div className="text-sm font-bold text-slate-900">Pending invitations</div><div className="mt-1 text-xs text-slate-500">Waiting for these people to open their invite link and set a password.</div></div>
        <div className="divide-y divide-slate-100">{pending.map((row) => <div key={row._id} className={`flex flex-wrap items-center gap-3 px-5 py-3.5 ${busy === row._id ? 'opacity-50' : ''}`}>
          <div className="min-w-0 flex-1"><div className="font-semibold text-slate-800">{row.name}</div><div className="mt-0.5 text-xs text-slate-500">{row.email} · <span>{roleLabel(row.role)}</span> · expires {shortDate(row.expires_at)}</div></div>
          {canManage && <ActionButton tone="danger" onClick={() => revoke(row)} icon={<X className="h-4 w-4" />}>Revoke</ActionButton>}
        </div>)}</div>
      </section>}
    </DataState>
  </div>
}

function RoleGuide() {
  return <section className="grid gap-4 md:grid-cols-2">
    <div className="surface-panel p-5"><div className="text-sm font-bold text-slate-900">Team member</div><p className="mt-1 text-xs leading-5 text-slate-600">For the people who talk to customers. They see the inbox, get conversations assigned to them (<b>Assigned to You</b>), get @mentions and use the team channel. They also get calls and their own leads.</p></div>
    <div className="surface-panel p-5"><div className="text-sm font-bold text-slate-900">Admin</div><p className="mt-1 text-xs leading-5 text-slate-600">For people who run the workspace with you. Everything a team member has, plus assigning conversations (<b>Assigned</b>), this Team page and all settings. Admins hand out work; they are not assigned it.</p></div>
  </section>
}

/** Shown right after inviting. Email delivery is optional, so the link is always shown to copy and send. */
function InviteLink({ invite, onClose }: { invite: Invite; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => { await navigator.clipboard.writeText(invite.invite_url); setCopied(true); log(`invite link copied for ${invite.email}`); window.setTimeout(() => setCopied(false), 2000) }
  return <div className="mt-4 rounded-xl border border-[#E9DFFF] bg-[#F8F5FF] p-4">
    <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Link2 className="h-4 w-4 text-[#6C3BFF]" />Invite link for {invite.email}</div><button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-white"><X className="h-4 w-4" /></button></div>
    <p className="mt-1 text-xs text-slate-600">{invite.delivery === 'queued' ? 'An email is on its way. You can also send this link yourself.' : 'Email sending is not set up, so send this link to them yourself.'} It works once and expires in 7 days. This is the only time it is shown.</p>
    <div className="mt-3 flex gap-2"><input readOnly value={invite.invite_url} onFocus={(event) => event.target.select()} aria-label="Invite link" className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 font-mono text-xs" /><ActionButton primary onClick={copy} icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>{copied ? 'Copied' : 'Copy'}</ActionButton></div>
    <p className="mt-2 text-[11px] text-slate-500">Testing it yourself? Open the link in a private/incognito window, so you stay signed in here as admin.</p>
  </div>
}
