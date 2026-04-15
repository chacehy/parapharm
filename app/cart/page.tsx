'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Trash2, Plus, Minus, MapPin } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/Toast'

export default function CartPage() {
  const router = useRouter()
  const supabase = createClient()
  const { items, removeItem, updateQuantity, clearCart, total } = useCartStore()
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const getLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false) },
      () => { setLocating(false); toast.error('Could not get location') },
      { enableHighAccuracy: true }
    )
  }

  const placeOrder = async () => {
    if (!address.trim()) { toast.error('Please enter a delivery address'); return }
    if (items.length === 0) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    setLoading(true)
    const pharmacyId = items[0].pharmacyId

    const orderPayload: Record<string, unknown> = {
      customer_id: user.id,
      pharmacy_id: pharmacyId,
      delivery_address: address,
      notes: notes || null,
      total_price: total(),
      payment_method: 'COD',
    }

    if (coords) {
      orderPayload.delivery_location = `SRID=4326;POINT(${coords.lng} ${coords.lat})`
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderPayload as any)
      .select('id')
      .single()

    if (orderError || !order) {
      setLoading(false)
      toast.error('Failed to place order. Please try again.')
      return
    }

    const orderItems = items.map((i) => ({
      order_id: order.id,
      product_id: i.product.id,
      quantity: i.quantity,
      price: i.product.price,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

    if (itemsError) {
      // Rollback order
      await supabase.from('orders').delete().eq('id', order.id)
      setLoading(false)
      toast.error('Failed to save order items. Please try again.')
      return
    }

    clearCart()
    setLoading(false)
    toast.success('Order placed successfully!')
    router.push(`/orders?new=${order.id}`)
  }

  if (items.length === 0) return (
    <div className="empty-state" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <ShoppingCart size={56} />
      <h2>Your cart is empty</h2>
      <p>Browse nearby pharmacies and add products to your cart.</p>
      <Link href="/search" className="btn btn-primary btn-lg">Find Products</Link>
    </div>
  )

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>Your Cart</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        {/* Items */}
        <div className="card">
          <div style={{ padding: '1rem 1.5rem', borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>
              {items[0].pharmacyName}
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--muted)', marginLeft: '0.5rem' }}>({items.length} item{items.length !== 1 ? 's' : ''})</span>
            </h3>
            <button onClick={() => clearCart()} className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }}>
              <Trash2 size={14} /> Clear
            </button>
          </div>

          {items.map((item) => (
            <div key={item.product.id} style={{ display: 'flex', gap: '1rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              {item.product.image_url ? (
                <img src={item.product.image_url} alt={item.product.name} style={{ width: '72px', height: '72px', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '72px', height: '72px', background: 'var(--green-50)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShoppingCart size={20} color="var(--green-300)" />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{item.product.name}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 700 }}>{item.product.price.toFixed(2)} DZD × {item.quantity}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0', border: '2px solid var(--border)' }}>
                <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="btn btn-ghost btn-sm" style={{ border: 'none', padding: '0.375rem 0.625rem' }}>
                  <Minus size={14} />
                </button>
                <span style={{ padding: '0 0.75rem', fontWeight: 700, minWidth: '2rem', textAlign: 'center' }}>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="btn btn-ghost btn-sm" style={{ border: 'none', padding: '0.375rem 0.625rem' }}
                  disabled={item.quantity >= item.product.stock}>
                  <Plus size={14} />
                </button>
              </div>
              <p style={{ fontWeight: 700, minWidth: '80px', textAlign: 'right' }}>
                {(item.product.price * item.quantity).toFixed(2)} DZD
              </p>
              <button onClick={() => removeItem(item.product.id)} className="btn btn-ghost btn-sm" style={{ color: '#dc2626', border: 'none' }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Delivery Details</h3>

            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label className="label" htmlFor="addr">Delivery Address <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea id="addr" className="input" style={{ resize: 'vertical', minHeight: '80px' }}
                value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your full delivery address…" required />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                {coords ? `📍 ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Add GPS pin for faster delivery'}
              </span>
              <button onClick={getLocation} className="btn btn-outline btn-sm" disabled={locating}>
                <MapPin size={14} /> {locating ? '…' : 'Pin location'}
              </button>
            </div>

            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label className="label" htmlFor="notes">Notes (optional)</label>
              <textarea id="notes" className="input" style={{ resize: 'vertical', minHeight: '60px' }}
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Any delivery instructions?" />
            </div>

            <hr className="divider" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {items.map((i) => (
                <div key={i.product.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span>{i.product.name} ×{i.quantity}</span>
                  <span>{(i.product.price * i.quantity).toFixed(2)} DZD</span>
                </div>
              ))}
              <hr className="divider" style={{ margin: '0.5rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
                <span>Total</span>
                <span style={{ color: 'var(--primary)' }}>{total().toFixed(2)} DZD</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>💵 Cash on Delivery</p>
            </div>

            <button onClick={placeOrder} className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Place Order →'}
            </button>
          </div>

          <Link href="/search" className="btn btn-ghost btn-full">← Continue Shopping</Link>
        </div>
      </div>
    </div>
  )
}
