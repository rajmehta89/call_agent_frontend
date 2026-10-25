'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, BookOpen, BrainCircuit, ChevronDown, ChevronsLeft, ChevronsRight, CircleDollarSign, Download, Grid2x2, Hash, Headphones, Home, KanbanSquare, LifeBuoy, ListChecks, LogOut, Menu, Mic2, PenSquare, Phone, PhoneCall, Plus, Radio, Settings2, ShoppingBag, UserCog, UserPlus, UserRound, Users, X , Store, PhoneForwarded } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import toast from 'react-hot-toast'
import { playChime, unlockSoundOnFirstInteraction } from './notifySound'
import { startRealtime, stopRealtime } from './realtime'
import { navigationGroups, TASK_STAGES } from './omni-data'
import { api, roleLabel, titleCase } from './PlatformUI'
import { usePWA } from './PWAProvider'

// Counts that mean "something new for you" when they go up.
const NEW_ACTIVITY = [
  { key: 'channel', message: 'New message in Team channel' },
  { key: 'mentioned', message: 'Someone mentioned you' },
  { key: 'mine', message: 'A conversation was assigned to you' },
]

type Me = { name?: string; email?: string; role?: string; workspace_name?: string; permissions?: string[] }
type MenuItem = { label: string; href: string; icon: typeof Home; permission?: string; hint?: string }
type Popover = 'new' | 'more' | 'help' | 'user' | null

// Podium-style quick tiles. Every tile opens a real page.
const TILES: (MenuItem & { countKey?: 'tasks' })[] = [
  { label: 'Home', href: '/dashboard', icon: Home, permission: 'view_dashboard' },
  { label: 'Tasks', href: '/tasks', icon: ListChecks, permission: 'handle_conversations', countKey: 'tasks' },
  { label: 'Contacts', href: '/leads', icon: Users, permission: 'manage_assigned_leads' },
  { label: 'Funnels', href: '/leads?view=board', icon: KanbanSquare, permission: 'manage_assigned_leads' },
  { label: 'Calls', href: '/calls', icon: PhoneCall, permission: 'handle_calls' },
]

const NEW_ACTIONS: MenuItem[] = [
  { label: 'Start a test call', href: '/voice/browser-test', icon: Headphones, permission: 'handle_calls', hint: 'Talk to your AI agent in the browser' },
  { label: 'Add a lead', href: '/leads?new=1', icon: UserPlus, permission: 'manage_assigned_leads', hint: 'Create a contact by hand' },
  { label: 'Message the team', href: '/inbox/channel', icon: Hash, permission: 'handle_conversations', hint: 'Post in the team channel' },
  { label: 'Add knowledge', href: '/brain/knowledge', icon: BrainCircuit, permission: 'manage_data', hint: 'Teach the AI about the business' },
]

const MORE_ITEMS: MenuItem[] = [
  { label: 'Voice overview', href: '/voice', icon: Radio, permission: 'handle_calls' },
  { label: 'Voice providers', href: '/voice/providers', icon: Settings2, permission: 'manage_integrations' },
  { label: 'Call languages', href: '/voice/languages', icon: Mic2, permission: 'manage_integrations' },
  { label: 'Voice cost planner', href: '/voice/pricing', icon: CircleDollarSign, permission: 'manage_integrations' },
  { label: 'Call history', href: '/calls', icon: Mic2, permission: 'handle_calls' },
  { label: 'Knowledge', href: '/brain/knowledge', icon: BrainCircuit, permission: 'manage_data' },
  { label: 'Shopify data access', href: '/integrations/shopify', icon: ShoppingBag, permission: 'manage_integrations' },
  { label: 'Store data', href: '/integrations/shopify/store', icon: Store, permission: 'manage_integrations' },
  { label: 'Team', href: '/settings/team', icon: UserCog, permission: 'manage_team' },
  { label: 'Call forwarding', href: '/settings/call-forwarding', icon: PhoneForwarded, permission: 'handle_calls' },
  { label: 'My account', href: '/settings/account', icon: UserRound },
]

// The sidebar lists every section (Inbox, Status, Inbound voice, AI Brain, Integrations, CRM, Settings); the
// unlabelled Dashboard group is the Home tile. The tiles and More menu are shortcuts to the same pages.
const LIST_GROUPS = navigationGroups.filter((group) => group.label)
const TOP_ITEMS: MenuItem[] = [{ label: 'Team performance', href: '/settings/team/performance', icon: BarChart3, permission: 'manage_team' }]

/** "Raj Mehta" -> "RM"; a one-word name like "RJ" keeps its first two letters. */
const initials = (name = '') => {
  const words = name.split(/\s+/).filter(Boolean)
  return (words.length > 1 ? words.slice(0, 2).map((part) => part[0]).join('') : (words[0] || 'R').slice(0, 2)).toUpperCase()
}

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [me, setMe] = useState<Me>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [inboxCounts, setInboxCounts] = useState<Record<string, number>>({})
  const [popover, setPopover] = useState<Popover>(null)
  const [anchor, setAnchor] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0 })
  const previousCounts = useRef<Record<string, number> | null>(null)
  const { installed, installAvailable, promptInstall } = usePWA()
  const permissions = ['owner', 'admin'].includes(String(me.role || '').toLowerCase()) ? ['*'] : (me.permissions || [])
  const allowed = (permission?: string) => !permission || permissions.includes('*') || permissions.includes(permission)

  useEffect(() => {
    const resize = () => { const desktop = window.innerWidth >= 1024; setIsDesktop(desktop); setIsOpen(desktop) }
    resize(); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize)
  }, [])
  useEffect(() => { try { setCollapsed(window.localStorage.getItem('relaydesk_sidebar') === 'collapsed') } catch {} }, [])
  useEffect(() => { api<any>('/api/auth/me').then((result) => setMe(result.data || {})).catch(() => {}) }, [])
  useEffect(() => { setPopover(null) }, [pathname])
  useEffect(() => {
    if (!permissions.includes('*') && !permissions.includes('handle_conversations')) return
    unlockSoundOnFirstInteraction()
    startRealtime()  // live updates: counts reload the moment something changes (inbox:changed)
    const load = () => api<any>('/api/inbox/counts').then((result) => {
      const next: Record<string, number> = result.data || {}
      const before = previousCounts.current
      // Something new arrived for this person since the last check: chime and say what it was (not on first load).
      const arrived = before ? NEW_ACTIVITY.filter(({ key }) => (next[key] || 0) > (before[key] || 0)) : []
      if (arrived.length) {
        playChime()
        arrived.forEach(({ message }) => toast(message, { icon: '🔔' }))
        console.info('[inbox] new activity', arrived.map(({ key }) => key))
      }
      previousCounts.current = next
      // Tasks = open conversations in a status that needs the team to act (same numbers as those Status items).
      setInboxCounts({ ...next, tasks: TASK_STAGES.reduce((total, stage) => total + (next[`stage:${stage}`] || 0), 0) })
    }).catch((error) => console.warn('[inbox] sidebar counts failed', error))
    load()
    const timer = window.setInterval(load, 10000)
    window.addEventListener('inbox:changed', load)  // fired by the inbox page after assign / post / read
    return () => { window.clearInterval(timer); window.removeEventListener('inbox:changed', load) }
  }, [me.permissions])  // eslint-disable-line react-hooks/exhaustive-deps

  // Owners and admins hand out conversations; they never receive one (matches inbox_api._can_assign).
  const isAssigner = permissions.includes('*') || permissions.includes('assign_conversations')
  const logout = () => { stopRealtime(); window.localStorage.removeItem('agentflow_token'); window.location.href = '/login' }
  const installApp = async () => {
    setPopover(null)
    if (installAvailable && await promptInstall()) return
    const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent)
    toast(isAppleMobile
      ? 'To add RelayDesk to your Home Screen, tap Share in Safari, then Add to Home Screen.'
      : 'In Chrome or Edge, open the browser menu and choose Install RelayDesk or Install this site as an app.',
      { duration: 9000, icon: '↗' })
  }
  const narrow = collapsed && isDesktop
  const toggleCollapsed = () => { const next = !collapsed; setCollapsed(next); setPopover(null); try { window.localStorage.setItem('relaydesk_sidebar', next ? 'collapsed' : 'open') } catch {} }
  const close = () => { if (!isDesktop) setIsOpen(false) }

  /** Menus open next to their button, outside the sidebar, so they are never clipped (also when it is collapsed). */
  const openPopover = (name: Popover, event: React.MouseEvent<HTMLElement>, upward = false) => {
    if (popover === name) { setPopover(null); return }
    const rect = event.currentTarget.getBoundingClientRect()
    const left = narrow ? rect.right + 8 : Math.max(8, Math.min(rect.left, window.innerWidth - 296))
    setAnchor(upward ? { left, bottom: window.innerHeight - rect.top + 6 } : { left, top: narrow ? rect.top : rect.bottom + 6 })
    setPopover(name)
  }
  // Links with a query (Funnels = /leads?view=board) never show as the current page; Contacts does for /leads.
  const isActive = (href: string) => !href.includes('?') && (pathname === href || pathname.startsWith(`${href}/`))
  const done = () => { setPopover(null); close() }

  const menu = (items: MenuItem[], title?: string, footer?: ReactNode) => <div className="app-popover" role="menu" style={{ left: anchor.left, top: anchor.top, bottom: anchor.bottom }}>
    {title && <div className="app-popover-title">{title}</div>}
    {items.filter((item) => allowed(item.permission)).map((item) => <Link key={item.label} href={item.href} role="menuitem" onClick={done} className="app-popover-item">
      <item.icon aria-hidden="true" /><span><b>{item.label}</b>{item.hint && <small>{item.hint}</small>}</span>
    </Link>)}
    {footer}
  </div>

  return <>
    {isOpen && !isDesktop && <button type="button" aria-label="Close navigation" className="app-nav-scrim" onClick={() => setIsOpen(false)} />}
    <button type="button" aria-label={isOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setIsOpen(!isOpen)} className="app-nav-toggle lg:hidden">{isOpen ? <X /> : <Menu />}</button>
    <aside className={`app-sidebar fixed inset-y-0 left-0 z-50 flex flex-col transition-transform lg:sticky lg:top-0 lg:h-screen ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${narrow ? 'is-collapsed' : ''}`}>
      <Link href="/dashboard" className="app-sidebar-brand" title={me.workspace_name || 'RelayDesk'}>
        <span className="app-sidebar-brandmark">{me.workspace_name ? initials(me.workspace_name) : <Radio />}</span>
        <span><strong>{me.workspace_name || 'RelayDesk'}</strong><small>RelayDesk workspace</small></span>
      </Link>

      <div className="app-sidebar-quick">
        <button type="button" className="app-new-button" aria-haspopup="menu" aria-expanded={popover === 'new'} title="New" onClick={(event) => openPopover('new', event)}>
          <span>New</span><Plus aria-hidden="true" />
        </button>
        <div className="app-tiles">
          {TILES.filter((tile) => allowed(tile.permission)).map((tile) => {
            const count = tile.countKey ? inboxCounts[tile.countKey] : undefined
            return <Link key={tile.label} href={tile.href} onClick={close} title={tile.label} className={`app-tile ${isActive(tile.href) ? 'is-active' : ''}`}>
              <tile.icon aria-hidden="true" /><span>{tile.label}</span>{count ? <b className="app-tile-badge">{count}</b> : null}
            </Link>
          })}
          <button type="button" title="More" aria-haspopup="menu" aria-expanded={popover === 'more'} className={`app-tile ${popover === 'more' ? 'is-active' : ''}`} onClick={(event) => openPopover('more', event)}>
            <Grid2x2 aria-hidden="true" /><span>More</span>
          </button>
        </div>
      </div>

      <nav className="app-navigation" aria-label="Workspace navigation">
        {TOP_ITEMS.filter((item) => allowed(item.permission)).map((item) => <div key={item.href} className="app-nav-items mb-2 border-b border-[#F1EBFF] pb-2"><Link href={item.href} onClick={close} title={item.label} className={pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'is-active' : ''}><item.icon /><span>{item.label}</span>{(pathname === item.href || pathname.startsWith(`${item.href}/`)) && <i aria-hidden="true" />}</Link></div>)}
        {LIST_GROUPS.map((group) => <section key={group.label}>
          <div className="app-nav-group-row">
            <button type="button" onClick={() => setCollapsedGroups((current) => ({ ...current, [group.label]: !current[group.label] }))} aria-expanded={!collapsedGroups[group.label]} className="app-nav-group"><span>{group.label}</span><ChevronDown className={collapsedGroups[group.label] ? '-rotate-90' : ''} /></button>
            {group.label === 'Inbox' && allowed('handle_calls') && <Link href="/voice/browser-test" onClick={close} className="app-nav-compose" title="Start a test call" aria-label="Start a test call"><PenSquare /></Link>}
          </div>
          {!collapsedGroups[group.label] && <div className="app-nav-items">{group.items.filter((item: any) => allowed(item.permission) && !(process.env.NODE_ENV === 'production' && item.hiddenInProduction) && (!item.audience || (item.audience === 'assigners') === isAssigner)).map((item) => {
            const active = item.href === '/inbox' || item.href === '/voice' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon
            const extra = item as { countKey?: string; alert?: boolean }
            const count = extra.countKey ? inboxCounts[extra.countKey] : undefined
            // Every inbox and status item shows its count, 0 included; alert items turn red when they have something.
            return <Link key={item.href} href={item.href} onClick={close} title={item.name} className={active ? 'is-active' : ''}><Icon /><span>{item.name}</span>{count !== undefined && <b className={`app-nav-count${extra.alert && count > 0 ? ' is-alert' : ''}${count === 0 ? ' is-zero' : ''}`}>{count}</b>}{active && <i aria-hidden="true" />}</Link>
          })}</div>}
        </section>)}
      </nav>

      <div className="app-sidebar-bottom">
        <div className="app-bottom-links">
          {allowed('handle_calls') && <Link href="/voice/browser-test" onClick={close} className={`app-bottom-link ${pathname === '/voice/browser-test' ? 'is-active' : ''}`} title="Start a test call"><Phone /><span>Test call</span></Link>}
          <button type="button" className="app-bottom-link" title="Help and support" aria-haspopup="menu" aria-expanded={popover === 'help'} onClick={(event) => openPopover('help', event, true)}><LifeBuoy /><span>Help</span></button>
        </div>
        <div className="app-user-row">
          <button type="button" className="app-user-card" aria-haspopup="menu" aria-expanded={popover === 'user'} title={me.name || me.email || 'Account'} onClick={(event) => openPopover('user', event, true)}>
            <span className="app-user-avatar">{initials(me.name || me.email)}</span>
            <span className="app-user-text"><strong>{me.name ? titleCase(me.name) : me.email || 'Signed in'}</strong><small>{roleLabel(me.role || '')}</small></span>
            <ChevronDown className="app-user-chevron" />
          </button>
          {isDesktop && <button type="button" className="app-collapse-button" onClick={toggleCollapsed} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronsRight /> : <ChevronsLeft />}</button>}
        </div>
      </div>
    </aside>

    {popover && <button type="button" aria-label="Close menu" className="app-popover-scrim" onClick={() => setPopover(null)} />}
    {popover === 'new' && menu(NEW_ACTIONS, 'Create new')}
    {popover === 'more' && menu(MORE_ITEMS, 'More')}
    {popover === 'help' && <div className="app-popover" role="menu" style={{ left: anchor.left, bottom: anchor.bottom }}>
      <div className="app-popover-title">Help and support</div>
      <div className="app-popover-note"><BookOpen aria-hidden="true" /><span><b>Inbox shortcuts</b><small>J / K or ↑ / ↓ move through conversations · E closes or reopens · / jumps to search</small></span></div>
      <div className="app-popover-note"><LifeBuoy aria-hidden="true" /><span><b>Need a hand?</b><small>{isAssigner ? 'Team invites, voice providers and knowledge are under More.' : 'Ask your workspace admin, or message the team channel.'}</small></span></div>
      {allowed('handle_conversations') && <Link href="/inbox/channel" role="menuitem" onClick={done} className="app-popover-item"><Hash aria-hidden="true" /><span><b>Message the team</b></span></Link>}
    </div>}
    {popover === 'user' && menu([
      { label: 'My account', href: '/settings/account', icon: UserRound },
      { label: 'Team', href: '/settings/team', icon: UserCog, permission: 'manage_team' },
    ], me.email, <>
      {!installed && <button type="button" role="menuitem" onClick={installApp} className="app-popover-item"><Download aria-hidden="true" /><span><b>Install RelayDesk</b><small>Open it from your desktop or home screen</small></span></button>}
      <button type="button" role="menuitem" onClick={logout} className="app-popover-item is-danger"><LogOut aria-hidden="true" /><span><b>Sign out</b></span></button>
    </>)}
  </>
}
