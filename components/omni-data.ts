import { BrainCircuit, CircleDollarSign, Headphones, Mic2, PhoneCall, Settings2, ShoppingBag, UserPlus } from 'lucide-react'

export const navigationGroups = [
  { label: 'Inbound voice', items: [
    { name: 'Overview', href: '/voice', icon: PhoneCall, tone: 'blue', permission: 'handle_calls' },
    { name: 'Browser test call', href: '/voice/browser-test', icon: Headphones, tone: 'orange', permission: 'handle_calls' },
    { name: 'Call history', href: '/calls', icon: Mic2, tone: 'orange', permission: 'handle_calls' },
    { name: 'Voice cost planner', href: '/voice/pricing', icon: CircleDollarSign, tone: 'green', permission: 'manage_integrations' },
    { name: 'Voice providers', href: '/voice/providers', icon: Settings2, tone: 'blue', permission: 'manage_integrations' },
  ]},
  { label: 'AI Brain', items: [
    { name: 'Knowledge', href: '/brain/knowledge', icon: BrainCircuit, tone: 'blue', permission: 'manage_data' },
  ]},
  { label: 'Integrations', items: [
    { name: 'Shopify data access', href: '/integrations/shopify', icon: ShoppingBag, tone: 'green', permission: 'manage_integrations' },
  ]},
  { label: 'CRM', items: [
    { name: 'Leads', href: '/leads', icon: UserPlus, tone: 'red', permission: 'manage_assigned_leads' },
  ]},
]

export const omniNavigation = navigationGroups.flatMap((group) => group.items)

const extraPages: Record<string, { section: string; title: string }> = {
  '/login': { section: '', title: 'Sign in' },
  '/signup': { section: '', title: 'Create account' },
  '/invite/accept': { section: '', title: 'Accept invite' },
  '/voice/calls/': { section: 'Inbound voice', title: 'Call details' },
  '/leads/': { section: 'CRM', title: 'Lead details' },
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
