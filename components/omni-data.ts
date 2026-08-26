import {
  BarChart3, BookOpen, Bot, Inbox, LayoutDashboard,
  MessageCircle, MessagesSquare, Mic2, PhoneCall, PhoneIncoming,
  PhoneOutgoing, Plug, Settings, Sparkles, SlidersHorizontal, UserPlus,
  UserRound, Users, Workflow, Wrench,
} from 'lucide-react'

export const navigationGroups = [
  { label: '', items: [{ name: 'Dashboard', href: '/', icon: LayoutDashboard, tone: 'amber' }] },
  { label: 'WhatsApp', items: [
    { name: 'Overview', href: '/whatsapp', icon: MessageCircle, tone: 'emerald', permission: 'handle_conversations' },
    { name: 'Inbox', href: '/whatsapp/inbox', icon: Inbox, tone: 'cyan', permission: 'handle_conversations' },
    { name: 'Message activity', href: '/whatsapp/activity', icon: MessagesSquare, tone: 'sky', permission: 'handle_conversations' },
    { name: 'Agent', href: '/whatsapp/agent', icon: Bot, tone: 'violet', permission: 'manage_agents' },
  ]},
  { label: 'Voice', items: [
    { name: 'Overview', href: '/voice', icon: PhoneCall, tone: 'blue', permission: 'handle_calls' },
    { name: 'Calls', href: '/voice/calls', icon: PhoneOutgoing, tone: 'indigo', permission: 'handle_calls' },
    { name: 'Call activity', href: '/voice/activity', icon: PhoneIncoming, tone: 'rose', permission: 'handle_calls' },
    { name: 'Agent', href: '/voice/agent', icon: Mic2, tone: 'orange', permission: 'manage_agents' },
  ]},
  { label: 'Assistant', items: [
    { name: 'Knowledge Base', href: '/brain/knowledge', icon: BookOpen, tone: 'yellow', permission: 'manage_data' },
    { name: 'AI Tools', href: '/brain/tools', icon: Wrench, tone: 'fuchsia', permission: 'manage_agents' },
    { name: 'AI Activity', href: '/brain/activity', icon: Sparkles, tone: 'pink', permission: 'manage_agents' },
  ]},
  { label: 'Customers & Leads', items: [
    { name: 'Customers', href: '/customers', icon: UserRound, tone: 'teal', permission: 'view_customers' },
    { name: 'Leads', href: '/leads', icon: UserPlus, tone: 'red', permission: 'manage_assigned_leads' },
  ]},
  { label: 'Operations', items: [
    { name: 'Automations', href: '/automations', icon: Workflow, tone: 'green', permission: 'manage_automations' },
    { name: 'Integrations', href: '/integrations', icon: Plug, tone: 'slate', permission: 'manage_integrations' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, tone: 'purple', permission: 'view_analytics' },
  ]},
  { label: 'Administration', items: [
    { name: 'Team', href: '/team', icon: Users, tone: 'slate', permission: 'manage_team' },
    { name: 'Settings', href: '/settings', icon: SlidersHorizontal, tone: 'gray', permission: 'manage_workspace' },
  ]},
]

export const omniNavigation = navigationGroups.flatMap((group) => group.items)

export const integrationRows = [
  { name: 'Twilio Voice', detail: 'Inbound and outbound voice transport.', status: 'Connected' },
  { name: 'WhatsApp', detail: 'Meta Cloud API or Twilio WhatsApp transport.', status: 'Credential gated' },
  { name: 'OpenAI', detail: 'Shared reasoning layer for both channel agents.', status: 'Connected' },
  { name: 'Shopify', detail: 'Live products, inventory, customers, and orders.', status: 'Credential gated' },
  { name: 'MongoDB', detail: 'Customers, leads, calls, messages, tools, and logs.', status: 'Connected' },
]
