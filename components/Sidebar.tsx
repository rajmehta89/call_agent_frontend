'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { navigationGroups } from './omni-data'
import { api } from './PlatformUI'

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [permissions, setPermissions] = useState<string[]>([])
  const [workspaceName, setWorkspaceName] = useState('AI workspace')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const resize = () => {
      const desktop = window.innerWidth >= 1024
      setIsDesktop(desktop)
      setIsOpen(desktop)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  useEffect(() => { api<any>('/api/auth/me').then((result) => { setPermissions(result.data?.permissions || []); setWorkspaceName(result.data?.workspace_name || 'AI workspace') }).catch(() => {}) }, [])

  return <>
    {isOpen && !isDesktop && <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsOpen(false)} />}
    <button onClick={() => setIsOpen(!isOpen)} className="fixed left-4 top-4 z-[70] rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm lg:hidden">
      {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[256px] flex-col border-r border-[#202a35] bg-[#0b1117] shadow-[8px_0_30px_rgba(2,6,12,.28)] transition-transform lg:sticky lg:top-0 lg:h-screen ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="border-b border-[#202a35] px-5 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f59e0b,#b45309)] text-white shadow-[0_8px_18px_rgba(217,119,6,.24)]"><Sparkles className="h-5 w-5" /></div>
          <div><div className="text-lg font-extrabold tracking-[-.04em] text-white">AgentFlow</div><div className="max-w-[165px] truncate text-[11px] uppercase tracking-[.16em] text-[#8b98a7]">{workspaceName}</div></div>
        </Link>
      </div>
      <nav className="sidebar-nav flex-1 overflow-y-auto px-3 py-4">
        {navigationGroups.map((group) => <div key={group.label || 'main'} className="mb-5">
          {group.label && <button type="button" onClick={() => setCollapsedGroups((current) => ({ ...current, [group.label]: !current[group.label] }))} aria-expanded={!collapsedGroups[group.label]} className="mb-2 flex w-full items-center justify-between rounded-md px-3 py-1 text-left text-[10px] font-bold uppercase tracking-[.18em] text-[#718096] transition hover:bg-[#17202a] hover:text-[#dce6f2]"><span>{group.label}</span><ChevronDown className={`h-3 w-3 transition-transform ${collapsedGroups[group.label] ? '-rotate-90' : ''}`} /></button>}
          {!collapsedGroups[group.label] && <div className="space-y-1">{group.items.filter((item: any) => !item.permission || permissions.includes('*') || permissions.includes(item.permission)).map((item) => {
            const overviewRoute = item.href === '/whatsapp' || item.href === '/voice'
            const active = item.href === '/' || overviewRoute ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
            return <Link key={item.href} href={item.href} onClick={() => !isDesktop && setIsOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? 'bg-[#2a2113] text-[#fbbf24] shadow-[inset_3px_0_0_#d97706]' : 'text-[#a8b3c0] hover:bg-[#17202a] hover:text-white'}`}>
              <span className={`sidebar-icon sidebar-icon-${item.tone || 'gray'}`}><item.icon className="h-4 w-4" /></span><span className="font-medium">{item.name}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#f59e0b] shadow-[0_0_0_3px_rgba(245,158,11,.1)]" />}
            </Link>
          })}</div>}
        </div>)}
      </nav>
    </aside>
  </>
}
