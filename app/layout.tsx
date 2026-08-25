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
        <div className="flex min-h-screen bg-[#f6f7fb]">
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
              background: '#20263d',
              color: '#ffffff',
              border: '1px solid #343b58',
              boxShadow: '0 16px 40px rgba(48, 54, 92, 0.2)',
              borderRadius: '18px',
            },
          }}
        />
      </body>
    </html>
  )
}
