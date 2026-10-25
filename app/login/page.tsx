import dynamic from 'next/dynamic'

const LoginClient = dynamic(() => import('./LoginClient'), {
  ssr: false,
  loading: () => <main className="flex min-h-[100svh] items-center justify-center bg-[radial-gradient(circle_at_top_left,#F8F5FF_0%,#FFFFFF_45%,#F1EBFF_100%)] p-5"><div className="w-full max-w-[420px] rounded-[24px] border border-white/80 bg-white p-8 text-center shadow-[0_24px_80px_rgba(28,15,42,.12)]"><div className="mx-auto h-9 w-9 animate-pulse rounded-xl bg-[#E8DEFF]" /><p className="mt-4 text-sm font-semibold text-slate-500">Loading secure workspace access...</p></div></main>,
})

export default function LoginPage() {
  return <LoginClient />
}
