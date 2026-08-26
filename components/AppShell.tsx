'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import GlobalHeader from './GlobalHeader'
import { api } from './PlatformUI'

const publicRoutes = ['/login', '/signup', '/invite/accept']

function requiredPermission(pathname: string) {
  if (pathname === '/') return 'view_dashboard'
  if (pathname.startsWith('/whatsapp')) return 'handle_conversations'
  if (pathname.startsWith('/conversation')) return 'handle_conversations'
  if (pathname.startsWith('/handoffs')) return 'handle_conversations'
  if (pathname.startsWith('/voice') || pathname === '/calls') return 'handle_calls'
  if (pathname.startsWith('/brain/knowledge')) return 'manage_data'
  if (pathname.startsWith('/brain/tools') || pathname.startsWith('/brain/activity') || pathname.startsWith('/brain/shopify') || pathname.startsWith('/agents')) return 'manage_agents'
  if (pathname.startsWith('/customers')) return 'view_customers'
  if (pathname.startsWith('/leads')) return 'manage_assigned_leads'
  if (pathname.startsWith('/automations')) return 'manage_automations'
  if (pathname.startsWith('/integrations')) return 'manage_integrations'
  if (pathname.startsWith('/analytics')) return 'view_analytics'
  if (pathname.startsWith('/team')) return 'manage_team'
  if (pathname.startsWith('/settings')) return 'manage_workspace'
  if (pathname.startsWith('/config')) return 'manage_workspace'
  if (pathname.startsWith('/knowledge')) return 'manage_data'
  return null
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSettings = pathname?.startsWith('/settings')
  const isPublic = publicRoutes.some((route) => pathname?.startsWith(route))
  const [user, setUser] = useState<any>(null)
  const [checking, setChecking] = useState(!isPublic)

  useEffect(() => {
    if (isPublic) { setChecking(false); return }
    if (!window.localStorage.getItem('agentflow_token')) { window.location.href = '/login'; return }
    api<any>('/api/auth/me').then((result) => setUser(result.data)).catch(() => {}).finally(() => setChecking(false))
  }, [isPublic, pathname])

  if (isPublic) return <>{children}</>
  if (checking || !user) return <div className="flex min-h-screen items-center justify-center bg-[#eef2f6] text-sm text-slate-500">Checking workspace access...</div>
  const permission = requiredPermission(pathname || '/')
  const allowed = !permission || user.permissions?.includes('*') || user.permissions?.includes(permission)
  if (!allowed) return <div className="flex min-h-screen items-center justify-center bg-[#eef2f6] p-6"><div className="surface-panel max-w-md rounded-[24px] p-8 text-center"><div className="text-lg font-bold text-slate-900">Access restricted</div><p className="mt-2 text-sm leading-6 text-slate-500">Your role does not have permission to open this page.</p><a href="/" className="mt-5 inline-flex h-9 items-center rounded-md bg-[#d97706] px-4 text-sm font-semibold text-white">Back to dashboard</a></div></div>

  return <div className="flex min-h-screen bg-[#eef2f6]">
    {!isSettings && <Sidebar />}
    <main className={`min-w-0 flex-1 ${isSettings ? 'overflow-visible' : 'overflow-auto'}`}>
      {!isSettings && <GlobalHeader />}
      <div className={`mx-auto w-full ${isSettings ? 'max-w-none px-0 py-0' : 'max-w-[1800px] bg-[linear-gradient(180deg,#eef2f6_0%,#f8fafc_280px,#f8fafc_100%)] px-4 pb-10 pt-20 sm:px-6 lg:px-8 lg:pt-8'}`}>
        {children}
      </div>
    </main>
  </div>
}
