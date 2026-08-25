import {
  Activity, BarChart3, Bot, Brain, Boxes, Home, MessageSquare, PhoneCall,
  Plug, Settings, ShoppingBag, Sparkles, Users, UserRound, Workflow,
} from 'lucide-react'

export const navigationGroups = [
  { label: '', items: [{ name: 'Dashboard', href: '/', icon: Home }] },
  { label: 'WhatsApp', items: [
    { name: 'Overview', href: '/whatsapp', icon: MessageSquare },
    { name: 'Inbox', href: '/whatsapp/inbox', icon: MessageSquare },
    { name: 'Agent', href: '/whatsapp/agent', icon: Bot },
    { name: 'Automations', href: '/whatsapp/automations', icon: Workflow },
    { name: 'Templates', href: '/whatsapp/templates', icon: Boxes },
  ]},
  { label: 'Voice', items: [
    { name: 'Overview', href: '/voice', icon: PhoneCall },
    { name: 'Calls', href: '/voice/calls', icon: PhoneCall },
    { name: 'Agent', href: '/voice/agent', icon: Bot },
  ]},
  { label: 'Assistant', items: [
    { name: 'Knowledge Base', href: '/brain/knowledge', icon: Brain },
    { name: 'Shopify', href: '/brain/shopify', icon: ShoppingBag },
    { name: 'AI Tools', href: '/brain/tools', icon: Sparkles },
    { name: 'AI Activity', href: '/brain/activity', icon: Activity },
  ]},
  { label: 'Customers & Leads', items: [
    { name: 'Customers', href: '/customers', icon: UserRound },
    { name: 'Leads', href: '/leads', icon: Users },
  ]},
  { label: 'Operations', items: [
    { name: 'Automations', href: '/automations', icon: Workflow },
    { name: 'Integrations', href: '/integrations', icon: Plug },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  ]},
  { label: 'Administration', items: [
    { name: 'Team', href: '/team', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]},
]

export const omniNavigation = navigationGroups.flatMap((group) => group.items)

export const automationRows = [
  { title: 'Missed call recovery', description: 'Missed voice call -> create lead -> send WhatsApp follow-up.', status: 'Active' },
  { title: 'Product enquiry qualification', description: 'WhatsApp enquiry -> live Shopify search -> qualify -> handoff.', status: 'Active' },
]

export const integrationRows = [
  { name: 'Twilio Voice', detail: 'Inbound and outbound voice transport.', status: 'Connected' },
  { name: 'WhatsApp', detail: 'Meta Cloud API or Twilio WhatsApp transport.', status: 'Credential gated' },
  { name: 'OpenAI', detail: 'Shared reasoning layer for both channel agents.', status: 'Connected' },
  { name: 'Shopify', detail: 'Live products, inventory, customers, and orders.', status: 'Credential gated' },
  { name: 'MongoDB', detail: 'Customers, leads, calls, messages, tools, and logs.', status: 'Connected' },
]
