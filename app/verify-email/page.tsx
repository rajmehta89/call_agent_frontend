'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { CheckCircle2, MailCheck, Sparkles } from 'lucide-react'
import { Spinner, api, userFacingError } from '@/components/PlatformUI'

export default function VerifyEmailPage() {
  const router = useRouter(); const params = useSearchParams(); const token = params.get('token') || ''; const email = params.get('email') || ''
  const [status, setStatus] = useState<'waiting' | 'verifying' | 'verified' | 'error'>(token ? 'verifying' : 'waiting')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    let active = true
    api<any>('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }).then((result) => {
      if (!active) return
      window.localStorage.setItem('agentflow_token', result.data.token)
      setStatus('verified'); toast.success('Email verified'); window.setTimeout(() => router.replace('/settings/team'), 500)
    }).catch((exception) => { if (active) { setStatus('error'); setError(userFacingError(exception, 'This verification link is invalid or expired.')) } })
    return () => { active = false }
  }, [router, token])

  const title = status === 'verified' ? 'Email verified' : status === 'error' ? 'Verification link unavailable' : 'Check your inbox'
  const description = status === 'verified' ? 'Your account is active. Opening the team workspace now.' : status === 'error' ? error : `We sent a secure verification link${email ? ` to ${email}` : ''}. Open it to activate your team-member account.`
  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#F8F5FF_0%,#FFFFFF_45%,#F1EBFF_100%)] p-5"><div className="w-full max-w-[520px] overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_24px_80px_rgba(28,15,42,.12)]"><div className="bg-[#6C3BFF] p-8 text-white sm:p-10"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30"><Sparkles className="h-5 w-5" /></span><span className="text-lg font-extrabold">AgentFlow</span></div><div className="mt-10 text-xs font-bold uppercase tracking-[.18em] text-white/75">Email verification</div><h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em]">{title}</h1><p className="mt-3 text-sm leading-6 text-[#D8C8FF]">{description}</p></div><div className="p-7 text-center sm:p-10"><div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${status === 'error' ? 'bg-[#F1EBFF] text-[#5A2BE6]' : 'bg-[#F1EBFF] text-[#6C3BFF]'}`}>{status === 'verifying' ? <Spinner size="lg" /> : <CheckCircle2 className="h-7 w-7" />}</div>{status === 'waiting' && <p className="mt-5 text-sm leading-6 text-slate-500">The link expires in 15 minutes and can only be used once. Check your spam folder if it is not in your inbox.</p>}{status === 'error' && <p className="mt-5 text-sm leading-6 text-slate-500">Please start sign-up again to receive a fresh verification link.</p>}<Link href={status === 'error' ? '/signup' : '/login'} className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-[#6C3BFF] px-5 text-sm font-bold text-white">{status === 'error' ? 'Start again' : 'Go to login'}</Link></div></div></main>
}
