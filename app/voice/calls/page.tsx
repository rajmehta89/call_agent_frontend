import { redirect } from 'next/navigation'

// Call history lives at /calls; keep this old address working. Single calls stay at /voice/calls/<id>.
export default function VoiceCallsRedirect() {
  redirect('/calls')
}
