import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import Sidebar from '../components/Sidebar'
import { Toaster } from 'react-hot-toast'
import GlobalHeader from '../components/GlobalHeader'

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
        <div className="flex min-h-screen bg-[#eef2f6]">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-auto">
            <GlobalHeader />
            <div className="mx-auto w-full max-w-[1800px] bg-[linear-gradient(180deg,#eef2f6_0%,#f8fafc_280px,#f8fafc_100%)] px-4 pb-10 pt-20 sm:px-6 lg:px-8 lg:pt-8">
              {children}
            </div>
          </main>
        </div>
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
