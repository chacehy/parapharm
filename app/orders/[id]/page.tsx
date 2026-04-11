'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Package, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Order, OrderItem, Product, Profile } from '@/lib/database.types'

interface OrderItemWithProduct extends OrderItem { product: Product }

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItemWithProduct[]>([])
  const [pharmacy, setPharmacy] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: o } = await supabase.from('orders').select('*').eq('id', id).single()
      if (!o || (o.customer_id !== user.id && o.pharmacy_id !== user.id)) { router.push('/orders'); return }
      setOrder(o)

      const [{ data: oi }, { data: ph }] = await Promise.all([
        supabase.from('order_items').select('*, product:products(*)').eq('order_id', id),
        supabase.from('profiles').select('*').eq('id', o.pharmacy_id).single(),
      ])

      setItems((oi as OrderItemWithProduct[]) ?? [])
      setPharmacy(ph)
      setLoading(false)
    }
    load()
  }, [id])

  // Live status updates
  useEffect(() => {
    if (!order) return
    const channel = supabase
      .channel(`order-detail-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload) => {
        setOrder((prev) => prev ? { ...prev, ...payload.new } : null)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, order])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
    </div>
  )

  if (!order) return null

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '780px' }}>
      <Link href="/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        <ChevronLeft size={14} /> My Orders
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Order #{order.id.slice(0, 8).toUpperCase()}</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <span className={`badge status-${order.status}`} style={{ fontSize: '0.875rem', padding: '0.375rem 0.875rem', textTransform: 'capitalize' }}>{order.status}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Items */}
        <div className="card">
          <div style={{ padding: '1rem 1.25rem', borderBottom: '2px solid var(--border)' }}>
            <h3 style={{ margin: 0 }}>Items from {pharmacy?.name}</h3>
          </div>
          {items.map((item) => (
            <div key={item.id} style={{ display: 'flex', gap: '1rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              {item.product?.image_url ? (
                <img src={item.product.image_url} alt={item.product.name} style={{ width: '56px', height: '56px', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '56px', height: '56px', background: 'var(--green-50)', border: '2px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={18} color="var(--green-300)" />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.product?.name}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{item.price.toFixed(2)} DZD × {item.quantity}</p>
              </div>
              <p style={{ fontWeight: 700 }}>{(item.price * item.quantity).toFixed(2)} DZD</p>
            </div>
          ))}
          <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Total:</span>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)' }}>{order.total_price.toFixed(2)} DZD</span>
          </div>
        </div>

        {/* Delivery info */}
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <h4 style={{ marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={16} color="var(--primary)" /> Delivery Details
          </h4>
          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Address:</strong> {order.delivery_address}</p>
          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Payment:</strong> Cash on Delivery (COD)</p>
          {order.notes && <p style={{ fontSize: '0.875rem' }}><strong>Notes:</strong> {order.notes}</p>}
        </div>
      </div>
    </div>
  )
}
