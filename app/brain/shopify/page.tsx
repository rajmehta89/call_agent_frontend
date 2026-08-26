'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { KeyRound, RefreshCw, Save, ShoppingBag } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { ActionButton, api, DataState, MetricGrid, StatusBadge, Toolbar } from '@/components/PlatformUI'

type Product = {
  id: string
  title: string
  vendor?: string
  product_type?: string
  status?: string
  variants?: { price?: string; inventory_quantity?: number }[]
}

export default function ShopifyPage() {
  const [status, setStatus] = useState<any>({})
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [storeDomain, setStoreDomain] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [apiVersion, setApiVersion] = useState('2025-10')
  const [configuring, setConfiguring] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const connection = await api<any>('/api/platform/shopify/status')
      setStatus(connection.data)
      setStoreDomain(connection.data.store_domain || '')
      setApiVersion(connection.data.api_version || '2025-10')
      if (connection.data.connected) {
        const result = await api<any>(`/api/platform/shopify/products?search=${encodeURIComponent(search)}`)
        setProducts(result.data || [])
      } else {
        setProducts([])
      }
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 250)
    return () => window.clearTimeout(timer)
  }, [search])

  const sync = async (scope = 'all') => {
    try {
      await api(`/api/platform/shopify/sync?scope=${scope}`, { method: 'POST' })
      toast.success(`${scope} sync completed`)
      load()
    } catch (exception) {
      toast.error(exception instanceof Error ? exception.message : 'Sync failed')
    }
  }

  const configure = async () => {
    if (!storeDomain.trim()) return toast.error('Enter your Shopify store domain')
    setConfiguring(true)
    try {
      const result = await api<any>('/api/platform/shopify/configure', { method: 'PUT', body: JSON.stringify({ store_domain: storeDomain.trim(), access_token: accessToken.trim(), api_version: apiVersion.trim() || '2025-10', test_connection: true }) })
      setStatus(result.data || {})
      if (result.data?.api_status === 'error') toast.error(result.data.error || 'Shopify connection failed')
      else toast.success(result.data?.connected ? 'Shopify connected' : 'Shopify settings saved')
      setAccessToken('')
      load()
    } catch (exception) { toast.error(exception instanceof Error ? exception.message : 'Shopify configuration failed') } finally { setConfiguring(false) }
  }

  const exportProducts = () => {
    const rows = products.map((product) => [
      product.title,
      product.vendor || '',
      product.status || '',
      product.variants?.length || 0,
      product.variants?.[0]?.price || '',
      product.variants?.reduce((total, variant) => total + (variant.inventory_quantity || 0), 0) || 0,
    ])
    const csv = [['Product', 'Vendor', 'Status', 'Variants', 'Price', 'Inventory'], ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'shopify-products.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return <div className="space-y-7">
    <PageHeader title="Shopify Brain" description="Live commerce data for both agents: products, variants, prices, inventory, orders, customers, and sync health. No static catalog training." />
    <section className="surface-panel rounded-[24px] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><KeyRound className="h-4 w-4 text-[#d97706]" />Shopify connection</div><p className="mt-1 text-xs leading-5 text-slate-500">Connect the store here to enable live product, inventory, order, and customer tools. Access tokens are masked and never returned.</p></div><span className={`premium-badge ${status.connected ? 'live' : 'pending'}`}>{status.connected ? 'Connected' : 'Not configured'}</span></div><div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1.4fr_180px_auto]"><label><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Store domain</span><input value={storeDomain} onChange={(event) => setStoreDomain(event.target.value)} placeholder="your-store.myshopify.com" /></label><label><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Admin API token</span><input type="password" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} placeholder={status.access_token_configured ? 'Leave blank to keep current token' : 'shpat_...'} /></label><label><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">API version</span><input value={apiVersion} onChange={(event) => setApiVersion(event.target.value)} placeholder="2025-10" /></label><div className="flex items-end"><ActionButton primary onClick={configure} disabled={configuring} icon={<Save className="h-4 w-4" />}>{configuring ? 'Checking...' : 'Save & test'}</ActionButton></div></div></section>
    <Toolbar search={search} onSearch={setSearch} onRefresh={load} onExport={exportProducts}>
      <ActionButton primary onClick={() => sync()} icon={<RefreshCw className="h-4 w-4" />}>Sync now</ActionButton>
      <ActionButton onClick={() => sync('products')}>Products</ActionButton>
      <ActionButton onClick={() => sync('orders')}>Orders</ActionButton>
    </Toolbar>
    <MetricGrid items={[
      { label: 'Connection', value: status.connected ? 'Live' : 'Not configured' },
      { label: 'API status', value: status.api_status || status.mode || '—' },
      { label: 'Products fetched', value: status.products_count || products.length },
      { label: 'Store', value: status.store_domain || 'Add credentials' },
    ]} />
    <DataState loading={loading} error={error} empty={status.connected && !products.length} onRetry={load}>
      {!status.connected ? <div className="surface-panel rounded-[28px] p-8 text-center">
        <ShoppingBag className="mx-auto h-9 w-9 text-[#68d2c8]" />
        <div className="mt-4 text-lg font-bold text-slate-900">Connect Shopify in environment settings</div>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Set Shopify credentials on the backend. The UI will switch to live product, inventory, order, and customer access.</p>
      </div> : <div className="surface-panel overflow-hidden rounded-[24px]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Product</th><th>Status</th><th>Variants</th><th>Price</th><th>Inventory</th></tr></thead>
          <tbody>{products.map((product) => <tr key={product.id} className="border-b border-slate-100 text-slate-600">
            <td className="p-4"><div className="font-semibold text-slate-900">{product.title}</div><div className="text-xs text-slate-500">{product.vendor || 'No vendor'} · {product.product_type || 'Uncategorized'}</div></td>
            <td><StatusBadge value={product.status || 'unknown'} /></td>
            <td>{product.variants?.length || 0}</td>
            <td>{product.variants?.[0]?.price || '—'}</td>
            <td>{product.variants?.reduce((total, variant) => total + (variant.inventory_quantity || 0), 0) || 0}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </DataState>
  </div>
}
