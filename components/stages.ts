import { CalendarDays, CheckCircle2, CircleDollarSign, MinusCircle, PhoneOutgoing, Star, ThumbsUp, Wrench, XCircle } from 'lucide-react'

/** Pipeline status of a conversation, in order (sidebar STATUS group, as in Podium). Keep in step with STAGES in inbox_api.py. */
export const STAGES = [
  { id: 'new_lead', label: 'New lead', icon: ThumbsUp },
  { id: 'outreach', label: 'Outreach', icon: PhoneOutgoing },
  { id: 'scheduling', label: 'Scheduling', icon: CalendarDays },
  { id: 'servicing', label: 'Servicing', icon: Wrench },
  { id: 'payment_collection', label: 'Payment collection', icon: CircleDollarSign },
  { id: 'follow_up', label: 'Follow-up', icon: Star },
  { id: 'lost', label: 'Lost', icon: XCircle },
  { id: 'unqualified', label: 'Unqualified', icon: MinusCircle },
  { id: 'won', label: 'Won', icon: CheckCircle2 },
]

export const stageInfo = (id?: string) => STAGES.find((stage) => stage.id === id) || STAGES[0]
