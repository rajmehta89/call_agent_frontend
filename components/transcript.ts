/** A call's conversation in speaking order, for every page that shows a transcript.

    Order of preference:
    1. `messages` — the ordered transcript written during the call (live_transcript.py), with real per-line times;
    2. `transcript_with_tool_calls` — Retell's transcript, already in speaking order;
    3. `transcription` + `ai_responses` merged by timestamp (older records). Retell's final save gives every line
       of these two lists the same timestamp, so on their own they would list all caller lines before the agent's. */
export type TranscriptLine = { type: string; content: string; timestamp?: string; role?: string }

type Line = { role?: string; type?: string; text?: string; content?: string; at?: string; timestamp?: string }
type CallLike = { messages?: Line[]; transcript_with_tool_calls?: Line[]; transcription?: Line[]; ai_responses?: Line[] }

const caller = (role?: string) => ['customer', 'user'].includes(String(role || '').toLowerCase())

export function orderedTranscript(call?: CallLike | null): TranscriptLine[] {
  if (!call) return []
  if (call.messages?.length) {
    return call.messages.filter((line) => (line.text || '').trim())
      .map((line) => ({ type: caller(line.role) ? 'user' : 'bot', role: caller(line.role) ? 'user' : 'agent', content: line.text!.trim(), timestamp: line.at || undefined }))
  }
  const retell = (call.transcript_with_tool_calls || []).filter((line) => ['user', 'agent', 'assistant'].includes(String(line.role || '').toLowerCase()) && (line.content || '').trim())
  if (retell.length) return retell.map((line) => ({ type: caller(line.role) ? 'user' : 'bot', role: caller(line.role) ? 'user' : 'agent', content: line.content!.trim(), timestamp: line.timestamp }))
  return [...(call.transcription || []), ...(call.ai_responses || [])]
    .filter((line) => (line.content || '').trim())
    .map((line) => ({ type: line.type || (caller(line.role) ? 'user' : 'bot'), role: caller(line.type || line.role) ? 'user' : 'agent', content: line.content!.trim(), timestamp: line.timestamp }))
    .sort((left, right) => new Date(left.timestamp || 0).getTime() - new Date(right.timestamp || 0).getTime())
}
