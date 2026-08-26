'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react'
import { api } from '@/components/PlatformUI'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', setup_token: '' })
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => { api<any>('/api/auth/config').then((result) => setConfig(result.data)).catch(() => {}) }, [])
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true)
    try {
      const result = await api<any>('/api/auth/signup', { method: 'POST', body: JSON.stringify(form) })
      window.localStorage.setItem('agentflow_token', result.data.token)
      toast.success('Workspace created')
      router.replace('/')
    } catch (exception) { toast.error(exception instanceof Error ? exception.message : 'Unable to create account') } finally { setLoading(false) }
  }
  const setupClosed = config && !config.first_account_is_admin && !config.public_signup_enabled
  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#fff7ed_0%,#eef2f6_45%,#e7edf2_100%)] p-5"><div className="grid w-full max-w-[960px] overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,.12)] md:grid-cols-[.85fr_1.15fr]"><div className="auth-hero hidden bg-[#101a17] p-10 text-white md:block"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f59e0b,#b45309)]"><Sparkles className="h-5 w-5" /></span><span className="text-lg font-extrabold">AgentFlow</span></div><div className="mt-24"><div className="text-xs font-bold uppercase tracking-[.18em] text-[#7dd3fc]">First-time setup</div><div className="mt-4 text-3xl font-extrabold leading-tight tracking-[-.05em]">Create the owner account.</div><p className="mt-5 text-sm leading-7 text-[#b6c5bd]">This is a one-time setup for this business. Afterward, use login or invite teammates from Team & access.</p></div></div><div className="p-7 sm:p-12"><div className="mb-8 flex items-center gap-2 text-xs font-semibold text-slate-400 md:hidden"><LockKeyhole className="h-4 w-4 text-[#d97706]" />Secure owner setup</div><div className="text-xs font-bold uppercase tracking-[.16em] text-[#b45309]">Owner setup</div><h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em] text-slate-900">Create the owner account</h1>{setupClosed ? <><p className="mt-3 text-sm leading-6 text-slate-500">This business already has an owner account. New users must be invited by an Admin.</p><Link href="/login" className="mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#d97706] text-sm font-bold text-white shadow-[0_12px_24px_rgba(217,119,6,.2)]">Go to login<ArrowRight className="h-4 w-4" /></Link></> : <><p className="mt-3 text-sm leading-6 text-slate-500">Create the single Admin account for {config?.workspace_name || 'this business'}. The business name is configured once for this deployment.</p><form onSubmit={submit} className="mt-8 space-y-4"><label><span className="field-label">Full name</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Raj Mehta" /></label><label><span className="field-label">Email address</span><input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" /></label><label><span className="field-label">Password</span><input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" /></label>{config?.setup_required && <label><span className="field-label">First Admin setup token</span><input required value={form.setup_token} onChange={(event) => setForm({ ...form, setup_token: event.target.value })} placeholder="Provided by the deployment owner" /></label>}<button disabled={loading} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#d97706] text-sm font-bold text-white shadow-[0_12px_24px_rgba(217,119,6,.2)] transition hover:brightness-105 disabled:opacity-60">{loading ? 'Creating account...' : 'Create owner account'}<ArrowRight className="h-4 w-4" /></button></form></>}<div className="mt-6 text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-bold text-[#b45309] hover:underline">Sign in</Link></div></div></div></main>
}
