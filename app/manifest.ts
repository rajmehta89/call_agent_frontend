import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'RelayDesk',
    short_name: 'RelayDesk',
    description: 'Voice AI, conversations and customer operations in one workspace.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    lang: 'en',
    categories: ['business', 'productivity'],
    background_color: '#F8F5FF',
    theme_color: '#32136B',
    icons: [
      { src: '/icons/relaydesk-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/relaydesk-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/relaydesk-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/relaydesk-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
