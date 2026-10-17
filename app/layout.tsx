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
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)',
              borderRadius: '12px',
            },
          }}
        />
      </body>
    </html>
  )
}
