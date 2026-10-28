import dynamic from 'next/dynamic'
import { Loader } from '@/components/PlatformUI'

const LoginClient = dynamic(() => import('./LoginClient'), {
  ssr: false,
  loading: () => <main className="flex min-h-[100svh] items-center justify-center bg-[radial-gradient(circle_at_top_left,#F8F5FF_0%,#FFFFFF_45%,#F1EBFF_100%)] p-5"><div className="w-full max-w-[420px] rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_24px_80px_rgba(28,15,42,.12)]"><Loader variant="panel" label="Loading sign-in" /></div></main>,
})

export default function LoginPage() {
  return <LoginClient />
}
