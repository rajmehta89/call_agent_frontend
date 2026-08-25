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
  return <header className="sticky top-0 z-30 hidden border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur-xl lg:block"><div className="flex items-center gap-4"><div className="relative max-w-xl flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers, leads, conversations, calls..." className="h-11 bg-slate-50 pl-10" />{results && <div className="absolute left-0 right-0 top-12 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"><div className="px-2 py-1 text-xs text-slate-400">{count} results across the workspace</div>{Object.entries(results).map(([kind, rows]: any) => rows.slice(0, 3).map((row: any) => <Link key={row._id} href={kind === 'leads' ? `/leads/${row._id}` : kind === 'customers' ? `/customers/${row._id}` : kind === 'calls' ? `/voice/calls/${row._id}` : '/whatsapp/inbox'} className="block rounded-xl px-2 py-2 text-sm text-slate-600 hover:bg-slate-50">{row.name || row.customer_name || row.phone_number || row.customer_phone} <span className="ml-2 text-xs text-slate-400">{kind}</span></Link>))}</div>}</div><button className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500"><Bell className="h-4 w-4" /></button><div className="rounded-xl border border-slate-200 px-3 py-2"><div className="text-xs font-semibold text-slate-800">Workspace Owner</div><div className="text-[10px] text-slate-400">Owner permissions</div></div></div></header>
}
