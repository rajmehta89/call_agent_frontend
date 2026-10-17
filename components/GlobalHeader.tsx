'use client'

import { Bell, ChevronRight } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { api } from './PlatformUI'
import { pageInfo } from './omni-data'

type Notification = { _id: string; title?: string; message?: string; channel?: string }
type User = { name?: string; email?: string; role?: string } | null

function initials(user: User) {
  const source = (user?.name || user?.email || '?').trim()
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[1][0] : '')).toUpperCase()
}

const titleCase = (value: string) => value.replace(/\b\w/g, (letter) => letter.toUpperCase())

export default function GlobalHeader({ user }: { user?: User }) {
  const pathname = usePathname()
  const { section, title } = pageInfo(pathname || '/')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = () => api<any>('/api/platform/notifications?unread_only=true').then((result) => setNotifications(result.data || [])).catch(() => {})
    load()
    const timer = window.setInterval(load, 15000)
    return () => window.clearInterval(timer)
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

  return <header className="app-header app-header-bar">
    <nav aria-label="Breadcrumb" className="app-header-crumbs">
      {section && <><span className="app-header-section">{section}</span><ChevronRight aria-hidden className="app-header-sep" /></>}
      <strong>{title || 'RelayDesk'}</strong>
    </nav>

    <div className="app-header-tools">
      <div className="app-notification-wrap" ref={panelRef}>
        <button type="button" className="app-icon-button" aria-label={`Notifications${notifications.length ? `, ${notifications.length} unread` : ''}`} aria-expanded={showNotifications} onClick={() => setShowNotifications((open) => !open)}>
          <Bell />
          {notifications.length > 0 && <b>{notifications.length > 9 ? '9+' : notifications.length}</b>}
        </button>
        {showNotifications && <div className="app-notifications">
          <header><strong>Notifications</strong><span>{notifications.length} unread</span></header>
          {notifications.length ? notifications.slice(0, 6).map((notification) => <button type="button" key={notification._id} onClick={() => markRead(notification)}><strong>{notification.title || 'Workspace update'}</strong><span>{notification.message || 'New activity needs your attention.'}</span><small>{notification.channel || 'workspace'}</small></button>) : <p>You’re all caught up.</p>}
        </div>}
      </div>
      {user && <div className="app-header-account" title={user.email || ''}>
        <span className="app-header-initials" aria-hidden>{initials(user)}</span>
        <span className="app-header-identity"><strong>{titleCase(user.name || user.email || 'Signed in')}</strong><small>{titleCase(user.role || 'member')}</small></span>
      </div>}
    </div>
  </header>
}
