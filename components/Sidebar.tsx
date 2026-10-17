'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, LogOut, Menu, Radio, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { navigationGroups } from './omni-data'
import { api } from './PlatformUI'

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [permissions, setPermissions] = useState<string[]>([])
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const resize = () => { const desktop = window.innerWidth >= 1024; setIsDesktop(desktop); setIsOpen(desktop) }
    resize(); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize)
  }, [])
  useEffect(() => { api<any>('/api/auth/me').then((result) => { setPermissions(result.data?.permissions || []) }).catch(() => {}) }, [])
  const logout = () => { window.localStorage.removeItem('agentflow_token'); window.location.href = '/login' }

  return <>
    {isOpen && !isDesktop && <button type="button" aria-label="Close navigation" className="app-nav-scrim" onClick={() => setIsOpen(false)} />}
    <button type="button" aria-label={isOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setIsOpen(!isOpen)} className="app-nav-toggle lg:hidden">{isOpen ? <X /> : <Menu />}</button>
    <aside className={`app-sidebar fixed inset-y-0 left-0 z-50 flex flex-col transition-transform lg:sticky lg:top-0 lg:h-screen ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <Link href="/" className="app-sidebar-brand">
        <span className="app-sidebar-brandmark"><Radio /></span>
        <span><strong>RelayDesk</strong></span>
      </Link>
      <nav className="app-navigation" aria-label="Workspace navigation">
        {navigationGroups.map((group) => <section key={group.label || 'main'}>
          {group.label && <button type="button" onClick={() => setCollapsedGroups((current) => ({ ...current, [group.label]: !current[group.label] }))} aria-expanded={!collapsedGroups[group.label]} className="app-nav-group"><span>{group.label}</span><ChevronDown className={collapsedGroups[group.label] ? '-rotate-90' : ''} /></button>}
          {!collapsedGroups[group.label] && <div className="app-nav-items">{group.items.filter((item: any) => !item.permission || permissions.includes('*') || permissions.includes(item.permission)).map((item) => {
            const overviewRoute = item.href === '/whatsapp' || item.href === '/voice'
            const active = item.href === '/' || overviewRoute ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon
            return <Link key={item.href} href={item.href} onClick={() => !isDesktop && setIsOpen(false)} className={active ? 'is-active' : ''}><Icon /><span>{item.name}</span>{active && <i aria-hidden="true" />}</Link>
          })}</div>}
        </section>)}
      </nav>
      <div className="app-sidebar-footer"><button type="button" onClick={logout}><LogOut /> Sign out</button></div>
    </aside>
  </>
}
