'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, Radio, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { navigationGroups } from './omni-data'

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

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

  return <>
    {isOpen && !isDesktop && <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setIsOpen(false)} />}
    <button onClick={() => setIsOpen(!isOpen)} className="fixed left-4 top-4 z-[70] rounded-xl border border-white/10 bg-[#0b1222] p-2.5 text-white lg:hidden">
      {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[292px] flex-col border-r border-white/10 bg-[#070d19]/95 shadow-2xl backdrop-blur-2xl transition-transform lg:sticky lg:top-0 lg:h-screen ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#74ddd2,#d6a34f)] text-slate-950"><Sparkles className="h-5 w-5" /></div>
          <div><div className="text-lg font-extrabold tracking-[-.04em] text-white">AgentFlow</div><div className="text-[11px] uppercase tracking-[.16em] text-slate-500">Unified AI operations</div></div>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navigationGroups.map((group) => <div key={group.label || 'main'} className="mb-5">
          {group.label && <div className="mb-2 flex items-center justify-between px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-600"><span>{group.label}</span><ChevronDown className="h-3 w-3" /></div>}
          <div className="space-y-1">{group.items.map((item) => {
            const overviewRoute = item.href === '/whatsapp' || item.href === '/voice'
            const active = item.href === '/' || overviewRoute ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
            return <Link key={item.href} href={item.href} onClick={() => !isDesktop && setIsOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? 'bg-[#68d2c8]/12 text-[#9ce9e2]' : 'text-slate-400 hover:bg-white/[.04] hover:text-white'}`}>
              <item.icon className="h-4 w-4" /><span className="font-medium">{item.name}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#68d2c8]" />}
            </Link>
          })}</div>
        </div>)}
      </nav>
      <div className="border-t border-white/10 p-4"><div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[.05] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><Radio className="h-3.5 w-3.5" /> Shared brain online</div><p className="mt-2 text-[11px] leading-5 text-slate-500">WhatsApp and Voice use one knowledge, customer, Shopify, and tool layer.</p></div></div>
    </aside>
  </>
}
