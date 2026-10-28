'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type PWAContextValue = {
  installed: boolean
  installAvailable: boolean
  promptInstall: () => Promise<boolean>
}

const PWAContext = createContext<PWAContextValue>({
  installed: false,
  installAvailable: false,
  promptInstall: async () => false,
})

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches
  || (navigator as Navigator & { standalone?: boolean }).standalone === true

export function usePWA() {
  return useContext(PWAContext)
}

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    setInstalled(isStandalone())
    setOffline(!navigator.onLine)

    const available = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const complete = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }
    const goOnline = () => setOffline(false)
    const goOffline = () => setOffline(true)

    window.addEventListener('beforeinstallprompt', available)
    window.addEventListener('appinstalled', complete)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
          // PWA support is progressive; the CRM remains fully usable in browsers without SW access.
        })
      } else {
        // The dev server's bundles keep the same names (/_next/static/chunks/app/layout.js) while their code changes,
        // so a worker that caches them served old components against new server HTML (hydration errors). In
        // development: remove any installed worker and its caches, so every reload runs the current code.
        navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister())).catch(() => {})
        if ('caches' in window) caches.keys().then((names) => names.filter((name) => name.startsWith('relaydesk-')).forEach((name) => caches.delete(name))).catch(() => {})
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', available)
      window.removeEventListener('appinstalled', complete)
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const promptInstall = async () => {
    if (!installPrompt) return false
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
    return true
  }

  return <PWAContext.Provider value={{ installed, installAvailable: Boolean(installPrompt), promptInstall }}>
    {children}
    {offline && <div className="pwa-status pwa-status-offline" role="status">You're offline. RelayDesk will reconnect when your network returns.</div>}
  </PWAContext.Provider>
}
