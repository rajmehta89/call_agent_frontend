'use client'

import { useEffect, useMemo, useState } from 'react'
import { MessageSquare, PhoneCall, Send, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { ChannelCard, PageHeader } from '../../components/OmniPage'

const API_BASE = process.env.NEXT_PUBLIC_CALL_API_URL || 'https://call-agent-backend-ssrw.onrender.com'

type Conversation = {
  _id: string
  customer_phone: string
  customer_name: string
  status: string
  last_message: string
  last_message_direction: string | null
  updated_at: string
  message_count: number
  lead?: {
    lead_id: string
    name: string
    company: string
    email: string
  } | null
}

type Message = {
  _id: string
  text: string
  direction: 'inbound' | 'outbound'
  provider: string
  created_at: string
  status: string
}

type Stats = {
  conversations: number
  open_conversations: number
  messages: number
  inbound_messages: number
  outbound_messages: number
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [stats, setStats] = useState<Stats>({
    conversations: 0,
    open_conversations: 0,
    messages: 0,
    inbound_messages: 0,
    outbound_messages: 0,
  })
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const selectedConversation = useMemo(
    () => conversations.find((item) => item._id === selectedId) || null,
    [conversations, selectedId],
  )

  const loadConversations = async () => {
    try {
      const [conversationsResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE}/api/whatsapp/conversations`),
        fetch(`${API_BASE}/api/whatsapp/stats`),
      ])
      const [conversationsPayload, statsPayload] = await Promise.all([
        conversationsResponse.json(),
        statsResponse.json(),
      ])

      if (conversationsPayload.success) {
        setConversations(conversationsPayload.data)
        if (!selectedId && conversationsPayload.data.length > 0) {
          setSelectedId(conversationsPayload.data[0]._id)
        }
      }
      if (statsPayload.success) {
        setStats(statsPayload.data)
      }
    } catch (error) {
      console.error('Failed to load WhatsApp data', error)
    }
  }

  const loadMessages = async (conversationId: string) => {
    if (!conversationId) return
    try {
      const response = await fetch(`${API_BASE}/api/whatsapp/conversations/${conversationId}/messages`)
      const payload = await response.json()
      if (payload.success) {
        setMessages(payload.data)
      }
    } catch (error) {
      console.error('Failed to load messages', error)
    }
  }

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId)
    }
  }, [selectedId])

  const sendMessage = async () => {
    if (!selectedConversation || !draft.trim()) return
    setSending(true)
    try {
      const response = await fetch(`${API_BASE}/api/whatsapp/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedConversation.customer_phone,
          text: draft.trim(),
          conversation_id: selectedConversation._id,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload?.detail?.error || payload?.error || 'Failed to send message')
      }
      setDraft('')
      await loadMessages(selectedConversation._id)
      await loadConversations()
      toast.success('WhatsApp message sent')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Conversations"
        description="A premium operator desk for WhatsApp threads, reply orchestration, and linked lead context. Voice outcomes continue to live in the dedicated call views."
        actionLabel="Open Voice Calls"
        actionHref="/calls"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ChannelCard
          title="WhatsApp relationship desk"
          description={`${stats.conversations} conversations and ${stats.messages} stored messages are available for review, response, and AI assistance.`}
          status={stats.conversations > 0 ? 'Active' : 'Ready'}
          icon={MessageSquare}
        />
        <ChannelCard
          title="Voice follow-up desk"
          description="Completed calls, transcripts, and human transfer states remain connected to the live backend call surfaces."
          status="Live"
          icon={PhoneCall}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[370px_minmax(0,1fr)]">
        <div className="surface-panel rounded-[28px] overflow-hidden">
          <div className="border-b border-white/6 px-5 py-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 text-[#f4d39a]" />
              WhatsApp relationship desk
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{stats.open_conversations} open conversations</div>
          </div>
          <div className="max-h-[680px] overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="px-5 py-10 text-sm text-slate-500">No WhatsApp conversations stored yet.</div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation._id}
                  type="button"
                  onClick={() => setSelectedId(conversation._id)}
                  className={`w-full border-b border-white/6 px-5 py-4 text-left transition hover:bg-white/[0.03] ${
                    conversation._id === selectedId ? 'bg-white/[0.04]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-white">
                      {conversation.customer_name || conversation.customer_phone}
                    </div>
                    <span className="text-xs text-slate-500">{formatShortDate(conversation.updated_at)}</span>
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">{conversation.customer_phone}</div>
                  <div className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">{conversation.last_message || 'No messages yet'}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="premium-badge pending">{conversation.message_count} messages</span>
                    <span className="text-xs text-slate-500">{conversation.lead?.name || 'No linked lead'}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="surface-panel-strong rounded-[28px] overflow-hidden">
          <div className="border-b border-white/6 px-5 py-5">
            <div className="text-sm font-semibold text-white">
              {selectedConversation ? selectedConversation.customer_name || selectedConversation.customer_phone : 'Conversation detail'}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {selectedConversation
                ? `${selectedConversation.customer_phone} · ${selectedConversation.lead?.name || 'No linked lead'}`
                : 'Select a conversation to inspect or reply.'}
            </div>
          </div>

          <div className="min-h-[440px] max-h-[560px] space-y-4 overflow-y-auto px-5 py-5">
            {selectedConversation ? (
              messages.length > 0 ? (
                messages.map((message) => (
                  <div
                    key={message._id}
                    className={`max-w-[82%] rounded-[24px] px-4 py-3 ${
                      message.direction === 'outbound'
                        ? 'ml-auto bg-[linear-gradient(135deg,#d6a34f,#ba7d2f)] text-slate-950 shadow-[0_14px_34px_rgba(214,163,79,0.22)]'
                        : 'border border-white/6 bg-white/[0.04] text-slate-100'
                    }`}
                  >
                    <div className="text-sm leading-7">{message.text}</div>
                    <div className={`mt-2 text-xs ${message.direction === 'outbound' ? 'text-slate-900/70' : 'text-slate-400'}`}>
                      {message.provider} · {formatShortDate(message.created_at)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">No messages stored for this conversation yet.</div>
              )
            ) : (
              <div className="text-sm text-slate-500">No conversation selected.</div>
            )}
          </div>

          <div className="border-t border-white/6 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={selectedConversation ? `Reply to ${selectedConversation.customer_phone}` : 'Select a conversation first'}
                disabled={!selectedConversation || sending}
                className="flex-1"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!selectedConversation || !draft.trim() || sending}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#d6a34f,#ba7d2f)] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatShortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
