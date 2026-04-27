'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/Toast'
import { Eye, EyeOff } from 'lucide-react'

function LoginContent() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/')
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    toast.success('Welcome back!')
    router.push(profile?.role === 'pharmacy' ? '/dashboard' : '/search')
    router.refresh()
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'var(--green-50)' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div className="card" style={{ padding: '2.5rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Sign In</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Access your ParaPharm account</p>
            {params.get('message') && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--green-50)', border: '2px solid var(--green-200)', fontSize: '0.85rem', color: 'var(--green-800)' }}>
                {params.get('message')}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="input-group">
              <label className="label" htmlFor="email">Email address</label>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input id="password" type={showPw ? 'text' : 'password'} className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" style={{ paddingRight: '2.75rem' }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>

          <hr className="divider" />
          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--muted)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
