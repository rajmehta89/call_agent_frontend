'use client'

import Link from 'next/link'
import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import { apiWithRetry, userFacingError } from '@/components/PlatformUI'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    let active = true
    let token = ''
    try { token = window.localStorage.getItem('agentflow_token') || '' } catch {}
    if (!token) return () => { active = false }

    // Reopening the installed PWA can land on /login after a browser restore. Confirm the
    // saved session silently and go straight back to the workspace when it is still valid.
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

  return <AuthFrame eyebrow="Workspace access" title="Welcome back" description="Sign in to continue managing your customer conversations, calls, leads, and team workspace.">
    <form onSubmit={submit} className="space-y-5">
      {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm leading-5 text-purple-800"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
      <label className="block">
        <span className="field-label">Work email</span>
        <input autoFocus required type="email" autoComplete="email" value={form.email} onChange={(event) => { setForm({ ...form, email: event.target.value }); setError('') }} placeholder="you@company.com" aria-invalid={Boolean(error)} />
      </label>
      <label className="block">
        <span className="field-label">Password</span>
        <span className="relative block">
          <input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(event) => { setForm({ ...form, password: event.target.value }); setError('') }} placeholder="Enter your password" aria-invalid={Boolean(error)} className="pr-11" />
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#6C3BFF]" aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
      </label>
      <button disabled={loading} className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6C3BFF] text-sm font-bold text-white shadow-[0_12px_24px_rgba(104,6,217,.2)] transition hover:bg-[#5A2BE6] hover:shadow-[0_16px_28px_rgba(104,6,217,.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C3BFF] disabled:cursor-wait disabled:opacity-60">{loading ? 'Signing in...' : 'Sign in to RelayDesk'}{!loading && <ArrowRight className="h-4 w-4" />}</button>
    </form>
    <div className="mt-7 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#6C3BFF]" /><span>Access is invitation-only. Ask your workspace Admin for an invitation if you do not have an account.</span></div>
  </AuthFrame>
}

function AuthFrame({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <main className="flex min-h-[100svh] items-center justify-center bg-[radial-gradient(circle_at_top_left,#F8F5FF_0%,#FFFFFF_45%,#F1EBFF_100%)] p-4 sm:p-6">
    <div className="grid w-full max-w-[1040px] overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_24px_80px_rgba(28,15,42,.12)] md:grid-cols-[.9fr_1.1fr]">
      <div className="auth-hero relative hidden overflow-hidden bg-[#6C3BFF] p-10 text-white md:block lg:p-12">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/15" /><div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full border border-white/10" />
        <div className="relative flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30"><Sparkles className="h-5 w-5" /></span><span className="text-lg font-extrabold tracking-[-.02em]">RelayDesk</span></div>
        <div className="relative mt-24 max-w-sm"><p className="text-sm font-semibold text-[#E4DAFF]">The calm center of inbound work.</p><h2 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-[-.05em]">Every conversation, ready for the next move.</h2><p className="mt-6 text-sm leading-7 text-[#D8C8FF]">Keep calls, WhatsApp, leads, follow-ups, and team permissions connected in one focused workspace.</p><div className="mt-10 space-y-3 text-sm text-white/90"><TrustLine text="Role-based workspace access" /><TrustLine text="Secure invitation-only accounts" /><TrustLine text="One view for calls and follow-ups" /></div></div>
      </div>
      <div className="p-7 sm:p-12 lg:p-16"><div className="mb-8 flex items-center gap-2 text-xs font-semibold text-slate-400 md:hidden"><LockKeyhole className="h-4 w-4 text-[#6C3BFF]" />Secure workspace access</div><div className="text-xs font-bold uppercase tracking-[.16em] text-[#5A2BE6]">{eyebrow}</div><h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em] text-slate-900 sm:text-4xl">{title}</h1><p className="mt-4 max-w-md text-sm leading-6 text-slate-500">{description}</p><div className="mt-9">{children}</div><p className="mt-8 text-center text-xs text-slate-400">Your session is protected by your workspace credentials.</p></div>
    </div>
  </main>
}

function TrustLine({ text }: { text: string }) {
  return <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#D8C8FF]" /><span>{text}</span></div>
}
