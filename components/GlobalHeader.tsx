'use client'

import { AtSign, AudioLines, Bell, BellRing, CheckCheck, ChevronRight, ClipboardCheck, Hash, UserRound, Volume2, VolumeX } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { api, roleLabel } from './PlatformUI'
import { isSoundMuted, playChime, setSoundMuted } from './notifySound'
import { pageInfo } from './omni-data'

type Notification = { _id: string; title?: string; message?: string; channel?: string; type?: string; conversation_id?: string; link?: string; created_at?: string }
type User = { name?: string; email?: string; role?: string } | null

function initials(user: User) {
  const source = (user?.name || user?.email || '?').trim()
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[1][0] : '')).toUpperCase()
}

const titleCase = (value: string) => value.replace(/\b\w/g, (letter) => letter.toUpperCase())

/** An icon for what the notification is about: an assignment, a mention, the team channel or voice activity. */
function notificationIcon(notification: Notification) {
  const kind = `${notification.type || ''} ${notification.title || ''}`.toLowerCase()
  if (kind.includes('new_lead') || kind.includes('new lead')) return UserRound
  if (kind.includes('handoff')) return Bell
  if (notification.channel === 'voice' || kind.includes('voice') || kind.includes('call')) return AudioLines
  if (kind.includes('assign')) return ClipboardCheck
  if (kind.includes('mention')) return AtSign
  if (notification.channel === 'inbox' && !notification.conversation_id) return Hash
  return BellRing
}

/** A compact, human-readable age for the notification. */
function since(value?: string) {
  const time = value ? new Date(value.endsWith('Z') || value.includes('+') ? value : `${value}Z`).getTime() : NaN
  if (Number.isNaN(time)) return ''
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000))
  return minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.round(minutes / 60)}h ago` : `${Math.round(minutes / 1440)}d ago`
}

function showNewLeadToast(notification: Notification) {
  const Icon = notificationIcon(notification)
  toast.custom(() => <div className="app-live-toast" role="status">
    <span className="app-live-toast-icon"><Icon aria-hidden /></span>
    <span className="app-live-toast-copy">
      <strong>{notification.title || 'New lead received'}</strong>
      <small>{notification.message || 'A new lead is ready for follow-up.'}</small>
    </span>
  </div>, { id: `new-lead-${notification._id}`, duration: 8000 })
}

function wasLeadToastShown(notificationId: string) {
  try { return window.sessionStorage.getItem(`relaydesk_lead_toast_${notificationId}`) === '1' } catch { return false }
}

function rememberLeadToast(notificationId: string) {
  try { window.sessionStorage.setItem(`relaydesk_lead_toast_${notificationId}`, '1') } catch { /* storage may be disabled */ }
}

function isRecentLead(notification: Notification) {
  if (!notification.created_at) return false
  const value = notification.created_at.endsWith('Z') || notification.created_at.includes('+') ? notification.created_at : `${notification.created_at}Z`
  const age = Date.now() - new Date(value).getTime()
  return Number.isFinite(age) && age >= -60000 && age <= 10 * 60 * 1000
}

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
  const seenNotificationIds = useRef<Set<string> | null>(null)

  useEffect(() => {
    let active = true
    let loading = false
    let announceAfterLoad = false
    const load = (announce = false) => {
      if (loading) { announceAfterLoad = announceAfterLoad || announce; return }
      loading = true
      api<any>('/api/platform/notifications?unread_only=true').then((result) => {
        if (!active) return
        const incoming: Notification[] = result.data || []
        const seen = seenNotificationIds.current
        if (!seen) {
          seenNotificationIds.current = new Set(incoming.map((item) => item._id))
          const recentLeads = incoming.filter((item) => item.type === 'new_lead' && isRecentLead(item) && !wasLeadToastShown(item._id)).slice(0, 3)
          if (recentLeads.length) {
            playChime()
            recentLeads.forEach((item) => { showNewLeadToast(item); rememberLeadToast(item._id) })
          }
        } else {
          const newLeads = incoming.filter((item) => item.type === 'new_lead' && !seen.has(item._id) && !wasLeadToastShown(item._id))
          incoming.forEach((item) => seen.add(item._id))
          if (announce && newLeads.length) {
            playChime()
            newLeads.forEach((item) => { showNewLeadToast(item); rememberLeadToast(item._id) })
          }
        }
        setNotifications(incoming)
      }).catch(() => {}).finally(() => {
        loading = false
        if (active && announceAfterLoad) { announceAfterLoad = false; load(true) }
      })
    }
    const onInboxChanged = () => load(true)
    load()
    const timer = window.setInterval(() => load(true), 15000)
    window.addEventListener('inbox:changed', onInboxChanged)  // also refreshes when a live lead event arrives
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('inbox:changed', onInboxChanged) }
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

  const markAllRead = () => {
    const shown = notifications
    setNotifications([])
    shown.forEach((notification) => api(`/api/platform/notifications/${notification._id}/read`, { method: 'POST' }).catch(() => {}))
  }

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
        {showNotifications && <div className="app-notifications" role="dialog" aria-label="Notifications">
          <header>
            <div className="app-notifications-heading">
              <div className="app-notifications-title"><strong>Notifications</strong>{notifications.length > 0 && <em aria-label={`${notifications.length} unread`}>{notifications.length > 99 ? '99+' : notifications.length}</em>}</div>
              <span className="app-notifications-summary">{notifications.length ? 'Unread activity' : 'All caught up'}</span>
            </div>
            {notifications.length > 0 && <button type="button" className="app-notifications-clear" onClick={markAllRead}><CheckCheck aria-hidden />Mark all read</button>}
          </header>
          {notifications.length ? <>
            <div className="app-notifications-list">{notifications.slice(0, 12).map((notification) => { const Icon = notificationIcon(notification); return <button type="button" key={notification._id} onClick={() => openNotification(notification)} className="app-notification-item">
              <span className="app-notification-icon"><Icon aria-hidden /></span>
              <span className="app-notification-text"><span className="app-notification-top"><strong>{notification.title || 'Workspace update'}</strong><time>{since(notification.created_at)}</time></span><span>{notification.message || 'New activity needs your attention.'}</span></span>
            </button> })}</div>
            {notifications.length > 12 && <footer className="app-notifications-footer">Showing 12 of {notifications.length} unread</footer>}
          </>
            : <p className="app-notifications-empty"><CheckCheck aria-hidden /><b>You’re all caught up</b><small>New leads, assignments, status changes, mentions and team messages show up here.</small></p>}
        </div>}
      </div>
      {user && <div className="app-header-account" title={user.email || ''}>
        <span className="app-header-initials" aria-hidden>{initials(user)}</span>
        <span className="app-header-identity"><strong>{titleCase(user.name || user.email || 'Signed in')}</strong><small>{roleLabel(user.role)}</small></span>
      </div>}
    </div>
  </header>
}
