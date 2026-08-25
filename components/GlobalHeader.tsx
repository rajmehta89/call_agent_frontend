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
  return <header className="sticky top-0 z-30 hidden h-[76px] border-b border-slate-200 bg-white/95 px-7 backdrop-blur-xl lg:block"><div className="flex h-full items-center gap-5"><div className="relative max-w-[620px] flex-1"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers, leads, conversations, calls..." className="h-12 rounded-2xl border-slate-200 bg-slate-50/80 pl-11 shadow-none" />{results && <div className="absolute left-0 right-0 top-14 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"><div className="px-2 py-1 text-xs text-slate-400">{count} results across the workspace</div>{Object.entries(results).map(([kind, rows]: any) => rows.slice(0, 3).map((row: any) => <Link key={row._id} href={kind === 'leads' ? `/leads/${row._id}` : kind === 'customers' ? `/customers/${row._id}` : kind === 'calls' ? `/voice/calls/${row._id}` : '/whatsapp/inbox'} className="block rounded-xl px-2 py-2 text-sm text-slate-600 hover:bg-slate-50">{row.name || row.customer_name || row.phone_number || row.customer_phone} <span className="ml-2 text-xs text-slate-400">{kind}</span></Link>))}</div>}</div><div className="ml-auto flex shrink-0 items-center gap-4"><button aria-label="Notifications" className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#d8d4ff] hover:bg-[#f8f7ff] hover:text-[#6259df]"><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#e4687a]" /></button><button className="flex min-w-[198px] items-center gap-3 rounded-2xl border border-[#dcd9ff] bg-[#f5f3ff] px-3 py-2 text-left shadow-sm transition hover:border-[#c9c4ff] hover:bg-[#eeecff]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6c63ff] text-xs font-extrabold text-white">WO</span><span className="min-w-[116px]"><span className="block text-xs font-bold text-slate-800">Workspace Owner</span><span className="mt-0.5 block text-[10px] text-slate-500">Owner permissions</span></span><ChevronDown className="h-4 w-4 text-[#7c75dd]" /></button></div></div></header>
}
