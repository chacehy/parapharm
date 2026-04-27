'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User, MapPin, Phone, Save, Upload, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/Toast'
import { PharmacyMap } from '@/components/PharmacyMap'
import type { Profile } from '@/lib/database.types'

export default function AccountPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      const p = data as Profile | null
      if (!p) return

      setProfile(p)
      setForm({ name: p.name, phone: p.phone ?? '', address: p.address ?? '' })

      // Try to get coordinates from PostGIS via the nearby function
      if (p.role === 'pharmacy' && p.location) {
        const { data: loc } = await (supabase.rpc as any)('find_nearby_pharmacies', { p_lat: 0, p_lng: 0, p_radius_km: 99999 })
        const mine = loc?.find((x: { pharmacy_id: string }) => x.pharmacy_id === user.id)
        if (mine) setCoords({ lat: mine.pharmacy_lat, lng: mine.pharmacy_lng })
      }
      setLoading(false)
    }
    load()
  }, [])

  const getLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
        toast.success('Location updated — save to apply')
      },
      () => { setLocating(false); toast.error('Location access denied') },
      { enableHighAccuracy: true }
    )
  }

  const handleAvatarUpload = async (file: File) => {
    if (!profile) return
    setUploading(true)
    const path = `${profile.id}/avatar-${Date.now()}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) { toast.error('Upload failed'); setUploading(false); return }
    const { data: url } = supabase.storage.from('avatars').getPublicUrl(path)
    await (supabase.from('profiles') as any).update({ avatar_url: url.publicUrl }).eq('id', profile.id)
    setProfile((p) => p ? { ...p, avatar_url: url.publicUrl } : p)
    setUploading(false)
    toast.success('Avatar updated')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)

    const update: Record<string, unknown> = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
    }

    if (coords) {
      update.location = `SRID=4326;POINT(${coords.lng} ${coords.lat})`
    }

    const { error } = await (supabase.from('profiles') as any).update(update).eq('id', profile.id)
    setSaving(false)
    if (error) { toast.error('Failed to save changes'); return }
    setProfile((p) => p ? { ...p, name: form.name, phone: form.phone, address: form.address } : p)
    toast.success('Profile updated successfully')
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.next !== passwordForm.confirm) { toast.error('Passwords do not match'); return }
    if (passwordForm.next.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setChangingPw(true)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.next })
    setChangingPw(false)
    if (error) { toast.error(error.message); return }
    setPasswordForm({ current: '', next: '', confirm: '' })
    toast.success('Password changed successfully')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
    </div>
  )

  if (!profile) return null

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '900px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: 0 }}>
          &larr; Back to {profile.role === 'customer' ? 'Search' : 'Dashboard'}
        </button>
      </div>
      <h1 style={{ marginBottom: '0.25rem' }}>Account Settings</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        Manage your {profile.role === 'pharmacy' ? 'pharmacy' : 'customer'} profile
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Avatar card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  style={{ width: '96px', height: '96px', objectFit: 'cover', border: '3px solid var(--primary)', display: 'block', margin: '0 auto' }}
                />
              ) : (
                <div style={{
                  width: '96px', height: '96px', background: 'var(--green-50)', border: '3px solid var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                }}>
                  {profile.role === 'pharmacy' ? <Building2 size={40} color="var(--primary)" /> : <User size={40} color="var(--primary)" />}
                </div>
              )}
            </div>
            <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{profile.name}</p>
            <span className={`badge ${profile.role === 'pharmacy' ? 'badge-green' : 'badge-blue'}`} style={{ textTransform: 'capitalize' }}>
              {profile.role}
            </span>
            <hr className="divider" />
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) handleAvatarUpload(e.target.files[0]) }} />
            <button onClick={() => fileRef.current?.click()} className="btn btn-outline btn-sm btn-full" disabled={uploading}>
              <Upload size={14} /> {uploading ? 'Uploading…' : 'Change Avatar'}
            </button>
          </div>

          {/* Location preview for pharmacy */}
          {profile.role === 'pharmacy' && coords && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '2px solid var(--border)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <MapPin size={14} color="var(--primary)" /> Your Location
                </h4>
              </div>
              <PharmacyMap lat={coords.lat} lng={coords.lng} label={profile.name} height="200px" zoom={14} />
            </div>
          )}
        </div>

        {/* Profile form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} color="var(--primary)" /> Profile Information
            </h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="label" htmlFor="acc-name">{profile.role === 'pharmacy' ? 'Pharmacy Name' : 'Full Name'}</label>
                <input id="acc-name" type="text" className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label className="label" htmlFor="acc-phone">
                  <Phone size={12} style={{ display: 'inline', marginRight: '4px' }} />Phone
                </label>
                <input id="acc-phone" type="tel" className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+213 5XX XXX XXX" />
              </div>
              <div className="input-group">
                <label className="label" htmlFor="acc-addr">
                  <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />Address
                </label>
                <input id="acc-addr" type="text" className="input" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street address, city" />
              </div>

              {/* GPS for pharmacy */}
              {profile.role === 'pharmacy' && (
                <div style={{ border: '2px solid var(--border)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="label" style={{ margin: 0 }}>GPS Location</span>
                    <button type="button" onClick={getLocation} className="btn btn-outline btn-sm" disabled={locating}>
                      <MapPin size={14} /> {locating ? 'Getting…' : 'Update Location'}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: coords ? 'var(--green-700)' : 'var(--muted)' }}>
                    {coords ? `✓ ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'No GPS coordinates set — customers cannot find you on the map.'}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : <><Save size={14} /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>

          {/* Change password */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Change Password</h3>
            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="label" htmlFor="pw-new">New Password</label>
                <input id="pw-new" type="password" className="input" value={passwordForm.next} onChange={(e) => setPasswordForm((f) => ({ ...f, next: e.target.value }))} minLength={8} placeholder="Min. 8 characters" />
              </div>
              <div className="input-group">
                <label className="label" htmlFor="pw-confirm">Confirm New Password</label>
                <input id="pw-confirm" type="password" className="input" value={passwordForm.confirm} onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))} placeholder="Repeat new password" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-outline" disabled={changingPw || !passwordForm.next}>
                  {changingPw ? <span className="spinner" /> : 'Change Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Danger zone */}
          <div className="card" style={{ padding: '1.5rem', borderColor: '#fecaca' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#dc2626' }}>Danger Zone</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1rem' }}>
              Once you delete your account, all your data will be permanently removed.
            </p>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                if (confirm('Delete your account permanently? This cannot be undone.')) {
                  toast.error('Account deletion is disabled in this demo.')
                }
              }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
