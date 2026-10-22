'use client'

import Link from 'next/link'
import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { AlertCircle, ArrowRight, Check, CheckCircle2, Copy, ExternalLink, KeyRound, Loader2, ShieldCheck, ShoppingBag, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/OmniPage'
import { ActionButton, api, DataState } from '@/components/PlatformUI'

type AuthMode = 'client_credentials' | 'admin_token'
type Shopify = {
  connected?: boolean; store_domain?: string; api_version?: string; auth_mode?: AuthMode | 'none'
  client_id?: string; client_secret_configured?: boolean; access_token_configured?: boolean
  shop_name?: string; currency?: string; products_count?: number; api_status?: string; error?: string; token_expires_in?: number | null; oauth_redirect_uri?: string; connected_via?: string; app_client_id?: string
}
type Tools = Record<string, boolean>

const capabilities = [
  { id: 'products', title: 'Products, prices & options', scopes: ['read_products'], tool: 'search_shopify_products', example: '“Do you have the trail runner in size 9?”', detail: 'Live product names, prices and variants.' },
  { id: 'stock', title: 'Stock levels', scopes: ['read_inventory'], tool: 'check_inventory', example: '“Is it still in stock?”', detail: 'Adds “4 left” / “sold out” to product answers. When off, the AI gives prices but not stock counts.' },
  { id: 'orders', title: 'Order status & tracking', scopes: ['read_orders'], tool: 'get_order', example: '“Where is my order 1042?”', detail: 'Shared only when the caller is verified: their phone number is on the order, or they say the order email. Addresses and payment details are never read out.' },
  { id: 'caller-orders', title: 'Find orders by caller ID', scopes: ['read_orders', 'read_customers'], tool: 'get_customer_orders', example: '“Has my order shipped?”', detail: 'No order number needed when the caller rings from the phone number on their customer profile.' },
  { id: 'policies', title: 'Return, refund & shipping policies', scopes: ['read_legal_policies'], tool: 'get_store_policy', example: '“What is your return policy?”', detail: 'Uses the policies saved in Shopify Settings → Policies.' },
]

const allScopes = ['read_products', 'read_inventory', 'read_orders', 'read_customers', 'read_legal_policies']

function Switch({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: () => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} title={label} disabled={disabled} onClick={onChange}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${checked ? 'bg-purple-600' : 'bg-slate-300'}`}>
    <span className={`pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
}

const setupSteps: Record<AuthMode, { title: string; steps: ReactNode[] }> = {
  client_credentials: {
    title: 'Dev Dashboard app (for apps created from 2026)',
    steps: [
      <>Open the <a className="font-semibold text-purple-700 underline" href="https://dev.shopify.com/dashboard/" target="_blank" rel="noreferrer">Shopify Dev Dashboard</a> with the account that owns the store and create an app.</>,
      <>In the app version, select the Admin API scopes: <code className="text-[11px]">{allScopes.join(', ')}</code>. For order and customer data, also complete the protected customer data request.</>,
      <>In the same version, paste the redirect address shown in the form into <strong>Allowed redirection URL(s)</strong>, then release it.</>,
      <>Open the app’s <strong>Settings</strong>, copy the <strong>Client ID</strong> and <strong>Client secret</strong> into the form, and click <strong>Connect with Shopify</strong>. Approve in Shopify and you come straight back here, connected.</>,
    ],
  },
  admin_token: {
    title: 'Older custom app (created in Shopify admin before 2026)',
    steps: [
      <>Shopify admin → <strong>Settings → Apps and sales channels → Develop apps</strong> → your app.</>,
      <>Under <strong>Configuration</strong>, select the scopes <code className="text-[11px]">{allScopes.join(', ')}</code> and save.</>,
      <>Install or reinstall the app, then reveal the <strong>Admin API access token</strong> (starts with <code>shpat_</code>) and paste it here.</>,
    ],
  },
}

export default function ShopifyIntegrationPage() {
  const [shopify, setShopify] = useState<Shopify>({})
  const [granted, setGranted] = useState<string[]>([])
  const [tools, setTools] = useState<Tools>({})
  const [mode, setMode] = useState<AuthMode>('client_credentials')
  const [storeDomain, setStoreDomain] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [allOrders, setAllOrders] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [status, toolResult] = await Promise.all([
        api<{ data: Shopify }>('/api/platform/shopify/status'),
        api<{ data: Tools }>('/api/platform/tools'),
      ])
      const data = status.data || {}
      setShopify(data); setTools(toolResult.data || {})
      setStoreDomain(data.store_domain || ''); setClientId(data.client_id || '')
      setClientId(data.app_client_id || data.client_id || '')
      if (data.connected_via === 'oauth') setMode('client_credentials')
      else if (data.auth_mode === 'admin_token' || data.auth_mode === 'client_credentials') setMode(data.auth_mode)
      if (data.connected && data.api_status === 'connected') {
        const scopes = await api<{ data: { granted?: string[] } }>('/api/platform/shopify/scopes')
        setGranted(scopes.data?.granted || [])
      } else setGranted([])
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Unable to load Shopify access') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    // Back from "Connect with Shopify": say how it went, then tidy the address bar.
    const params = new URLSearchParams(window.location.search)
    if (params.get('shopify_connected')) toast.success('Shopify connected')
    if (params.get('shopify_error')) toast.error(params.get('shopify_error') || 'Shopify could not be connected', { duration: 8000 })
    if (params.has('shopify_connected') || params.has('shopify_error')) window.history.replaceState(null, '', window.location.pathname)
  }, [])

  /** Connect with Shopify: open Shopify's approval page; Shopify sends the browser back here when done. */
  const connectWithShopify = async () => {
    setSaving(true)
    try {
      const result = await api<{ data: { url: string } }>('/api/platform/shopify/oauth/start', { method: 'POST', body: JSON.stringify({ store_domain: storeDomain, client_id: clientId, client_secret: clientSecret, return_to: window.location.origin, all_orders: allOrders }) })
      window.location.href = result.data.url
    } catch (exception) { toast.error(exception instanceof Error ? exception.message : 'Could not start the Shopify connection'); setSaving(false) }
  }

  const saveConnection = async (event: FormEvent) => {
    event.preventDefault()
    if (mode === 'client_credentials') { connectWithShopify(); return }
    setSaving(true)
    try {
      const result = await api<{ data: Shopify }>('/api/platform/shopify/configure', {
        method: 'PUT',
        body: JSON.stringify({ store_domain: storeDomain, auth_mode: mode, client_id: clientId, client_secret: clientSecret, access_token: accessToken, api_version: shopify.api_version || '2025-10', test_connection: true }),
      })
      setClientSecret(''); setAccessToken('')
      if (result.data?.api_status === 'connected') { toast.success(`Connected to ${result.data.shop_name || 'Shopify'}`); await load() }
      else { setShopify(result.data || {}); toast.error(result.data?.error || 'Shopify could not be connected') }
    } catch (exception) { toast.error(exception instanceof Error ? exception.message : 'Could not save Shopify connection') }
    finally { setSaving(false) }
  }

  const toggleTool = async (tool: string) => {
    const next = { ...tools, [tool]: !tools[tool] }
    setTools(next)
    try { await api('/api/platform/tools', { method: 'PUT', body: JSON.stringify({ value: next }) }); toast.success(next[tool] ? 'Turned on for the AI' : 'Turned off for the AI') }
    catch (exception) { setTools(tools); toast.error(exception instanceof Error ? exception.message : 'Could not update the AI tools') }
  }

  const indexCatalog = async () => {
    setIndexing(true)
    try {
      const result = await api<{ data: { chunks?: number } }>('/api/platform/brain/shopify', { method: 'POST' })
      toast.success(`Product catalog added to the knowledge base (${result.data?.chunks || 0} pieces)`)
    } catch (exception) { toast.error(exception instanceof Error ? exception.message : 'Could not index the catalog') }
    finally { setIndexing(false) }
  }

  const live = Boolean(shopify.connected && shopify.api_status === 'connected')
  const hasScope = (scope: string) => granted.includes(scope) || granted.includes(scope.replace('read_', 'write_'))
  const savedSecret = mode === 'client_credentials' ? Boolean((shopify.auth_mode === 'client_credentials' && shopify.client_secret_configured) || shopify.connected_via === 'oauth') : shopify.auth_mode === 'admin_token' && shopify.access_token_configured

  return <div className="space-y-4">
    <PageHeader title="Shopify data access" description="Connect your store so the AI can answer product, stock, order and policy questions with live Shopify data." />
    <DataState loading={loading} error={error} onRetry={load}>
      <section className={`surface-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 sm:p-5 ${live ? '' : 'border-purple-200'}`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${live ? 'bg-purple-50 text-purple-700' : 'bg-purple-50 text-purple-700'}`}><ShoppingBag className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-bold text-slate-950">{live ? shopify.shop_name || shopify.store_domain : shopify.connected ? 'Connection failed' : 'No store connected'}</h2>
            <p className="mt-0.5 break-words text-sm text-slate-600">{live
              ? `${shopify.store_domain} · ${shopify.products_count ?? 0} products · ${shopify.connected_via === 'oauth' ? 'Connected with Shopify' : shopify.auth_mode === 'client_credentials' ? 'Dev Dashboard app (token renews automatically)' : 'Admin API token'}`
              : shopify.error || 'Connect a store below. The AI answers store questions only after this is connected.'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {live && <ActionButton onClick={indexCatalog} disabled={indexing} title="Copy product names and descriptions into the knowledge base so the AI recognises them" icon={indexing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}>{indexing ? 'Indexing…' : 'Index catalog'}</ActionButton>}
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-4">
          <section className="surface-panel rounded-2xl p-4 sm:p-5">
            <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700"><ShieldCheck className="h-[18px] w-[18px]" /></span><div><h2 className="text-[15px] font-bold text-slate-950">What the AI can answer</h2><p className="mt-0.5 text-sm text-slate-600">Each feature needs a Shopify permission (scope) on your app, plus its switch here.</p></div></div>
            <ul className="mt-4 divide-y divide-slate-200">
              {capabilities.map((item) => {
                const scopesOk = item.scopes.every(hasScope)
                const toolOn = item.tool ? Boolean(tools[item.tool]) : true
                const ready = live && scopesOk && toolOn
                return <li key={item.id} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ready ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'}`}>{ready ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-sm font-semibold text-slate-900">{item.title}</span><span className="text-xs italic text-slate-500">{item.example}</span></div>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.detail}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">{item.scopes.map((scope) => <code key={scope} className={`rounded px-1.5 py-0.5 text-[11px] ${live && hasScope(scope) ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>{live && hasScope(scope) ? '✓ ' : ''}{scope}</code>)}</div>
                  </div>
                  {item.tool && <Switch checked={toolOn} onChange={() => toggleTool(item.tool)} label={`${toolOn ? 'Turn off' : 'Turn on'} ${item.title}`} />}
                </li>
              })}
            </ul>
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">Never needed for this agent: payments, themes, files, staff accounts, or write access. The AI only reads; it never changes orders or products.</p>
          </section>

          {live && <Link href="/integrations/shopify/store" className="group flex items-center gap-4 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-white p-4 transition hover:border-purple-400 sm:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white"><Store className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold text-slate-950">Open store data</span><span className="block text-sm text-slate-600">Products, orders, customers and policies, live from Shopify, plus a caller-question test.</span></span>
            <ArrowRight className="h-5 w-5 shrink-0 text-purple-400 transition group-hover:translate-x-0.5 group-hover:text-purple-700" />
          </Link>}

        </div>

        <aside className={`min-w-0 space-y-4 ${live ? '' : 'order-first xl:order-none'}`}>
          <form onSubmit={saveConnection} className="surface-panel rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700"><KeyRound className="h-[18px] w-[18px]" /></span><div><h2 className="text-[15px] font-bold text-slate-950">Connect your store</h2><p className="text-xs text-slate-500">Owner or Admin only · secrets are never shown again</p></div></div>
            <div role="tablist" className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
              {(['client_credentials', 'admin_token'] as AuthMode[]).map((option) => <button key={option} type="button" role="tab" aria-selected={mode === option} onClick={() => setMode(option)} className={`rounded-md px-2 py-1.5 transition ${mode === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{option === 'client_credentials' ? 'Connect with Shopify' : 'Admin API token'}</button>)}
            </div>
            <label className="mt-4 block"><span className="field-label">Store domain</span><input required value={storeDomain} onChange={(event) => setStoreDomain(event.target.value)} placeholder="your-store.myshopify.com" /></label>
            {mode === 'client_credentials' ? <>
              <label className="mt-3 block"><span className="field-label">Client ID</span><input required value={clientId} onChange={(event) => setClientId(event.target.value)} placeholder="From the app’s Settings page" /></label>
              <label className="mt-3 block"><span className="field-label">Client secret</span><input type="password" required={!savedSecret} value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} placeholder={savedSecret ? 'Saved · leave blank to keep' : 'shpss_…'} /></label>
            </> : <label className="mt-3 block"><span className="field-label">Admin API access token</span><input type="password" required={!savedSecret} value={accessToken} onChange={(event) => setAccessToken(event.target.value)} placeholder={savedSecret ? 'Saved · leave blank to keep' : 'shpat_…'} /></label>}
            {mode === 'client_credentials' && <div className="mt-4 rounded-lg border border-purple-100 bg-purple-50/60 p-3">
              <div className="text-xs font-semibold text-slate-700">Add this to the app in Shopify first</div>
              <p className="mt-0.5 text-[11px] leading-4 text-slate-500">Dev Dashboard → your app → Versions → <strong>Allowed redirection URL(s)</strong>, then Release.</p>
              {shopify.oauth_redirect_uri ? <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1.5 text-[11px] text-slate-700 ring-1 ring-purple-100" title={shopify.oauth_redirect_uri}>{shopify.oauth_redirect_uri}</code>
                <button type="button" onClick={() => navigator.clipboard?.writeText(shopify.oauth_redirect_uri || '').then(() => toast.success('Copied'))} title="Copy" aria-label="Copy the redirect address" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-purple-700 ring-1 ring-purple-100 hover:ring-purple-300"><Copy className="h-3.5 w-3.5" /></button></div>
                : <p className="mt-2 text-[11px] text-purple-900">The backend has no public HTTPS address yet (TWILIO_PUBLIC_BASE_URL).</p>}
            </div>}
            {mode === 'client_credentials' && <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-purple-100 p-3">
              <input type="checkbox" checked={allOrders || granted.includes('read_all_orders')} disabled={granted.includes('read_all_orders')} onChange={(event) => setAllOrders(event.target.checked)} className="mt-0.5 h-4 w-4 accent-purple-600" />
              <span className="text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-800">Include orders older than 60 days</span>{granted.includes('read_all_orders') ? ' (granted)' : <> — first add <code className="text-[11px]">read_all_orders</code> to the app's scopes in Shopify and release; Shopify may ask you to request it.</>}</span>
            </label>}
            <div className="mt-4"><ActionButton type="submit" primary disabled={saving} icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}>{saving ? 'Connecting…' : mode === 'client_credentials' ? 'Connect with Shopify' : 'Save & test connection'}</ActionButton></div>
          </form>

          <section className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4 sm:p-5">
            <h2 className="text-sm font-bold text-slate-900">{setupSteps[mode].title}</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm leading-6 text-slate-600">{setupSteps[mode].steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
            {mode === 'client_credentials'
              ? <p className="mt-3 flex gap-2 text-xs leading-5 text-slate-500"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Works whichever Shopify organization the app was made in. If ngrok shows a “You are about to visit” page on the way back, click Visit Site.</p>
              : <p className="mt-3 flex gap-2 text-xs leading-5 text-slate-500"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Shopify stopped allowing new apps of this type on 1 January 2026. Existing ones keep working.</p>}
            <a href="https://shopify.dev/docs/apps/build/dev-dashboard/get-api-access-tokens" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:underline">Shopify’s guide <ExternalLink className="h-3 w-3" /></a>
          </section>

          {live && <section className="flex items-start gap-2 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 break-words">Granted permissions: <span className="font-mono text-xs">{granted.join(', ') || 'none'}</span></span></section>}
        </aside>
      </div>
    </DataState>
  </div>
}
