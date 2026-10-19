import type { Metadata } from 'next'
import './globals.css'
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
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#1c0f2a',
              border: '1px solid #e9e2f0',
              boxShadow: '0 16px 40px rgba(28,15,42, 0.12)',
              borderRadius: '12px',
            },
          }}
        />
      </body>
    </html>
  )
}
