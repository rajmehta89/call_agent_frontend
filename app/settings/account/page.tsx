'use client'

import { FormEvent, useEffect, useState } from 'react'
import { KeyRound, Loader2, LogOut, Save, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '../../../components/OmniPage'
import { DataState, api, roleLabel, userFacingError } from '../../../components/PlatformUI'
import { stopRealtime } from '../../../components/realtime'

type Me = { id: string; name: string; email: string; phone?: string; timezone?: string; role: string }

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

  const load = () => api<any>('/api/auth/me').then((result) => {
    const user: Me = result.data
    setMe(user); setProfile({ name: user.name || '', phone: user.phone || '', timezone: user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone })
  }).catch((err) => setError(userFacingError(err)))
  useEffect(() => { load() }, [])

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

  const field = (label: string, input: React.ReactNode, hint?: string) => <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>{input}{hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}</label>

  return <div className="space-y-6">
    <PageHeader title="My account" description="Your name, password and sign-in sessions. Only you can change these." />
    <DataState loading={!me && !error} error={error} onRetry={load}>
      {me && <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={saveProfile} className="surface-panel space-y-4 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900"><UserRound className="h-4 w-4 text-[#6C3BFF]" />Profile</div>
          <p className="text-sm text-slate-500">{me.email} · {roleLabel(me.role)}</p>
          {field('Name', <input required minLength={2} maxLength={120} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />, 'Shown to your team in the inbox, mentions and assignments.')}
          {field('Phone', <input maxLength={40} value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="+1 555 000 0000" />)}
          {field('Time zone', <input maxLength={80} value={profile.timezone} onChange={(event) => setProfile({ ...profile, timezone: event.target.value })} />, 'Times in the dashboard follow your browser; this is stored for your team to see.')}
          <div className="flex justify-end"><button type="submit" disabled={savingProfile} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6C3BFF] px-4 text-sm font-semibold text-white hover:bg-[#5A2BE6] disabled:opacity-50">{savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save profile</button></div>
        </form>

        <div className="space-y-6">
          <form onSubmit={changePassword} className="surface-panel space-y-4 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-base font-bold text-slate-900"><KeyRound className="h-4 w-4 text-[#6C3BFF]" />Password</div>
            {field('Current password', <input type="password" required autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} />)}
            {field('New password', <input type="password" required minLength={8} autoComplete="new-password" value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} />, 'At least 8 characters. Your other devices will be signed out.')}
            {field('Repeat new password', <input type="password" required minLength={8} autoComplete="new-password" value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} />)}
            <div className="flex justify-end"><button type="submit" disabled={savingPassword} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6C3BFF] px-4 text-sm font-semibold text-white hover:bg-[#5A2BE6] disabled:opacity-50">{savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Change password</button></div>
          </form>

          <section className="surface-panel rounded-2xl p-6">
            <div className="flex items-center gap-2 text-base font-bold text-slate-900"><LogOut className="h-4 w-4 text-[#6C3BFF]" />Sessions</div>
            <p className="mt-2 text-sm text-slate-500">Signed in on a shared or lost device? Sign out everywhere, then sign in again here.</p>
            <button type="button" onClick={signOutEverywhere} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-[#D8C8FF] px-4 text-sm font-semibold text-[#5A2BE6] hover:border-[#6C3BFF]"><LogOut className="h-4 w-4" />Sign out everywhere</button>
          </section>
        </div>
      </div>}
    </DataState>
  </div>
}
