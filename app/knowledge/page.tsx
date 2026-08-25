'use client'

import { Brain, Database, FileText } from 'lucide-react'
import { ChannelCard, PageHeader } from '../../components/OmniPage'

export default function KnowledgePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Knowledge"
        description="Keep channel answers aligned with the same business facts, documents, and escalation rules."
        actionLabel="Open Configuration"
        actionHref="/config"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChannelCard
          title="Core business facts"
          description="Greeting, exit messaging, and company context used by voice and future WhatsApp workflows."
          status="Enabled"
          icon={Database}
        />
        <ChannelCard
          title="Prompt orchestration"
          description="Shared intent handling and domain restrictions for both channels."
          status="Enabled"
          icon={Brain}
        />
        <ChannelCard
          title="Source documents"
          description="Ready to expand into website content, FAQs, brochures, or external catalogs."
          status="Planned"
          icon={FileText}
        />
      </div>
    </div>
  )
}
