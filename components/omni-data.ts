import { AlertTriangle, AtSign, LayoutDashboard, BrainCircuit, CircleDollarSign, Hash, Headphones, Inbox, MailCheck, Mic2, PhoneCall, Settings2, ShoppingBag, UserCheck, UserCog, UserPlus, UserRound, Users, UserX , Store, PhoneForwarded } from 'lucide-react'
import { STAGES } from './stages'

/** Statuses that mean the team has something to do: their open conversations make up the Tasks page and tile count. */
export const TASK_STAGES = ['outreach', 'scheduling', 'follow_up', 'servicing', 'payment_collection']

// countKey: the item shows the matching number from GET /api/inbox/counts as a badge.
// audience: 'assigners' (owners/admins, who hand out conversations) or 'assignees' (everyone else, who receive them).
export const navigationGroups = [
  { label: '', items: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, tone: 'blue', permission: 'view_dashboard' },
  ]},
  { label: 'Inbox', items: [
    { name: 'All Conversations', href: '/inbox', icon: Inbox, tone: 'blue', permission: 'handle_conversations', countKey: 'all' },
    { name: 'Unassigned', href: '/inbox/unassigned', icon: UserX, tone: 'orange', permission: 'handle_conversations', countKey: 'unassigned' },
    { name: 'Assigned to You', href: '/inbox/mine', icon: UserCheck, tone: 'green', permission: 'handle_conversations', countKey: 'mine', audience: 'assignees' },
    { name: 'Assigned', href: '/inbox/assigned', icon: Users, tone: 'green', permission: 'handle_conversations', countKey: 'assigned', audience: 'assigners' },
    { name: 'Mentioned', href: '/inbox/mentioned', icon: AtSign, tone: 'orange', permission: 'handle_conversations', countKey: 'mentioned', alert: true },
    { name: 'Failed', href: '/inbox/failed', icon: AlertTriangle, tone: 'red', permission: 'handle_conversations', countKey: 'failed', alert: true },
    { name: 'Team channel', href: '/inbox/channel', icon: Hash, tone: 'blue', permission: 'handle_conversations', countKey: 'channel', alert: true },
  ]},
  { label: 'Status', items: STAGES.map((stage) => ({ name: stage.label, href: `/inbox/status/${stage.id}`, icon: stage.icon, tone: 'blue', permission: 'handle_conversations', countKey: `stage:${stage.id}` })) },
  { label: 'Inbound voice', items: [
    { name: 'Overview', href: '/voice', icon: PhoneCall, tone: 'blue', permission: 'handle_calls' },
    { name: 'Browser test call', href: '/voice/browser-test', icon: Headphones, tone: 'orange', permission: 'handle_calls' },
    { name: 'Call history', href: '/calls', icon: Mic2, tone: 'orange', permission: 'handle_calls' },
    { name: 'Voice cost planner', href: '/voice/pricing', icon: CircleDollarSign, tone: 'green', permission: 'manage_integrations' },
    { name: 'Voice providers', href: '/voice/providers', icon: Settings2, tone: 'blue', permission: 'manage_integrations' },
    { name: 'Call languages', href: '/voice/languages', icon: Mic2, tone: 'blue', permission: 'manage_integrations' },
  ]},
  { label: 'AI Brain', items: [
    { name: 'Knowledge', href: '/brain/knowledge', icon: BrainCircuit, tone: 'blue', permission: 'manage_data' },
  ]},
  { label: 'Integrations', items: [
    { name: 'Store data', href: '/integrations/shopify/store', icon: Store, tone: 'green', permission: 'manage_integrations' },
    { name: 'Shopify data access', href: '/integrations/shopify', icon: ShoppingBag, tone: 'green', permission: 'manage_integrations' },
  ]},
  { label: 'CRM', items: [
    { name: 'Leads', href: '/leads', icon: UserPlus, tone: 'red', permission: 'manage_assigned_leads' },
    { name: 'Email review', href: '/campaigns', icon: MailCheck, tone: 'blue', permission: 'manage_automations', hiddenInProduction: true },
  ]},
  { label: 'Settings', items: [
    { name: 'Team', href: '/settings/team', icon: UserCog, tone: 'blue', permission: 'manage_team' },
    { name: 'Call forwarding', href: '/settings/call-forwarding', icon: PhoneForwarded, tone: 'blue', permission: 'handle_calls' },
    { name: 'My account', href: '/settings/account', icon: UserRound, tone: 'blue' },
  ]},
]

export const omniNavigation = navigationGroups.flatMap((group) => group.items)

const extraPages: Record<string, { section: string; title: string }> = {
  '/login': { section: '', title: 'Sign in' },
  '/signup': { section: '', title: 'Create account' },
  '/invite/accept': { section: '', title: 'Accept invite' },
  '/voice/calls/': { section: 'Inbound voice', title: 'Call details' },
  '/voice/agent': { section: 'Inbound voice', title: 'Agent settings' },
  '/settings/team/performance': { section: 'Settings', title: 'Team performance' },
  '/leads/': { section: 'CRM', title: 'Lead details' },
  '/tasks': { section: 'Inbox', title: 'Tasks' },
}

/** Section and page name for a route, taken from the sidebar so the header and tab title always match it. */
export function pageInfo(pathname: string): { section: string; title: string } {
  for (const group of navigationGroups) {
    const exact = group.items.find((item) => item.href === pathname)
    if (exact) return { section: group.label, title: exact.name }
  }
  const extra = Object.keys(extraPages).filter((prefix) => pathname.startsWith(prefix)).sort((a, b) => b.length - a.length)[0]
  if (extra) return extraPages[extra]
  const matches = navigationGroups.flatMap((group) => group.items.filter((item) => pathname.startsWith(item.href)).map((item) => ({ section: group.label, title: item.name, length: item.href.length })))
  const best = matches.sort((a, b) => b.length - a.length)[0]
  return best ? { section: best.section, title: best.title } : { section: '', title: '' }
}
