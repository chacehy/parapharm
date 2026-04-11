'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Package, Clock, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Order } from '@/lib/database.types'

const STATUS_STEPS = ['pending', 'accepted', 'preparing', 'ready', 'delivered']

function statusClass(status: string) {
  return `badge status-${status}`
}

function OrderCard({ order, pharmacyName }: { order: Order; pharmacyName: string }) {
  const stepIndex = STATUS_STEPS.indexOf(order.status)
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
            Order #{order.id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleDateString()}
          </p>
          <h4>{pharmacyName}</h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className={statusClass(order.status)} style={{ textTransform: 'capitalize' }}>{order.status}</span>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{order.total_price.toFixed(2)} DZD</span>
        </div>
      </div>

      {/* Progress bar */}
      {!isCancelled && (
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {STATUS_STEPS.map((step, idx) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', flex: idx < STATUS_STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700,
                  background: idx <= stepIndex ? 'var(--primary)' : 'var(--gray-200)',
                  color: idx <= stepIndex ? '#fff' : 'var(--gray-400)',
                  border: '2px solid ' + (idx <= stepIndex ? 'var(--primary)' : 'var(--gray-200)'),
                }}>
                  {idx < stepIndex ? '✓' : idx + 1}
                </div>
                {idx < STATUS_STEPS.length - 1 && (
                  <div style={{ flex: 1, height: '2px', background: idx < stepIndex ? 'var(--primary)' : 'var(--gray-200)' }} />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            {STATUS_STEPS.map((step) => (
              <span key={step} style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'capitalize' }}>{step}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '0.875rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Clock size={12} /> {new Date(order.updated_at).toLocaleString()}
        </p>
        <Link href={`/orders/${order.id}`} className="btn btn-ghost btn-sm">
          Details <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  )
}

function OrdersContent() {
  const searchParams = useSearchParams()
  const newOrderId = searchParams.get('new')
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [pharmacyNames, setPharmacyNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const loadOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      setOrders(data)
      const ids = [...new Set(data.map((o) => o.pharmacy_id))]
      if (ids.length > 0) {
        const { data: pharmacies } = await supabase.from('profiles').select('id, name').in('id', ids)
        if (pharmacies) {
          const map: Record<string, string> = {}
          pharmacies.forEach((p) => { map[p.id] = p.name })
          setPharmacyNames(map)
        }
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadOrders()
  }, [])

  // Realtime: update order status live via Supabase Broadcast
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const channel = supabase
        .channel(`orders-customer-${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`,
        }, (payload) => {
          setOrders((prev) => prev.map((o) => o.id === payload.new.id ? { ...o, ...payload.new } : o))
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    })
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
      <span style={{ color: 'var(--muted)' }}>Loading orders…</span>
    </div>
  )

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>My Orders</h1>
        <Link href="/search" className="btn btn-primary btn-sm">+ New Order</Link>
      </div>

      {newOrderId && (
        <div style={{ padding: '1rem 1.25rem', background: 'var(--green-50)', border: '2px solid var(--green-300)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🎉</span>
          <div>
            <p style={{ fontWeight: 700, color: 'var(--green-800)' }}>Order placed successfully!</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--green-700)' }}>Order #{newOrderId.slice(0, 8).toUpperCase()} — you will be notified when the pharmacy accepts.</p>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="empty-state">
          <Package size={56} />
          <h3>No orders yet</h3>
          <p>Browse nearby pharmacies and start ordering.</p>
          <Link href="/search" className="btn btn-primary">Find Products</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} pharmacyName={pharmacyNames[order.pharmacy_id] ?? 'Pharmacy'} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  return <Suspense><OrdersContent /></Suspense>
}
