'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ShoppingCart, Bell, User, LogOut, Package, LayoutDashboard, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/cart-store'
import type { Profile } from '@/lib/database.types'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [unread, setUnread] = useState(0)
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0))

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        setProfile(data)
      })
      supabase.from('notifications').select('id', { count: 'exact' }).eq('user_id', user.id).eq('is_read', false).then(({ count }) => {
        setUnread(count ?? 0)
      })
    })
  }, [])

  // Realtime unread badge
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel(`notif-badge-${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, () => {
        setUnread((n) => n + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href)) ? 'nav-link active' : 'nav-link'

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link href="/" className="nav-logo">◼ ParaPharm</Link>

        <div className="nav-links hide-mobile">
          <Link href="/search" className={isActive('/search')}>
            <Search size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Search
          </Link>
          {profile?.role === 'pharmacy' && (
            <Link href="/dashboard" className={isActive('/dashboard')}>
              <LayoutDashboard size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Dashboard
            </Link>
          )}
          {profile?.role === 'customer' && (
            <Link href="/orders" className={isActive('/orders')}>
              <Package size={14} style={{ display: 'inline', marginRight: '4px' }} />
              My Orders
            </Link>
          )}
        </div>

        <div className="nav-actions">
          {profile && (
            <>
              <Link href="/notifications" style={{ position: 'relative' }} title="Notifications">
                <Bell size={20} color="var(--gray-700)" />
                {unread > 0 && <span className="notif-dot" />}
              </Link>
              {profile.role === 'customer' && (
                <Link href="/cart" style={{ position: 'relative' }} title="Cart">
                  <ShoppingCart size={20} color="var(--gray-700)" />
                  {cartCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -8, right: -8,
                      background: 'var(--primary)', color: '#fff',
                      fontSize: '0.65rem', fontWeight: 700,
                      width: 18, height: 18, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{cartCount}</span>
                  )}
                </Link>
              )}
              <Link href="/account" className="btn btn-ghost btn-sm">
                <User size={14} />
                {profile.name.split(' ')[0]}
              </Link>
              <button onClick={handleLogout} className="btn btn-ghost btn-sm" title="Logout">
                <LogOut size={14} />
              </button>
            </>
          )}
          {!profile && (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Login</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
