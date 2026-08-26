import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import AppShell from '../components/AppShell'
import { Toaster } from 'react-hot-toast'

const manrope = Manrope({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AgentFlow AI Workspace',
  description: 'WhatsApp and voice AI operations workspace',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={manrope.className}>
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
