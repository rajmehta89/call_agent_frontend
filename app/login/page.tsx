'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react'
import { api } from '@/components/PlatformUI'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true)
    try {
      const result = await api<any>('/api/auth/login', { method: 'POST', body: JSON.stringify(form) })
      window.localStorage.setItem('agentflow_token', result.data.token)
      toast.success('Welcome back')
      router.replace('/')
    } catch (exception) { toast.error(exception instanceof Error ? exception.message : 'Unable to sign in') } finally { setLoading(false) }
  }
  return <AuthFrame eyebrow="Workspace access" title="Welcome back" description="Sign in to manage your WhatsApp and voice workspace."><form onSubmit={submit} className="space-y-4"><label><span className="field-label">Email address</span><input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" /></label><label><span className="field-label">Password</span><input required type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Your password" /></label><button disabled={loading} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#d97706] text-sm font-bold text-white shadow-[0_12px_24px_rgba(217,119,6,.2)] transition hover:brightness-105 disabled:opacity-60">{loading ? 'Signing in...' : 'Sign in'}<ArrowRight className="h-4 w-4" /></button></form><div className="mt-6 text-center text-sm text-slate-500">Need a workspace? <Link href="/signup" className="font-bold text-[#b45309] hover:underline">Create an account</Link></div></AuthFrame>
}

function AuthFrame({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#fff7ed_0%,#eef2f6_45%,#e7edf2_100%)] p-5"><div className="grid w-full max-w-[960px] overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,.12)] md:grid-cols-[.85fr_1.15fr]"><div className="auth-hero hidden bg-[#101a17] p-10 text-white md:block"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f59e0b,#b45309)]"><Sparkles className="h-5 w-5" /></span><span className="text-lg font-extrabold">AgentFlow</span></div><div className="mt-24"><div className="text-xs font-bold uppercase tracking-[.18em] text-[#7dd3fc]">AI workspace</div><div className="mt-4 text-3xl font-extrabold leading-tight tracking-[-.05em]">One place for your customer conversations.</div><p className="mt-5 text-sm leading-7 text-[#b6c5bd]">Keep WhatsApp, Voice, customers, leads, and your team permissions connected.</p></div></div><div className="p-7 sm:p-12"><div className="mb-8 flex items-center gap-2 text-xs font-semibold text-slate-400 md:hidden"><LockKeyhole className="h-4 w-4 text-[#d97706]" />Secure workspace access</div><div className="text-xs font-bold uppercase tracking-[.16em] text-[#b45309]">{eyebrow}</div><h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em] text-slate-900">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{description}</p><div className="mt-8">{children}</div></div></div></main>
}
