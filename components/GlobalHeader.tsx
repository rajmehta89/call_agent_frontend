'use client'

import Link from 'next/link'
import { Bell, ChevronDown, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from './PlatformUI'

export default function GlobalHeader() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>(null)
  useEffect(() => {
    if (query.trim().length < 2) { setResults(null); return }
    const timer = setTimeout(() => api(`/api/platform/search?q=${encodeURIComponent(query)}`).then((p) => setResults(p.data)).catch(() => setResults(null)), 250)
    return () => clearTimeout(timer)
  }, [query])
  const count = results ? Object.values(results).reduce((sum: number, rows: any) => sum + rows.length, 0) : 0
  return <header className="sticky top-0 z-30 hidden h-16 border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md lg:block"><div className="flex h-full items-center gap-6"><div className="relative min-w-0 max-w-[560px] flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers, leads, conversations, calls..." className="h-10 rounded-lg border-slate-200 bg-slate-50 pl-10 text-sm shadow-none" />{results && <div className="absolute left-0 right-0 top-12 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,.12)]"><div className="px-2 py-1 text-xs text-slate-400">{count} results across the workspace</div>{Object.entries(results).map(([kind, rows]: any) => rows.slice(0, 3).map((row: any) => <Link key={row._id} href={kind === 'leads' ? `/leads/${row._id}` : kind === 'customers' ? `/customers/${row._id}` : kind === 'calls' ? `/voice/calls/${row._id}` : '/whatsapp/inbox'} className="block rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-50">{row.name || row.customer_name || row.phone_number || row.customer_phone} <span className="ml-2 text-xs text-slate-400">{kind}</span></Link>))}</div>}</div><div className="ml-auto flex shrink-0 items-center gap-5"><button aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#fed7aa] hover:bg-[#fff7ed] hover:text-[#b45309]"><Bell className="h-4 w-4" /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#e4687a] ring-2 ring-white" /></button><button className="flex min-w-[212px] items-center gap-3 rounded-lg border border-[#fed7aa] bg-[#fff7ed] px-3 py-1.5 text-left shadow-sm transition hover:border-[#fdba74] hover:bg-[#ffedd5]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d97706] text-[11px] font-extrabold text-white">WO</span><span className="min-w-[132px]"><span className="block text-xs font-bold text-slate-800">Workspace Owner</span><span className="mt-0.5 block text-[10px] text-slate-500">Owner permissions</span></span><ChevronDown className="h-4 w-4 text-[#b45309]" /></button></div></div></header>
}
