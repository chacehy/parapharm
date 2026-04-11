'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Package, ClipboardList, Bell,
  TrendingUp, Clock, CheckCircle, XCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Order } from '@/lib/database.types'

interface Stats {
  totalOrders: number
  pending: number
  delivered: number
  cancelled: number
  revenue: number
  totalProducts: number
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, pending: 0, delivered: 0, cancelled: 0, revenue: 0, totalProducts: 0 })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p || p.role !== 'pharmacy') { router.push('/'); return }
      setProfile(p)

      const [{ data: orders }, { count: productCount }] = await Promise.all([
        supabase.from('orders').select('*').eq('pharmacy_id', user.id).order('created_at', { ascending: false }),
        supabase.from('products').select('id', { count: 'exact' }).eq('pharmacy_id', user.id),
      ])

      if (orders) {
        setRecentOrders(orders.slice(0, 5))
        const revenue = orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.total_price, 0)
        setStats({
          totalOrders: orders.length,
          pending: orders.filter((o) => o.status === 'pending').length,
          delivered: orders.filter((o) => o.status === 'delivered').length,
          cancelled: orders.filter((o) => o.status === 'cancelled').length,
          revenue,
          totalProducts: productCount ?? 0,
        })

        const ids = [...new Set(orders.map((o) => o.customer_id))]
        if (ids.length > 0) {
          const { data: custs } = await supabase.from('profiles').select('id, name').in('id', ids)
          if (custs) {
            const map: Record<string, string> = {}
            custs.forEach((c) => { map[c.id] = c.name })
            setCustomerNames(map)
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  // Realtime new orders badge
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel(`dashboard-orders-${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `pharmacy_id=eq.${profile.id}` }, (payload) => {
        setRecentOrders((prev) => [payload.new as Order, ...prev].slice(0, 5))
        setStats((s) => ({ ...s, totalOrders: s.totalOrders + 1, pending: s.pending + 1 }))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
    </div>
  )

  const statCards = [
    { label: 'Total Orders', value: stats.totalOrders, icon: <ClipboardList size={20} color="var(--primary)" />, bg: 'var(--green-50)' },
    { label: 'Pending', value: stats.pending, icon: <Clock size={20} color="#92400e" />, bg: '#fef9c3' },
    { label: 'Delivered', value: stats.delivered, icon: <CheckCircle size={20} color="#065f46" />, bg: 'var(--green-100)' },
    { label: 'Revenue (DZD)', value: stats.revenue.toFixed(0), icon: <TrendingUp size={20} color="var(--primary)" />, bg: 'var(--green-50)' },
    { label: 'Products Listed', value: stats.totalProducts, icon: <Package size={20} color="#1e40af" />, bg: '#dbeafe' },
    { label: 'Cancelled', value: stats.cancelled, icon: <XCircle size={20} color="#991b1b" />, bg: '#fee2e2' },
  ]

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Dashboard</h1>
          <p style={{ color: 'var(--muted)' }}>Welcome back, <strong>{profile?.name}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/dashboard/products" className="btn btn-outline btn-sm"><Package size={14} /> Products</Link>
          <Link href="/dashboard/orders" className="btn btn-primary btn-sm"><ClipboardList size={14} /> Orders</Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {statCards.map((sc) => (
          <div key={sc.label} className="card" style={{ padding: '1.25rem 1.5rem', background: sc.bg, border: '2px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              {sc.icon}
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{sc.value}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.375rem' }}>{sc.label}</p>
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
          { href: '/dashboard/products', label: 'Products', icon: <Package size={18} /> },
          { href: '/dashboard/orders', label: 'Orders', icon: <ClipboardList size={18} /> },
          { href: '/notifications', label: 'Notifications', icon: <Bell size={18} /> },
        ].map((nav) => (
          <Link key={nav.href} href={nav.href} className="card card-hover" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center', color: 'var(--primary)', textDecoration: 'none' }}>
            {nav.icon}
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{nav.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="card">
        <div style={{ padding: '1rem 1.5rem', borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Recent Orders</h3>
          <Link href="/dashboard/orders" className="btn btn-ghost btn-sm">View All →</Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <ClipboardList size={32} />
            <p>No orders yet. Orders will appear here in real time.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/dashboard/orders?id=${o.id}`)}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>#{o.id.slice(0, 8).toUpperCase()}</td>
                  <td>{customerNames[o.customer_id] ?? '—'}</td>
                  <td style={{ fontWeight: 700 }}>{o.total_price.toFixed(2)} DZD</td>
                  <td><span className={`badge status-${o.status}`} style={{ textTransform: 'capitalize' }}>{o.status}</span></td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
