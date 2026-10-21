'use client'

import { Bell, ChevronRight, Volume2, VolumeX } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { api, roleLabel } from './PlatformUI'
import { isSoundMuted, playChime, setSoundMuted } from './notifySound'
import { pageInfo } from './omni-data'

type Notification = { _id: string; title?: string; message?: string; channel?: string; type?: string; conversation_id?: string; link?: string }
type User = { name?: string; email?: string; role?: string } | null

function initials(user: User) {
  const source = (user?.name || user?.email || '?').trim()
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[1][0] : '')).toUpperCase()
}

const titleCase = (value: string) => value.replace(/\b\w/g, (letter) => letter.toUpperCase())

export default function GlobalHeader({ user }: { user?: User }) {
  const pathname = usePathname()
  const router = useRouter()
  const [muted, setMuted] = useState(false)
  useEffect(() => { setMuted(isSoundMuted()) }, [])
  const toggleSound = () => { const next = !muted; setSoundMuted(next); setMuted(next); if (!next) playChime() }  // play a sample when turning sound on
  const { section, title } = pageInfo(pathname || '/')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = () => api<any>('/api/platform/notifications?unread_only=true').then((result) => setNotifications(result.data || [])).catch(() => {})
    load()
    const timer = window.setInterval(load, 15000)
    window.addEventListener('inbox:changed', load)  // reading a conversation or the team channel clears its notifications
    return () => { window.clearInterval(timer); window.removeEventListener('inbox:changed', load) }
  }, [])

  // Close the notifications panel on outside click, Escape, or navigation.
  useEffect(() => {
    if (!showNotifications) return
    const onClick = (event: MouseEvent) => { if (!panelRef.current?.contains(event.target as Node)) setShowNotifications(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowNotifications(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [showNotifications])
  useEffect(() => { setShowNotifications(false) }, [pathname])

  const markRead = async (notification: Notification) => {
    setNotifications((current) => current.filter((item) => item._id !== notification._id))
    await api(`/api/platform/notifications/${notification._id}/read`, { method: 'POST' }).catch(() => {})
  }

  /** Every notification opens the page it is about. The backend stores that page as `link`; older inbox
   *  notifications without one are routed from their type: the assigned conversation, the discussed one, or the team channel. */
  const openNotification = (notification: Notification) => {
    markRead(notification)
    const fromType = () => {
      if (notification.channel !== 'inbox') return ''
      const folder = notification.type === 'assignment' ? 'mine' : !notification.conversation_id ? 'channel' : ''
      return `/inbox${folder ? `/${folder}` : ''}${notification.conversation_id ? `?open=${encodeURIComponent(notification.conversation_id)}` : ''}`
    }
    const target = notification.link || fromType()
    setShowNotifications(false)
    if (!target) { console.info(`[notifications] ${notification.type || notification.channel} has no page to open`); return }
    const key = new URL(target, window.location.origin).searchParams.get('open')
    console.info(`[notifications] ${notification.type || notification.channel} -> ${target}`)
    router.push(target)
    if (key) window.setTimeout(() => window.dispatchEvent(new CustomEvent('inbox:open', { detail: key })), 300)  // already on that page: open it in place
  }

  return <header className="app-header app-header-bar">
    <nav aria-label="Breadcrumb" className="app-header-crumbs">
      {section && <><span className="app-header-section">{section}</span><ChevronRight aria-hidden className="app-header-sep" /></>}
      <strong>{title || 'RelayDesk'}</strong>
    </nav>

    <div className="app-header-tools">
      <button type="button" className="app-icon-button" onClick={toggleSound} aria-label={muted ? 'Turn notification sound on' : 'Turn notification sound off'} title={muted ? 'Sound off: click to turn on' : 'Sound on: click to turn off'}>{muted ? <VolumeX /> : <Volume2 />}</button>
      <div className="app-notification-wrap" ref={panelRef}>
        <button type="button" className="app-icon-button" aria-label={`Notifications${notifications.length ? `, ${notifications.length} unread` : ''}`} aria-expanded={showNotifications} onClick={() => setShowNotifications((open) => !open)}>
          <Bell />
          {notifications.length > 0 && <b>{notifications.length > 9 ? '9+' : notifications.length}</b>}
        </button>
        {showNotifications && <div className="app-notifications">
          <header><strong>Notifications</strong><span>{notifications.length} unread</span></header>
          {notifications.length ? notifications.slice(0, 6).map((notification) => <button type="button" key={notification._id} onClick={() => openNotification(notification)}><strong>{notification.title || 'Workspace update'}</strong><span>{notification.message || 'New activity needs your attention.'}</span><small>{notification.channel || 'workspace'}</small></button>) : <p>You’re all caught up.</p>}
        </div>}
      </div>
      {user && <div className="app-header-account" title={user.email || ''}>
        <span className="app-header-initials" aria-hidden>{initials(user)}</span>
        <span className="app-header-identity"><strong>{titleCase(user.name || user.email || 'Signed in')}</strong><small>{roleLabel(user.role)}</small></span>
      </div>}
    </div>
  </header>
}
