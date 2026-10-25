'use client'

import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import { apiWithRetry, userFacingError } from '@/components/PlatformUI'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let token = ''
    try { token = window.localStorage.getItem('agentflow_token') || '' } catch {}
    if (!token) return () => { active = false }

    apiWithRetry<any>('/api/auth/me', undefined, 1, 10000).then((result) => {
      if (!active) return
      if (result.data?.token) window.localStorage.setItem('agentflow_token', result.data.token)
      router.replace('/settings/team')
    }).catch(() => {
      try { window.localStorage.removeItem('agentflow_token') } catch {}
    })
    return () => { active = false }
  }, [router])

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError('')
    try {
      const result = await apiWithRetry<any>('/api/auth/login', { method: 'POST', body: JSON.stringify(form) }, 1, 25000)
      if (!result?.data?.token) throw new Error('The sign-in service returned an incomplete response. Please try again.')
      window.localStorage.setItem('agentflow_token', result.data.token)
      toast.success('Welcome back')
      router.replace('/settings/team')
    } catch (exception) {
      const status = (exception as Error & { status?: number })?.status
      const message = status === 401 || status === 403
        ? "We couldn't sign you in with that email and password. Please try again."
        : status === 429
          ? 'Too many sign-in attempts. Please wait a moment and try again.'
          : status && status >= 500
            ? 'The sign-in service is temporarily unavailable. Please try again in a few minutes.'
            : userFacingError(exception, "We couldn't sign you in. Please try again.")
      console.error('Sign-in failed', exception)
      setError(message)
    } finally { setLoading(false) }
  }

  return <AuthFrame eyebrow="Workspace access" title="Welcome back" description="Sign in to manage your WhatsApp and voice workspace.">
    <form onSubmit={submit} className="space-y-4">
      {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm leading-5 text-purple-800"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
      <label className="block"><span className="field-label">Email address</span><input autoFocus required type="email" autoComplete="email" value={form.email} onChange={(event) => { setForm({ ...form, email: event.target.value }); setError('') }} placeholder="you@company.com" aria-invalid={Boolean(error)} /></label>
      <label className="block"><span className="field-label">Password</span><input required type="password" autoComplete="current-password" value={form.password} onChange={(event) => { setForm({ ...form, password: event.target.value }); setError('') }} placeholder="Your password" aria-invalid={Boolean(error)} /></label>
      <button disabled={loading} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6C3BFF] text-sm font-bold text-white shadow-[0_12px_24px_rgba(104,6,217,.2)] transition hover:bg-[#5A2BE6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C3BFF] disabled:cursor-wait disabled:opacity-60">{loading ? 'Signing in...' : 'Sign in'}{!loading && <ArrowRight className="h-4 w-4" />}</button>
    </form>
    <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#6C3BFF]" /><span>Access is invitation-only. Ask your workspace Admin for an invitation if you do not have an account.</span></div>
  </AuthFrame>
}

function AuthFrame({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <main className="flex min-h-[100svh] items-center justify-center bg-[radial-gradient(circle_at_top_left,#F8F5FF_0%,#FFFFFF_45%,#F1EBFF_100%)] p-5"><div className="grid w-full max-w-[960px] overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_24px_80px_rgba(28,15,42,.12)] md:grid-cols-[.85fr_1.15fr]">
    <div className="auth-hero hidden bg-[#6C3BFF] p-10 text-white md:block"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30"><Sparkles className="h-5 w-5" /></span><span className="text-lg font-extrabold">AgentFlow</span></div><div className="mt-24"><div className="text-xs font-bold uppercase tracking-[.18em] text-white/80">AI workspace</div><div className="mt-4 text-3xl font-extrabold leading-tight tracking-[-.05em]">One place for your customer conversations.</div><p className="mt-5 text-sm leading-7 text-[#D8C8FF]">Keep WhatsApp, Voice, customers, leads, and your team permissions connected.</p></div></div>
    <div className="p-7 sm:p-12"><div className="mb-8 flex items-center gap-2 text-xs font-semibold text-slate-400 md:hidden"><LockKeyhole className="h-4 w-4 text-[#6C3BFF]" />Secure workspace access</div><div className="text-xs font-bold uppercase tracking-[.16em] text-[#5A2BE6]">{eyebrow}</div><h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em] text-slate-900">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{description}</p><div className="mt-8">{children}</div></div>
  </div></main>
}
