'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, Boxes, HeartPulse, RefreshCw, ChevronDown, FileText, Info, MessageSquareText, Package, Search, Settings2, ShoppingBag, Sparkles, Truck, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { Loader, api, Spinner } from '@/components/PlatformUI'
import { Avatar, EmptyHint, Stat } from '@/components/premium'

type Overview = { name?: string; currencyCode?: string; myshopifyDomain?: string; primaryDomain?: { url?: string }; products?: number | null; orders?: number | null; customers?: number | null }
type Product = { id: string; title: string; status?: string; product_type?: string; vendor?: string; url?: string; inventory?: number | null; options?: number | null; image?: string; currency?: string; min_price?: string; max_price?: string }
type Order = { name: string; created_at?: string; cancelled?: boolean; financial_status?: string; fulfillment_status?: string; total?: string; items: string[]; tracking: { company?: string; number?: string; url?: string }[]; status?: string; unshipped?: string[]; refunds?: { at?: string; amount?: string; currency?: string }[] }
type Customer = { id: string; name?: string; email?: string | null; phone?: string | null; orders: number; spent?: string; currency?: string; since?: string; place?: string }
type Policy = { type?: string; title?: string; text?: string }
type Tab = 'products' | 'orders' | 'customers' | 'policies' | 'health' | 'ask'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'products', label: 'Products', icon: Package },
  { id: 'orders', label: 'Orders', icon: Truck },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'policies', label: 'Policies', icon: FileText },
  { id: 'health', label: 'Catalogue health', icon: HeartPulse },
  { id: 'ask', label: 'Test a question', icon: MessageSquareText },
]
const ORDER_FILTERS = [
  { id: 'all', label: 'All', test: (_: Order) => true },
  { id: 'unfulfilled', label: 'To ship', test: (order: Order) => !order.cancelled && order.fulfillment_status === 'unfulfilled' && order.financial_status === 'paid' },
  { id: 'moving', label: 'On the way', test: (order: Order) => /^(On the way|Out for delivery|Shipped)/.test(order.status || '') && !(order.financial_status || '').includes('refund') },
  { id: 'delivered', label: 'Delivered', test: (order: Order) => (order.status || '').startsWith('Delivered') },
  { id: 'refunded', label: 'Refunded', test: (order: Order) => (order.financial_status || '').includes('refund') },
  { id: 'cancelled', label: 'Cancelled', test: (order: Order) => Boolean(order.cancelled) },
]

/** Browser-console trace; filter by "[store]". */
const log = (message: string, ...details: unknown[]) => console.info(`[store] ${message}`, ...details)
const money = (amount?: string | number | null, currency = 'AUD') => amount === undefined || amount === null || amount === '' ? '—' : Number(amount).toLocaleString([], { style: 'currency', currency })
/** Order totals arrive as "498.7 AUD". */
const orderTotal = (total?: string) => { const [amount, currency] = (total || '').split(' '); return amount ? money(amount, currency || 'AUD') : '—' }
const shortDate = (value?: string) => value ? new Date(value).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : ''
const count = (value?: number | null) => value === null || value === undefined ? '—' : value.toLocaleString()

/** Everything the AI can read from the connected Shopify store, live: products, orders, customers, policies, and a
    caller-question test that runs the same lookup as a call. Read-only; nothing is copied. */
export default function StoreDataPage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [problem, setProblem] = useState('')
  const [tab, setTab] = useState<Tab>('products')

  useEffect(() => {
    api<{ data: Overview }>('/api/platform/shopify/overview').then((result) => { setOverview(result.data); log('overview', result.data) })
      .catch((error) => { log('overview failed', error); setProblem(error instanceof Error ? error.message : 'The store did not answer') })
  }, [])

  const currency = overview?.currencyCode || 'AUD'
  return <div className="space-y-5">
    <PageHeader title="Store data" icon={ShoppingBag}
      description={overview?.name ? `Live from ${overview.name} on Shopify, exactly what the AI can read on a call. Read-only: nothing is copied or changed.` : 'Live from your Shopify store, exactly what the AI can read on a call.'}
      actions={<div className="flex flex-wrap gap-2">
        <Link href="/integrations/shopify" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E9DFFF] bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:border-[#6C3BFF]"><Settings2 className="h-4 w-4" />Connection & AI switches</Link>
        {overview?.myshopifyDomain && <a href={`https://${overview.myshopifyDomain}/admin`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6C3BFF] px-3.5 text-sm font-semibold text-white shadow-[0_12px_24px_-14px_rgba(108,59,255,.9)] transition hover:bg-[#5A2BE6]">Shopify admin<ArrowUpRight className="h-4 w-4" /></a>}
      </div>} />

    {problem ? <div className="rounded-2xl border border-[#E9DFFF] bg-white p-8 text-center"><p className="text-sm text-slate-600">{problem}</p><Link href="/integrations/shopify" className="mt-4 inline-flex rounded-lg bg-[#6C3BFF] px-4 py-2 text-sm font-semibold text-white">Check the connection</Link></div> : <>
      {!overview ? <Loader variant="cards" label="Loading store overview" />
        : <div className="keep-cols grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Stat icon={Package} label="Products" value={count(overview.products)} hint="in the catalogue" />
          <Stat icon={Truck} label="Orders" value={count(overview.orders)} hint="last 60 days (Shopify's limit)" />
          <Stat icon={Users} label="Customers" value={count(overview.customers)} hint="with an account" />
          <Stat icon={Boxes} label="Currency" value={currency} hint={overview.primaryDomain?.url?.replace(/^https?:\/\//, '') || overview.myshopifyDomain} />
        </div>}

      <div className="flex items-start gap-3 rounded-2xl border border-[#E9DFFF] bg-gradient-to-r from-[#F8F5FF] to-white px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#8B5CF6]" />
        <p className="text-[13px] leading-5 text-slate-600"><span className="font-semibold text-slate-800">How callers get order details: </span>the AI shares an order only after the caller says the email on that order (or calls from the phone number on it). Shopify gives the app orders from the last 60 days.</p>
      </div>

      <section className="surface-panel overflow-hidden rounded-2xl">
        <div role="tablist" aria-label="Store data" className="flex gap-1 overflow-x-auto border-b border-[#F1EBFF] px-3 pt-3">
          {TABS.map((item) => { const active = tab === item.id; return <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => { setTab(item.id); log(`tab ${item.id}`) }}
            className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition ${active ? 'border-[#6C3BFF] text-[#5A2BE6]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><item.icon className="h-4 w-4" />{item.label}</button> })}
        </div>
        <div className="p-4 sm:p-5">
          {tab === 'products' && <Products currency={currency} total={overview?.products} />}
          {tab === 'orders' && <Orders total={overview?.orders} />}
          {tab === 'customers' && <Customers currency={currency} total={overview?.customers} />}
          {tab === 'policies' && <Policies />}
          {tab === 'health' && <CatalogueHealth />}
          {tab === 'ask' && <AskLikeACaller />}
        </div>
      </section>
    </>}
  </div>
}

function SearchBar({ value, onChange, onSubmit, placeholder, busy }: { value: string; onChange: (value: string) => void; onSubmit: () => void; placeholder: string; busy: boolean }) {
  return <form onSubmit={(event: FormEvent) => { event.preventDefault(); onSubmit() }} className="flex gap-2">
    <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-10 w-full rounded-xl border border-[#E9DFFF] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#6C3BFF]" /></div>
    <button type="submit" disabled={busy} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#6C3BFF] px-4 text-sm font-semibold text-white transition hover:bg-[#5A2BE6] disabled:opacity-60">{busy && <Spinner />}Search</button>
  </form>
}

function Failure({ text }: { text: string }) { return <p className="mt-4 rounded-xl bg-[#F8F5FF] px-4 py-3 text-sm text-[#5A2BE6]">{text}</p> }

/** Product cards with image, price range and stock; "Load more" pages through the whole catalogue. */
function Products({ currency, total }: { currency: string; total?: number | null }) {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState('')
  const [rows, setRows] = useState<Product[] | null>(null)
  const [next, setNext] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async (search: string, after = '') => {
    setBusy(true); setError('')
    try {
      const result = await api<{ data: { products: Product[]; next: string | null } }>(`/api/platform/shopify/catalog?search=${encodeURIComponent(search)}&after=${encodeURIComponent(after)}`)
      setRows((current) => after ? [...(current || []), ...result.data.products] : result.data.products); setNext(result.data.next); setSearched(search)
      log(`products ${search ? `"${search}"` : 'newest'}: ${result.data.products.length}${after ? ' more' : ''}`)
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Could not load products') }
    finally { setBusy(false) }
  }, [])
  useEffect(() => { load('') }, [load])
  const price = (product: Product) => product.min_price === product.max_price ? money(product.min_price, product.currency || currency) : `${money(product.min_price, product.currency || currency)} – ${money(product.max_price, product.currency || currency)}`

  return <div>
    <SearchBar value={query} onChange={setQuery} onSubmit={() => load(query.trim())} placeholder="Search products, e.g. basin mixer" busy={busy && !rows?.length} />
    {rows && rows.length > 0 && <p className="mt-3 text-xs text-slate-500">Showing {rows.length.toLocaleString()}{searched ? ` matching "${searched}"` : total ? ` of ${total.toLocaleString()} products` : ''}{searched ? '' : ', most recently updated first'}</p>}
    {error && <Failure text={error} />}
    {!rows ? <Loader variant="cards" count={8} label="Loading products" className="mt-4" />
      : rows.length ? <>
        <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{rows.map((product) => <li key={product.id} className="group flex flex-col overflow-hidden rounded-2xl border border-[#E9DFFF] bg-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-26px_rgba(70,35,117,.6)]">
          <div className="relative aspect-[4/3] bg-[#F8F5FF]">
            {product.image ? <img src={product.image} alt="" loading="lazy" className="h-full w-full object-contain p-3" /> : <Package className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[#D8C8FF]" />}
            {product.status && product.status !== 'active' && <span className="absolute left-2 top-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500 ring-1 ring-[#E9DFFF]">{product.status}</span>}
          </div>
          <div className="flex flex-1 flex-col p-3">
            <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-900" title={product.title}>{product.title}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{[product.product_type, product.options && product.options > 1 ? `${product.options} options` : ''].filter(Boolean).join(' · ') || ' '}</p>
            <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
              <span className="text-sm font-extrabold text-[#32136B]">{price(product)}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${product.inventory === null || product.inventory === undefined ? 'bg-slate-100 text-slate-500' : product.inventory > 0 ? 'bg-[#F1EBFF] text-[#5A2BE6]' : 'bg-[#6C3BFF] text-white'}`}>{product.inventory === null || product.inventory === undefined ? 'Not tracked' : product.inventory > 0 ? `${product.inventory.toLocaleString()} in stock` : 'Sold out'}</span>
            </div>
            {product.url && <a href={product.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#6C3BFF] hover:underline">View on website<ArrowUpRight className="h-3 w-3" /></a>}
          </div>
        </li>)}</ul>
        {next && <div className="mt-4 text-center"><button type="button" onClick={() => load(searched, next)} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D8C8FF] bg-white px-5 text-sm font-semibold text-[#5A2BE6] transition hover:border-[#6C3BFF] disabled:opacity-60">{busy ? <Spinner /> : <ChevronDown className="h-4 w-4" />}Load more products</button></div>}
      </> : <div className="mt-4"><EmptyHint text={query ? `No products match "${query}".` : 'No products in the store.'} /></div>}
  </div>
}

/** Recent orders with status badges; filter by status or look one up by number. */
function Orders({ total }: { total?: number | null }) {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState('')
  const [rows, setRows] = useState<Order[] | null>(null)
  const [next, setNext] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async (search: string, after = '') => {
    setBusy(true); setError('')
    try {
      const result = await api<{ data: { orders: Order[]; next: string | null } }>(`/api/platform/shopify/order-list?search=${encodeURIComponent(search)}&after=${encodeURIComponent(after)}`)
      setRows((current) => after ? [...(current || []), ...result.data.orders] : result.data.orders); setNext(result.data.next); setSearched(search)
      log(`orders ${search ? `"${search}"` : 'newest'}: ${result.data.orders.length}${after ? ' more' : ''}`)
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Could not load orders') }
    finally { setBusy(false) }
  }, [])
  useEffect(() => { load('') }, [load])
  const shown = (rows || []).filter(ORDER_FILTERS.find((item) => item.id === filter)!.test)

  return <div>
    <SearchBar value={query} onChange={setQuery} onSubmit={() => load(query.trim())} placeholder="Order number, e.g. DFO001114 or 1114" busy={busy && !rows?.length} />
    {rows && rows.length > 0 && <p className="mt-3 text-xs text-slate-500">Showing {rows.length.toLocaleString()}{searched ? ` matching "${searched}"` : total ? ` of ${total.toLocaleString()} orders` : ''}{searched ? '' : ', newest first'}{next ? ' · the status filters count the orders loaded so far' : ''}</p>}
    {rows && rows.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{ORDER_FILTERS.map((item) => { const total = rows.filter(item.test).length; const active = filter === item.id; if (!total && !active && item.id !== 'all') return null; return <button key={item.id} type="button" onClick={() => setFilter(item.id)}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${active ? 'bg-[#6C3BFF] text-white' : 'bg-[#F1EBFF] text-slate-600 hover:bg-[#E9DFFF]'}`}>{item.label}<span className={active ? 'text-white/70' : 'text-slate-400'}>{total}</span></button> })}</div>}
    {error && <Failure text={error} />}
    {!rows ? <Loader variant="rows" label="Loading orders" className="mt-4" />
      : shown.length ? <ul className="mt-4 divide-y divide-[#F1EBFF] overflow-hidden rounded-2xl border border-[#E9DFFF]">{shown.map((order) => <li key={order.name} className="grid gap-2 bg-white px-4 py-3.5 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
        <div><div className="text-sm font-bold text-slate-900">{order.name}</div><div className="text-[11px] text-slate-500">{shortDate(order.created_at)}</div></div>
        <div className="min-w-0">
          <p className="truncate text-[13px] text-slate-700" title={order.items.join(', ')}>{order.items.join(', ') || 'No items'}</p>
          {order.tracking.length > 0 && <p className="mt-0.5 truncate text-[11px] text-slate-500"><Truck className="mr-1 inline h-3 w-3" />{order.tracking.map((item) => [item.company, item.number].filter(Boolean).join(' ')).join(', ')}</p>}
          {order.unshipped && order.unshipped.length > 0 && <p className="mt-0.5 truncate text-[11px] text-slate-500">Still to ship: {order.unshipped.join(', ')}</p>}
          {order.refunds && order.refunds.length > 0 && <p className="mt-0.5 truncate text-[11px] text-slate-500">Refunded {order.refunds.map((refund) => `${money(refund.amount, refund.currency || 'AUD')} on ${shortDate(refund.at)}`).join(', ')}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          {order.status ? <span title="What the customer is told" className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${/^(Not shipped|Out for delivery|Delivery was attempted)/.test(order.status) ? 'bg-[#6C3BFF] text-white' : 'bg-[#F1EBFF] text-[#5A2BE6]'}`}>{order.status}</span>
            : order.cancelled ? <Badge strong>Cancelled</Badge> : <><Badge>{order.financial_status || 'unknown'}</Badge><Badge>{order.fulfillment_status || ''}</Badge></>}
          <span className="ml-1 min-w-[80px] text-right text-sm font-extrabold text-[#32136B]">{orderTotal(order.total)}</span>
        </div>
      </li>)}</ul>
      : <div className="mt-4"><EmptyHint text={searched ? `No order ${searched} in the last 60 days.` : filter !== 'all' ? 'No loaded orders with this status.' : 'No orders in the last 60 days.'} /></div>}
    {rows && next && <div className="mt-4 text-center"><button type="button" onClick={() => load(searched, next)} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D8C8FF] bg-white px-5 text-sm font-semibold text-[#5A2BE6] transition hover:border-[#6C3BFF] disabled:opacity-60">{busy ? <Spinner /> : <ChevronDown className="h-4 w-4" />}Load more orders</button></div>}
  </div>
}

function Badge({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${strong ? 'bg-[#6C3BFF] text-white' : 'bg-[#F1EBFF] text-[#5A2BE6]'}`}>{children}</span>
}

/** Customers, most recently active first. Email and phone show only if Shopify shares them with the app. */
function Customers({ currency, total }: { currency: string; total?: number | null }) {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState('')
  const [rows, setRows] = useState<Customer[] | null>(null)
  const [next, setNext] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async (search: string, after = '') => {
    setBusy(true); setError('')
    try {
      const result = await api<{ data: { customers: Customer[]; next: string | null } }>(`/api/platform/shopify/customers?search=${encodeURIComponent(search)}&after=${encodeURIComponent(after)}`)
      setRows((current) => after ? [...(current || []), ...result.data.customers] : result.data.customers); setNext(result.data.next); setSearched(search)
      log(`customers ${search ? `"${search}"` : 'recent'}: ${result.data.customers.length}${after ? ' more' : ''}`)
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Could not load customers') }
    finally { setBusy(false) }
  }, [])
  useEffect(() => { load('') }, [load])

  return <div>
    <SearchBar value={query} onChange={setQuery} onSubmit={() => load(query.trim())} placeholder="Search by name, email or phone" busy={busy && !rows?.length} />
    {rows && rows.length > 0 && <p className="mt-3 text-xs text-slate-500">Showing {rows.length.toLocaleString()}{searched ? ` matching "${searched}"` : total ? ` of ${total.toLocaleString()} customers` : ''}, most recently active first</p>}
    {error && <Failure text={error} />}
    {!rows ? <Loader variant="rows" count={5} label="Loading customers" className="mt-4" />
      : rows.length ? <ul className="mt-4 divide-y divide-[#F1EBFF] overflow-hidden rounded-2xl border border-[#E9DFFF]">{rows.map((customer) => <li key={customer.id} className="flex items-center gap-3 bg-white px-4 py-3">
        <Avatar name={customer.name || '?'} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">{customer.name || 'No name'}</div>
          <div className="truncate text-[11px] text-slate-500">{[customer.email, customer.phone, customer.place].filter(Boolean).join(' · ') || 'No contact details shared'}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-bold text-[#32136B]">{money(customer.spent, customer.currency || currency)}</div>
          <div className="text-[11px] text-slate-500">{customer.orders} order{customer.orders === 1 ? '' : 's'}{customer.since ? ` · since ${shortDate(customer.since)}` : ''}</div>
        </div>
      </li>)}</ul>
      : <div className="mt-4"><EmptyHint text={searched ? `No customer matches "${searched}".` : 'No customers yet.'} /></div>}
    {rows && next && <div className="mt-4 text-center"><button type="button" onClick={() => load(searched, next)} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D8C8FF] bg-white px-5 text-sm font-semibold text-[#5A2BE6] transition hover:border-[#6C3BFF] disabled:opacity-60">{busy ? <Spinner /> : <ChevronDown className="h-4 w-4" />}Load more customers</button></div>}
  </div>
}

type Health = { checked: number; with_issues: number; counts: Record<string, number>; labels: Record<string, string>; checked_at: string; products: { id: string; title: string; issues: string[]; price?: string; edit_url: string }[] }

/** What each problem does to a caller's answer, so the team knows what to fix first. */
const HEALTH_EFFECT: Record<string, string> = {
  zero_price: 'The AI says the price isn\'t listed and offers a quote, so callers can\'t get a price.',
  no_measurements: 'The AI can\'t answer "what size is it?".',
  other_product_text: 'The description is for another product, so the AI won\'t describe its features or warranty.',
  size_conflict: 'The title and the description give different sizes, so callers may hear either one.',
  no_description: 'The AI can only give the name and price.',
  no_image: 'Doesn\'t affect calls, but customers on the website see no picture.',
  no_type: 'Harder for the AI to find it when a caller describes it.',
  sold_out: 'The AI tells callers it\'s sold out.',
}

/** Every active product checked for what makes the AI's answers weak or wrong, each with a link to fix it in Shopify. */
function CatalogueHealth() {
  const [data, setData] = useState<Health | null>(null)
  const [filter, setFilter] = useState('')
  const [shown, setShown] = useState(30)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async (refresh = false) => {
    setBusy(true); setError('')
    try { const result = await api<{ data: Health }>(`/api/platform/shopify/health${refresh ? '?refresh=true' : ''}`); setData(result.data); log(`catalogue health: ${result.data.with_issues} of ${result.data.checked} need attention`) }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'Could not check the catalogue') }
    finally { setBusy(false) }
  }, [])
  useEffect(() => { load() }, [load])
  if (error) return <Failure text={error} />
  if (!data) return <div className="space-y-2"><p className="text-sm text-slate-500">Checking every product… this takes a few seconds.</p><Loader variant="rows" label="Checking every product" /></div>
  const rows = data.products.filter((row) => !filter || row.issues.includes(filter))
  const keys = Object.keys(data.labels).filter((key) => data.counts[key])

  return <div>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{data.with_issues.toLocaleString()} of {data.checked.toLocaleString()} active products need attention</p>
        <p className="mt-0.5 text-xs text-slate-500">Fixing these in Shopify makes the AI's answers on calls complete. Changes show up on the next call: nothing to sync.</p>
      </div>
      <button type="button" onClick={() => load(true)} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#D8C8FF] bg-white px-3.5 text-sm font-semibold text-[#5A2BE6] transition hover:border-[#6C3BFF] disabled:opacity-60">{busy ? <Spinner /> : <RefreshCw className="h-4 w-4" />}Check again</button>
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{keys.map((key) => { const active = filter === key; return <button key={key} type="button" onClick={() => { setFilter(active ? '' : key); setShown(30) }} aria-pressed={active}
      className={`rounded-xl border p-3 text-left transition ${active ? 'border-[#6C3BFF] bg-[#F1EBFF]' : 'border-[#E9DFFF] bg-white hover:border-[#D8C8FF]'}`}>
      <div className="flex items-baseline justify-between gap-2"><span className="text-sm font-semibold text-slate-900">{data.labels[key]}</span><span className="text-lg font-extrabold tabular-nums text-[#32136B]">{data.counts[key]}</span></div>
      <p className="mt-0.5 text-[12px] leading-[18px] text-slate-500">{HEALTH_EFFECT[key]}</p>
    </button> })}</div>
    {rows.length ? <ul className="mt-4 divide-y divide-[#F1EBFF] overflow-hidden rounded-2xl border border-[#E9DFFF]">{rows.slice(0, shown).map((row) => <li key={row.id} className="flex flex-wrap items-center gap-3 bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900">{row.title}</div>
        <div className="mt-1 flex flex-wrap gap-1">{row.issues.map((issue) => <span key={issue} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${issue === 'zero_price' || issue === 'other_product_text' ? 'bg-[#6C3BFF] text-white' : 'bg-[#F1EBFF] text-[#5A2BE6]'}`}>{data.labels[issue]}</span>)}</div>
      </div>
      <a href={row.edit_url} target="_blank" rel="noreferrer" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#D8C8FF] px-3 text-xs font-semibold text-[#5A2BE6] transition hover:border-[#6C3BFF]">Edit in Shopify<ArrowUpRight className="h-3.5 w-3.5" /></a>
    </li>)}</ul> : <div className="mt-4"><EmptyHint text="Nothing to fix here." /></div>}
    {rows.length > shown && <div className="mt-4 text-center"><button type="button" onClick={() => setShown(shown + 30)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D8C8FF] bg-white px-5 text-sm font-semibold text-[#5A2BE6] transition hover:border-[#6C3BFF]"><ChevronDown className="h-4 w-4" />Show more ({rows.length - shown} left)</button></div>}
  </div>
}

/** The store's policies, as the AI reads them. */
function Policies() {
  const [rows, setRows] = useState<Policy[] | null>(null)
  const [open, setOpen] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { api<{ data: Policy[] }>('/api/platform/shopify/policies').then((result) => setRows(result.data || [])).catch((exception) => setError(exception instanceof Error ? exception.message : 'Could not load policies')) }, [])
  if (error) return <Failure text={error} />
  if (!rows) return <Loader variant="rows" label="Loading store policies" />
  if (!rows.length) return <EmptyHint text="No policies saved in Shopify (Settings → Policies)." />
  return <ul className="space-y-2">{rows.map((policy) => { const id = policy.type || policy.title || ''; const expanded = open === id; return <li key={id} className="overflow-hidden rounded-2xl border border-[#E9DFFF] bg-white">
    <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? '' : id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#F8F5FF]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F1EBFF] text-[#6C3BFF]"><FileText className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{policy.title}</span><span className="block truncate text-[12px] text-slate-500">{(policy.text || '').slice(0, 140)}</span></span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${expanded ? 'rotate-180' : ''}`} />
    </button>
    {expanded && <p className="whitespace-pre-line border-t border-[#F1EBFF] px-4 py-3 text-[13px] leading-6 text-slate-600">{policy.text || 'Empty.'}</p>}
  </li> })}</ul>
}

/** Type what a caller might say: shows exactly what the AI would get from the store (the same lookup as a call). */
function AskLikeACaller() {
  const [question, setQuestion] = useState('')
  const [phone, setPhone] = useState('')
  const [answer, setAnswer] = useState<{ tool?: string | null; context?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ideas, setIdeas] = useState<string[]>([])
  // Example questions from the real store (its newest product and order), so they work as written.
  useEffect(() => {
    Promise.allSettled([api<{ data: { products: Product[] } }>('/api/platform/shopify/catalog'), api<{ data: Order[] }>('/api/platform/shopify/orders?limit=1')]).then(([products, orders]) => {
      const product = products.status === 'fulfilled' ? products.value.data.products[0]?.title : ''
      const order = orders.status === 'fulfilled' ? orders.value.data[0]?.name : ''
      setIdeas([product && `Do you have the ${product} in stock?`, product && `How much is the ${product}?`, order && `Where is my order ${order}?`, 'What is your refund policy?'].filter(Boolean) as string[])
    })
  }, [])
  const ask = async (text = question) => {
    if (!text.trim()) return
    setQuestion(text); setBusy(true); setError('')
    try { const result = await api<{ data: { tool?: string | null; context?: string } }>('/api/platform/shopify/ask', { method: 'POST', body: JSON.stringify({ question: text, phone }) }); setAnswer(result.data); log(`asked "${text}" -> ${result.data.tool || 'no lookup'}`) }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'The test failed') }
    finally { setBusy(false) }
  }
  const looked = { get_order: 'Order lookup', caller_orders: "Caller's own orders", get_store_policy: 'Store policy', search_shopify_products: 'Product search', shopify_error: 'Lookup failed' } as Record<string, string>

  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
    <div>
      <form onSubmit={(event) => { event.preventDefault(); ask() }} className="space-y-2">
        <label className="block"><span className="field-label">What the caller says</span><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} placeholder="e.g. Is the Lydia basin mixer in stock?" className="w-full rounded-xl border border-[#E9DFFF] px-3 py-2 text-sm outline-none focus:border-[#6C3BFF]" /></label>
        <label className="block"><span className="field-label">Caller's phone number (optional)</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+61 4…" /></label>
        <button type="submit" disabled={busy || !question.trim()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6C3BFF] px-4 text-sm font-semibold text-white transition hover:bg-[#5A2BE6] disabled:opacity-60">{busy ? <Spinner /> : <Sparkles className="h-4 w-4" />}Ask the store</button>
      </form>
      {ideas.length > 0 && <div className="mt-4"><div className="text-[11px] font-bold uppercase tracking-[.1em] text-slate-500">Try</div><div className="mt-2 flex flex-wrap gap-1.5">{ideas.map((idea) => <button key={idea} type="button" onClick={() => ask(idea)} className="rounded-full border border-[#E9DFFF] bg-white px-3 py-1.5 text-left text-xs text-slate-600 transition hover:border-[#6C3BFF] hover:text-[#5A2BE6]">{idea}</button>)}</div></div>}
    </div>
    <div className="min-h-[180px] rounded-2xl border border-[#E9DFFF] bg-gradient-to-br from-[#F8F5FF] to-white p-4">
      {error ? <p className="text-sm text-[#5A2BE6]">{error}</p>
        : !answer ? <p className="text-sm text-slate-500">The answer shows what the AI would be told by the store for this question. On a call, it then says it in its own words.</p>
        : <>
          <div className="flex items-center gap-2"><span className="rounded-full bg-[#6C3BFF] px-2.5 py-0.5 text-[11px] font-bold text-white">{answer.tool ? looked[answer.tool] || answer.tool : 'No store lookup'}</span></div>
          <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-[13px] leading-6 text-slate-700">{answer.context || 'This question needs no store data (or its switch is off), so the AI answers it from the knowledge base.'}</pre>
        </>}
    </div>
  </div>
}
