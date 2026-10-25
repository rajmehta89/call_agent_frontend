'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import GlobalHeader from './GlobalHeader'
import { apiWithRetry } from './PlatformUI'
import { pageInfo } from './omni-data'

const publicRoutes = ['/login', '/signup', '/invite/accept']
function requiredPermission(pathname: string) {
  if (pathname === '/' || pathname.startsWith('/dashboard')) return 'view_dashboard'
  if (pathname.startsWith('/inbox') || pathname.startsWith('/tasks')) return 'handle_conversations'
  if (pathname.startsWith('/whatsapp') || pathname.startsWith('/conversation') || pathname.startsWith('/handoffs')) return 'handle_conversations'
  // Keep in step with the backend: these pages call APIs that need more than handle_calls.
  if (pathname.startsWith('/voice/agent')) return 'manage_agents'
  if (pathname.startsWith('/voice/providers') || pathname.startsWith('/voice/pricing')) return 'manage_integrations'
  if (pathname.startsWith('/voice') || pathname === '/calls') return 'handle_calls'
  if (pathname.startsWith('/brain/knowledge') || pathname.startsWith('/knowledge')) return 'manage_data'
  if (pathname.startsWith('/brain/tools') || pathname.startsWith('/brain/activity') || pathname.startsWith('/brain/shopify') || pathname.startsWith('/agents')) return 'manage_agents'
  if (pathname.startsWith('/customers')) return 'view_customers'
  if (pathname.startsWith('/leads')) return 'manage_assigned_leads'
  if (pathname.startsWith('/automations') || pathname.startsWith('/campaigns')) return 'manage_automations'
  if (pathname.startsWith('/integrations')) return 'manage_integrations'
  if (pathname.startsWith('/analytics')) return 'view_analytics'
  if (pathname.startsWith('/team')) return 'manage_team'
  if (pathname.startsWith('/settings/team')) return 'manage_team'
  if (pathname.startsWith('/settings/account')) return null  // everyone manages their own account
  if (pathname.startsWith('/settings') || pathname.startsWith('/config')) return 'manage_workspace'
  return null
}

function AccessState({ title, copy, action, href }: { title: string; copy: string; action: string; href: string }) {
  return <div className="app-access-state"><section><span>RelayDesk</span><h1>{title}</h1><p>{copy}</p><a href={href}>{action}</a></section></div>
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = publicRoutes.some((route) => pathname?.startsWith(route))
  const [user, setUser] = useState<any>(null)
  const [checking, setChecking] = useState(!isPublic)
  const [authError, setAuthError] = useState('')
  const [authAttempt, setAuthAttempt] = useState(0)

  useEffect(() => {
    const { title } = pageInfo(pathname || '/')
    document.title = title ? `${title} · RelayDesk` : 'RelayDesk'
  }, [pathname])

  useEffect(() => {
    if (isPublic) { setChecking(false); return }
    if (!window.localStorage.getItem('agentflow_token')) { window.location.href = '/login'; return }
    let active = true
    const timeout = window.setTimeout(() => { if (active) { setAuthError('The workspace sign-in check took too long. Please sign in again.'); setChecking(false) } }, 30000)
    setAuthError('')
    apiWithRetry<any>('/api/auth/me', undefined, 2, 12000).then((result) => {
      if (result.data?.token) window.localStorage.setItem('agentflow_token', result.data.token)
      if (active) setUser(result.data)
    }).catch(() => { if (active) setAuthError('The workspace service is unavailable or your session has expired.') }).finally(() => { window.clearTimeout(timeout); if (active) setChecking(false) })
    return () => { active = false; window.clearTimeout(timeout) }
  }, [isPublic, pathname, authAttempt])

  if (isPublic) return <>{children}</>
  if (checking) return <div className="app-loading-state"><i /> Connecting to your workspace…</div>
  if (!user) return <AccessState title="Workspace unavailable" copy={authError || 'Please try again.'} action="Sign in again" href="/login" />
  const permission = requiredPermission(pathname || '/')
  const permissions = ['owner', 'admin'].includes(String(user.role || '').toLowerCase()) ? ['*'] : (user.permissions || [])
  const allowed = !permission || permissions.includes('*') || permissions.includes(permission)
  if (!allowed) return <AccessState title="Access restricted" copy="Your role does not have permission to open this page." action="Back to overview" href="/" />

  return <div className="app-shell"><Sidebar /><main className="app-main"><GlobalHeader user={user} /><div className="app-content">{children}</div></main></div>
}
