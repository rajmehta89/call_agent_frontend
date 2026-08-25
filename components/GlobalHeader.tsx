'use client'

import Link from 'next/link'
import { Bell, Search } from 'lucide-react'
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
  return <header className="sticky top-0 z-30 hidden border-b border-white/8 bg-[#09101d]/80 px-6 py-3 backdrop-blur-xl lg:block"><div className="flex items-center gap-4"><div className="relative max-w-xl flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers, leads, conversations, calls..." className="h-11 pl-10" />{results && <div className="absolute left-0 right-0 top-12 rounded-2xl border border-white/10 bg-[#0c1424] p-3 shadow-2xl"><div className="px-2 py-1 text-xs text-slate-500">{count} results across the workspace</div>{Object.entries(results).map(([kind, rows]: any) => rows.slice(0, 3).map((row: any) => <Link key={row._id} href={kind === 'leads' ? `/leads/${row._id}` : kind === 'customers' ? `/customers/${row._id}` : kind === 'calls' ? `/voice/calls/${row._id}` : '/whatsapp/inbox'} className="block rounded-xl px-2 py-2 text-sm text-slate-300 hover:bg-white/5">{row.name || row.customer_name || row.phone_number || row.customer_phone} <span className="ml-2 text-xs text-slate-600">{kind}</span></Link>))}</div>}</div><button className="rounded-xl border border-white/10 bg-white/[.04] p-3 text-slate-400"><Bell className="h-4 w-4" /></button><div className="rounded-xl border border-white/10 px-3 py-2"><div className="text-xs font-semibold text-white">Workspace Owner</div><div className="text-[10px] text-slate-500">Owner permissions</div></div></div></header>
}
