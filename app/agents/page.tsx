'use client'

import { Bot, MessageSquare, PhoneCall } from 'lucide-react'
import { ChannelCard, PageHeader } from '../../components/OmniPage'

export default function AgentsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Agents"
        description="Operate separate personas for WhatsApp and voice while keeping shared knowledge and transfer rules."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChannelCard
          title="Voice AI receptionist"
          description="Handles inbound and outbound calling, lead capture, and escalation to live agents."
          status="Live"
          icon={PhoneCall}
        />
        <ChannelCard
          title="WhatsApp support agent"
          description="Prepared for messaging workflows, FAQs, order updates, and handoff requests."
          status="Pending"
          icon={MessageSquare}
        />
        <ChannelCard
          title="Shared orchestration"
          description="One policy layer for prompts, knowledge, and intent-based routing across channels."
          status="Enabled"
          icon={Bot}
        />
      </div>
    </div>
  )
}
