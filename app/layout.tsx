import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import Sidebar from '../components/Sidebar'
import { Toaster } from 'react-hot-toast'
import GlobalHeader from '../components/GlobalHeader'

const manrope = Manrope({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AgentFlow Omni-Channel Dashboard',
  description: 'Unified WhatsApp and voice AI operations dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={manrope.className}>
        <div className="flex min-h-screen bg-transparent">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-auto">
            <GlobalHeader />
            <div className="mx-auto w-full max-w-[1800px] px-4 pb-10 pt-20 sm:px-6 lg:px-8 lg:pt-8">
              {children}
            </div>
          </main>
        </div>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(8, 13, 26, 0.95)',
              color: '#ECF3FF',
              border: '1px solid rgba(148, 163, 184, 0.18)',
              boxShadow: '0 16px 40px rgba(5, 10, 28, 0.35)',
              borderRadius: '18px',
            },
          }}
        />
      </body>
    </html>
  )
}
