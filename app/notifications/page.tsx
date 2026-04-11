'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Package, Info, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/Toast'
import type { Notification } from '@/lib/database.types'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  order: <Package size={16} color="var(--primary)" />,
  info:  <Info size={16} color="#1e40af" />,
  alert: <Bell size={16} color="#92400e" />,
}

export default function NotificationsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setNotifications(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // Realtime new notifications
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const channel = supabase
        .channel(`notifications-page-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    })
  }, [])

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setMarkingAll(false)
    toast.success('All notifications marked as read')
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
    </div>
  )

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '780px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Notifications</h1>
          {unreadCount > 0 && <p style={{ color: 'var(--muted)' }}>{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn btn-outline btn-sm" disabled={markingAll}>
            <CheckCheck size={14} /> {markingAll ? 'Marking…' : 'Mark All Read'}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <Bell size={56} />
          <h3>No notifications</h3>
          <p>You're all caught up. Notifications will appear here in real time.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {notifications.map((n, idx) => (
            <div
              key={n.id}
              onClick={() => { if (!n.is_read) markRead(n.id); if (n.order_id) router.push(`/orders/${n.order_id}`) }}
              style={{
                display: 'flex', gap: '1rem', padding: '1.25rem 1.5rem', cursor: 'pointer',
                background: n.is_read ? 'transparent' : 'var(--green-50)',
                borderBottom: idx < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.15s',
              }}
            >
              <div style={{
                width: '36px', height: '36px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: n.is_read ? 'var(--gray-100)' : 'var(--green-100)', border: '2px solid ' + (n.is_read ? 'var(--border)' : 'var(--green-300)'),
              }}>
                {TYPE_ICONS[n.type] ?? <Bell size={16} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <p style={{ fontWeight: n.is_read ? 500 : 700, fontSize: '0.9rem' }}>{n.title}</p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5 }}>{n.message}</p>
              </div>
              {!n.is_read && (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: '0.5rem' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
