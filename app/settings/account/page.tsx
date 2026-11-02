'use client'

import { FormEvent, useEffect, useState } from 'react'
import { KeyRound, LogOut, Mail, Save, ShieldCheck, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '../../../components/OmniPage'
import { DataState, Loader, api, roleLabel, userFacingError, Spinner } from '../../../components/PlatformUI'
import { stopRealtime } from '../../../components/realtime'

type Me = { id: string; name: string; email: string; phone?: string; timezone?: string; role: string }
type ResetPreview = { counts: Record<string, number>; labels: Record<string, string>; total: number }

function initials(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) || email.slice(0, 1)).toUpperCase()
}

/** Browser-console trace for account actions; filter the console by "[account]". */
const log = (message: string, ...details: unknown[]) => console.info(`[account] ${message}`, ...details)
const TOKEN_KEY = 'agentflow_token'

/** Every signed-in person's own settings: name and phone, password, and signing out of other devices. */
export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState({ name: '', phone: '', timezone: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [savingPassword, setSavingPassword] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetPreview, setResetPreview] = useState<ResetPreview | null>(null)
  const [resetPhrase, setResetPhrase] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetPhraseReady, setResetPhraseReady] = useState(false)
  const [resetPasswordReady, setResetPasswordReady] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')

  const load = () => api<any>('/api/auth/me').then((result) => {
    const user: Me = result.data
    setMe(user); setProfile({ name: user.name || '', phone: user.phone || '', timezone: user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone })
  }).catch((err) => setError(userFacingError(err)))
  useEffect(() => { load() }, [])
  useEffect(() => { if (me && window.location.hash === '#call-data') document.getElementById('call-data')?.scrollIntoView({ block: 'start' }) }, [me])

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault(); setSavingProfile(true); log('saving profile')
    try { await api('/api/auth/profile', { method: 'PUT', body: JSON.stringify(profile) }); toast.success('Profile saved'); load() }
    catch (err) { log('profile save failed', err); toast.error(userFacingError(err)) } finally { setSavingProfile(false) }
  }

  const changePassword = async (event: FormEvent) => {
    event.preventDefault()
    if (passwords.next.length < 8) return toast.error('Use at least 8 characters')
    if (passwords.next !== passwords.confirm) return toast.error('The new passwords do not match')
    setSavingPassword(true); log('changing password')
    try {
      const result = await api<any>('/api/auth/password', { method: 'POST', body: JSON.stringify({ current_password: passwords.current, new_password: passwords.next }) })
      if (result.data?.token) window.localStorage.setItem(TOKEN_KEY, result.data.token)  // stay signed in here; other devices are signed out
      setPasswords({ current: '', next: '', confirm: '' })
      toast.success('Password changed. Other devices were signed out.')
    } catch (err) { log('password change failed', err); toast.error(userFacingError(err)) } finally { setSavingPassword(false) }
  }

  const signOutEverywhere = async () => {
    if (!window.confirm('Sign out on every device, including this one?')) return
    log('signing out everywhere')
    try { await api('/api/auth/logout?everywhere=true', { method: 'POST' }) } catch (err) { log('sign out everywhere failed', err) }
    stopRealtime(); window.localStorage.removeItem(TOKEN_KEY); window.location.href = '/login'
  }

  const openReset = async () => {
    setResetOpen(true); setResetError(''); setResetPhrase(''); setResetPassword(''); setResetPhraseReady(false); setResetPasswordReady(false)
    try { const result = await api<{ data: ResetPreview }>('/api/platform/data-reset/preview'); setResetPreview(result.data) }
    catch (err) { setResetError(userFacingError(err)) }
  }

  const clearData = async (event: FormEvent) => {
    event.preventDefault()
    if (resetPhrase !== 'CLEAR CALL DATA' || !resetPassword) return
    setResetting(true); setResetError('')
    try {
      const result = await api<{ data: { deleted: Record<string, number> } }>('/api/platform/data-reset', { method: 'POST', body: JSON.stringify({ confirmation: resetPhrase, password: resetPassword }) })
      const total = Object.values(result.data.deleted).reduce((sum, count) => sum + count, 0)
      toast.success(`${total} records cleared`)
      setResetOpen(false); setResetPreview(null); setResetPhrase(''); setResetPassword('')
    } catch (err) { setResetError(userFacingError(err)) } finally { setResetting(false) }
  }

  const field = (label: string, input: React.ReactNode, hint?: string) => <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>{input}{hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}</label>

  return <div className="space-y-5">
    <PageHeader title="My account" description="Manage your profile, password and sign-in sessions." />
    <DataState loading={!me && !error} error={error} onRetry={load}>
      {me && <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
        <form onSubmit={saveProfile} className="surface-panel overflow-hidden rounded-2xl">
          <div className="flex items-center gap-4 border-b border-[#EEE8F8] bg-gradient-to-r from-white via-[#FBFAFF] to-[#F4EEFF] px-5 py-5 sm:px-6">
            <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#5A2BE6] text-lg font-extrabold text-white shadow-[0_12px_24px_-14px_rgba(90,43,230,.8)]">{initials(me.name, me.email)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-bold text-slate-900">Profile details</h2><span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#5A2BE6] shadow-sm"><ShieldCheck className="h-3.5 w-3.5" />{roleLabel(me.role)}</span></div>
              <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-sm text-slate-500"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{me.email}</span></p>
            </div>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {field('Name', <input required minLength={2} maxLength={120} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />, 'Shown in the inbox, mentions and assignments.')}
              {field('Phone', <input maxLength={40} value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="+1 555 000 0000" />)}
            </div>
            {field('Time zone', <input maxLength={80} value={profile.timezone} onChange={(event) => setProfile({ ...profile, timezone: event.target.value })} />, 'Used for the time zone saved with your account.')}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">Changes apply to your account profile.</p>
              <button type="submit" disabled={savingProfile} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6C3BFF] px-4 text-sm font-semibold text-white shadow-[0_10px_20px_-12px_rgba(108,59,255,.9)] transition hover:brightness-105 disabled:opacity-50">{savingProfile ? <Spinner /> : <Save className="h-4 w-4" />}Save changes</button>
            </div>
          </div>
        </form>

        <div className="space-y-5">
          <form onSubmit={changePassword} className="surface-panel rounded-2xl p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1EBFF] text-[#6C3BFF]"><KeyRound className="h-5 w-5" /></span>
              <div><h2 className="text-base font-bold text-slate-900">Password</h2><p className="mt-0.5 text-xs text-slate-500">Update your sign-in credentials.</p></div>
            </div>
            <div className="space-y-4">
              {field('Current password', <input type="password" required autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} />)}
              {field('New password', <input type="password" required minLength={8} autoComplete="new-password" value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} />, 'At least 8 characters. Other devices will be signed out.')}
              {field('Repeat new password', <input type="password" required minLength={8} autoComplete="new-password" value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} />)}
            </div>
            <div className="mt-5 flex justify-end border-t border-slate-100 pt-4"><button type="submit" disabled={savingPassword} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6C3BFF] px-4 text-sm font-semibold text-white transition hover:bg-[#5A2BE6] disabled:opacity-50">{savingPassword ? <Spinner /> : <KeyRound className="h-4 w-4" />}Change password</button></div>
          </form>

          <section className="surface-panel rounded-2xl p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1EBFF] text-[#6C3BFF]"><LogOut className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-slate-900">Sessions</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">Sign out across all devices if one is shared or no longer in your control.</p>
                <button type="button" onClick={signOutEverywhere} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-[#D8C8FF] bg-white px-4 text-sm font-semibold text-[#5A2BE6] transition hover:border-[#6C3BFF] hover:bg-[#F8F5FF]"><LogOut className="h-4 w-4" />Sign out everywhere</button>
              </div>
            </div>
          </section>

          {(me.role === 'admin' || me.role === 'owner') && <section id="call-data" className="surface-panel scroll-mt-24 overflow-hidden rounded-2xl border border-rose-200/80">
            <div className="border-b border-rose-100 bg-gradient-to-r from-white to-rose-50/80 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700"><Trash2 className="h-5 w-5" /></span>
                <div><h2 className="text-base font-bold text-slate-900">Clear call data</h2><p className="mt-1 text-xs leading-5 text-slate-600">Remove call history and records created for call testing. Customer records, unrelated leads, campaigns, WhatsApp, and team settings stay in place.</p></div>
              </div>
              {!resetOpen ? <button type="button" onClick={openReset} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-700"><Trash2 className="h-4 w-4" />Clear all call data</button>
                : <form onSubmit={clearData} className="mt-5 space-y-4 border-t border-rose-200 pt-5">
                    {resetError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{resetError}</p>}
                    {!resetPreview ? <Loader variant="rows" count={3} label="Loading record counts" /> : <>
                      <div className="rounded-xl border border-rose-100 bg-white p-4"><div className="text-sm font-semibold text-slate-900">{resetPreview.total.toLocaleString()} call-related records</div><ul className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">{Object.entries(resetPreview.counts).map(([name, count]) => <li key={name} className="flex justify-between gap-3"><span>{resetPreview.labels[name] || name}</span><strong className="tabular-nums text-slate-800">{count.toLocaleString()}</strong></li>)}</ul></div>
                      <p className="text-xs leading-5 text-slate-600">These database records will be permanently deleted. Recordings stored at Twilio are not removed.</p>
                      {field('Type CLEAR CALL DATA', <input required name="reset-confirmation-phrase" autoComplete="off" spellCheck={false} readOnly={!resetPhraseReady} onFocus={() => setResetPhraseReady(true)} value={resetPhrase} onChange={(event) => setResetPhrase(event.target.value)} />)}
                      {field('Current password', <input required type="password" name="reset-current-password" autoComplete="off" readOnly={!resetPasswordReady} onFocus={() => setResetPasswordReady(true)} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} />)}
                      <div className="flex flex-wrap gap-2"><button type="submit" disabled={resetting || resetPhrase !== 'CLEAR CALL DATA' || !resetPassword} title={resetPhrase !== 'CLEAR CALL DATA' || !resetPassword ? 'Type CLEAR CALL DATA and your password first' : undefined} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50">{resetting ? <Spinner /> : <Trash2 className="h-4 w-4" />}Delete call data</button><button type="button" onClick={() => { setResetOpen(false); setResetPassword(''); setResetPhrase('') }} className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button></div>
                    </>}
                  </form>}
            </div>
          </section>}
        </div>
      </div>}
    </DataState>
  </div>
}
