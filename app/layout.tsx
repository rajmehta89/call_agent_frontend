import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

// Design system typography (design-system/relaydesk/MASTER.md): self-hosted by next/font, no layout shift.
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-jakarta', display: 'swap' })
import AppShell from '../components/AppShell'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: { default: 'RelayDesk', template: '%s · RelayDesk' },
  description: 'Voice AI, CRM and AI Brain workspace',
  applicationName: 'RelayDesk',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <AppShell>{children}</AppShell>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#32136B', fontWeight: 600,
              border: '1px solid #E9DFFF',
              boxShadow: '0 24px 48px -24px rgba(108,59,255,.45)',
              borderRadius: '14px',
            },
          }}
        />
      </body>
    </html>
  )
}
