import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

// Design system typography (design-system/relaydesk/MASTER.md): self-hosted by next/font, no layout shift.
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-jakarta', display: 'swap' })
import AppShell from '../components/AppShell'
import PWAProvider from '../components/PWAProvider'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: { default: 'RelayDesk', template: '%s · RelayDesk' },
  description: 'Voice AI, CRM and AI Brain workspace',
  applicationName: 'RelayDesk',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'RelayDesk' },
  icons: { apple: '/icons/relaydesk-180.png' },
}

export const viewport: Viewport = { themeColor: '#32136B' }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <PWAProvider>
          <AppShell>{children}</AppShell>
        </PWAProvider>
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
