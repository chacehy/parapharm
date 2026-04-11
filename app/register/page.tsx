'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/Toast'
import { MapPin, Eye, EyeOff, Building2, User } from 'lucide-react'

type Role = 'customer' | 'pharmacy'

export default function RegisterPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()

  const [role, setRole] = useState<Role>((params.get('role') as Role) ?? 'customer')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [address, setAddress] = useState('')
  const [locating, setLocating] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/')
    })
  }, [])

  const getLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
        toast.success('Location captured!')
      },
      (err) => {
        setLocating(false)
        toast.error('Location access denied. Please enable it in browser settings.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (role === 'pharmacy' && !coords) {
      toast.error('Pharmacy location is required. Click "Use My Location".')
      return
    }
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    })

    if (error || !data.user) {
      setLoading(false)
      toast.error(error?.message ?? 'Registration failed')
      return
    }

    // Update profile with extra fields
    const profileUpdate: Record<string, unknown> = { name, phone, address }
    if (coords) {
      profileUpdate.location = `SRID=4326;POINT(${coords.lng} ${coords.lat})`
    }

    await supabase.from('profiles').update(profileUpdate).eq('id', data.user.id)

    setLoading(false)
    toast.success('Account created! You can now sign in.')
    router.push('/login?message=Account created successfully. Please sign in.')
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'var(--green-50)' }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div className="card" style={{ padding: '2.5rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Create Account</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Join the ParaPharm network</p>
          </div>

          {/* Role toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', marginBottom: '2rem', border: '2px solid var(--border)' }}>
            {(['customer', 'pharmacy'] as Role[]).map((r) => (
              <button key={r} type="button" onClick={() => setRole(r)}
                style={{
                  padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  fontWeight: 600, fontSize: '0.9rem', border: 'none', cursor: 'pointer',
                  background: role === r ? 'var(--primary)' : 'transparent',
                  color: role === r ? '#fff' : 'var(--gray-700)',
                  transition: 'all 0.15s',
                }}>
                {r === 'customer' ? <User size={16} /> : <Building2 size={16} />}
                {r === 'customer' ? 'Customer' : 'Pharmacy'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="input-group">
              <label className="label" htmlFor="name">{role === 'pharmacy' ? 'Pharmacy Name' : 'Full Name'}</label>
              <input id="name" type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={role === 'pharmacy' ? 'e.g. Pharmacie Al-Nour' : 'e.g. Ahmed Benali'} required />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="reg-email">Email address</label>
              <input id="reg-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="phone">Phone number</label>
              <input id="phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+213 5XX XXX XXX" />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="reg-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input id="reg-password" type={showPw ? 'text' : 'password'} className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} style={{ paddingRight: '2.75rem' }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="label" htmlFor="address">Address</label>
              <input id="address" type="text" className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address, city" required={role === 'pharmacy'} />
            </div>

            {/* Location – required for pharmacy */}
            <div style={{ border: '2px solid var(--border)', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="label" style={{ margin: 0 }}>
                  GPS Location {role === 'pharmacy' ? <span style={{ color: '#dc2626' }}>*</span> : '(optional)'}
                </span>
                <button type="button" onClick={getLocation} className="btn btn-outline btn-sm" disabled={locating}>
                  <MapPin size={14} />
                  {locating ? 'Locating…' : 'Use My Location'}
                </button>
              </div>
              {coords ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--green-700)', fontWeight: 500 }}>
                  ✓ {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </p>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  {role === 'pharmacy' ? 'Required to appear on the map for customers.' : 'Helps us pre-fill delivery location.'}
                </p>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create Account'}
            </button>
          </form>

          <hr className="divider" />
          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--muted)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
