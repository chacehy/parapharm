'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Package, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/Toast'
import type { Order, Profile, OrderItem, Product } from '@/lib/database.types'
import type { OrderStatus } from '@/lib/database.types'

interface OrderItemWithProduct extends OrderItem { product: Product }
interface OrderWithDetails extends Order {
  items?: OrderItemWithProduct[]
  customerName?: string
  expanded: boolean
}

const STATUS_FLOW: Record<string, OrderStatus | null> = {
  pending: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
  delivered: null,
  cancelled: null,
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Accept Order',
  accepted: 'Mark Preparing',
  preparing: 'Mark Ready',
  ready: 'Mark Delivered',
}

function DashboardOrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [pharmacyId, setPharmacyId] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('role, id').eq('id', user.id).single()
      const p = data as Profile | null
      if (!p || p.role !== 'pharmacy') { router.push('/'); return }
      setPharmacyId(p.id)

      const { data: rawOrders } = await supabase
        .from('orders').select('*').eq('pharmacy_id', p.id).order('created_at', { ascending: false })

      if (rawOrders) {
        const customerIds = [...new Set(rawOrders.map((o) => o.customer_id))]
        const { data: customers } = await supabase.from('profiles').select('id, name').in('id', customerIds)
        const custMap: Record<string, string> = {}
        customers?.forEach((c) => { custMap[c.id] = c.name })

        const mapped: OrderWithDetails[] = rawOrders.map((o) => ({
          ...o,
          customerName: custMap[o.customer_id] ?? 'Unknown',
          expanded: o.id === searchParams.get('id'),
        }))

        // Load items for auto-expanded order
        const autoExpand = mapped.find((o) => o.expanded)
        if (autoExpand) {
          const { data: items } = await supabase.from('order_items').select('*, product:products(*)').eq('order_id', autoExpand.id)
          autoExpand.items = (items as OrderItemWithProduct[]) ?? []
        }

        setOrders(mapped)
      }
      setLoading(false)
    }
    load()
  }, [])

  // Realtime order updates
  useEffect(() => {
    if (!pharmacyId) return
    const channel = supabase
      .channel(`dash-orders-${pharmacyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `pharmacy_id=eq.${pharmacyId}` }, async (payload) => {
        const newOrder = payload.new as Order
        const { data: cust } = await supabase.from('profiles').select('name').eq('id', newOrder.customer_id).single()
        setOrders((prev) => [{ ...newOrder, customerName: cust?.name ?? 'Unknown', expanded: false }, ...prev])
        toast.success(`New order from ${cust?.name ?? 'a customer'}!`)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `pharmacy_id=eq.${pharmacyId}` }, (payload) => {
        setOrders((prev) => prev.map((o) => o.id === payload.new.id ? { ...o, ...payload.new } : o))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [pharmacyId])

  const toggleExpand = async (order: OrderWithDetails) => {
    if (order.expanded) {
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, expanded: false } : o))
      return
    }
    if (!order.items) {
      const { data: items } = await supabase.from('order_items').select('*, product:products(*)').eq('order_id', order.id)
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, expanded: true, items: (items as OrderItemWithProduct[]) ?? [] } : o))
    } else {
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, expanded: true } : o))
    }
  }

  const updateStatus = async (order: OrderWithDetails, newStatus: OrderStatus) => {
    setUpdating(order.id)
    const { error } = await (supabase.from('orders') as any).update({ status: newStatus }).eq('id', order.id)
    setUpdating(null)
    if (error) { toast.error('Failed to update status'); return }
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: newStatus } : o))
    toast.success(`Order marked as ${newStatus}`)
  }

  const cancelOrder = async (order: OrderWithDetails) => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    await updateStatus(order, 'cancelled')
  }

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
    </div>
  )

  const FILTER_OPTIONS = ['all', 'pending', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled']

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/dashboard')} className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: 0 }}>
          &larr; Back to Dashboard
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Orders</h1>
          <p style={{ color: 'var(--muted)' }}>{filtered.length} order{filtered.length !== 1 ? 's' : ''} displayed</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0', border: '2px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {FILTER_OPTIONS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="btn btn-sm"
            style={{
              borderRadius: 0, border: 'none', borderRight: '1px solid var(--border)',
              background: filter === f ? 'var(--primary)' : 'transparent',
              color: filter === f ? '#fff' : 'var(--gray-700)',
              whiteSpace: 'nowrap', textTransform: 'capitalize',
            }}>
            {f} {f !== 'all' && <span style={{ opacity: 0.8 }}>({orders.filter((o) => o.status === f).length})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <p>No {filter === 'all' ? '' : filter} orders.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map((order) => {
            const nextStatus = STATUS_FLOW[order.status]
            return (
              <div key={order.id} className="card">
                {/* Order header */}
                <div
                  style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', cursor: 'pointer', borderBottom: order.expanded ? '2px solid var(--border)' : 'none' }}
                  onClick={() => toggleExpand(order)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700 }}>#{order.id.slice(0, 8).toUpperCase()}</span>
                      <span className={`badge status-${order.status}`} style={{ textTransform: 'capitalize' }}>{order.status}</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{order.total_price.toFixed(2)} DZD</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {order.customerName} · {new Date(order.created_at).toLocaleString()} · {order.delivery_address}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                    {nextStatus && (
                      <button onClick={() => updateStatus(order, nextStatus)} className="btn btn-primary btn-sm" disabled={updating === order.id}>
                        {updating === order.id ? <span className="spinner" /> : STATUS_LABELS[order.status]}
                      </button>
                    )}
                    {order.status === 'pending' && (
                      <button onClick={() => cancelOrder(order)} className="btn btn-danger btn-sm" disabled={updating === order.id}>Cancel</button>
                    )}
                    <ChevronDown size={16} color="var(--muted)" style={{ transform: order.expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                  </div>
                </div>

                {/* Order items */}
                {order.expanded && (
                  <div style={{ padding: '1.25rem 1.5rem' }}>
                    {!order.items ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--muted)' }}>
                        <span className="spinner" /> Loading items…
                      </div>
                    ) : (
                      <>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="table" style={{ marginBottom: '1rem', minWidth: '400px' }}>
                            <thead>
                            <tr>
                              <th>Product</th>
                              <th>Qty</th>
                              <th>Unit Price</th>
                              <th>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item) => (
                              <tr key={item.id}>
                                <td>{item.product?.name ?? '—'}</td>
                                <td>{item.quantity}</td>
                                <td>{item.price.toFixed(2)} DZD</td>
                                <td style={{ fontWeight: 700 }}>{(item.price * item.quantity).toFixed(2)} DZD</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                        {order.notes && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', padding: '0.75rem', background: 'var(--gray-50)', border: '2px solid var(--border)' }}>
                            <strong>Notes:</strong> {order.notes}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function DashboardOrdersPage() {
  return <Suspense><DashboardOrdersContent /></Suspense>
}
