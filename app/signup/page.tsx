'use client'

import Link from 'next/link'
import { ArrowRight, LockKeyhole } from 'lucide-react'

export default function SignupPage() {
  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#F8F5FF_0%,#FFFFFF_45%,#F1EBFF_100%)] p-5">
    <div className="w-full max-w-[520px] overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_24px_80px_rgba(28,15,42,.12)]">
      <div className="bg-[#6C3BFF] p-8 text-white sm:p-10">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-white/80"><LockKeyhole className="h-4 w-4" />Secure workspace access</div>
        <h1 className="mt-5 text-3xl font-extrabold tracking-[-.04em]">Sign-up is disabled</h1>
        <p className="mt-3 text-sm leading-6 text-[#E4DAFF]">Accounts are created only through an invitation from a workspace Admin.</p>
      </div>
      <div className="p-8 sm:p-10">
        <p className="text-sm leading-6 text-slate-600">If you should have access, ask your Admin to invite your work email. Use the secure link in that invitation to finish registration.</p>
        <Link href="/login" className="mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6C3BFF] text-sm font-bold text-white shadow-[0_12px_24px_rgba(104,6,217,.2)] transition hover:brightness-105">Go to login<ArrowRight className="h-4 w-4" /></Link>
      </div>
    </div>
  </main>
}
