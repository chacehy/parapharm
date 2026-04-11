import Link from 'next/link'
import { Search, MapPin, ShoppingBag, Zap, Shield, Clock } from 'lucide-react'

export default function HomePage() {
  return (
    <div>
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, var(--green-50) 0%, #fff 60%)',
        borderBottom: '2px solid var(--border)',
        padding: '5rem 0 4rem',
      }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }}>
          <div>

            <h1 style={{ marginBottom: '1.25rem' }}>
              Find Pharmacy <br />
              <span style={{ color: 'var(--primary)' }}>Products Near You</span>
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '1.1rem', marginBottom: '2rem', maxWidth: '480px' }}>
              Search supplements, vitamins &amp; wellness products from verified pharmacies in your area. Order online, pay on delivery.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/search" className="btn btn-primary btn-lg">
                <Search size={18} /> Find Products
              </Link>
              <Link href="/register?role=pharmacy" className="btn btn-outline btn-lg">
                List Your Pharmacy
              </Link>
            </div>
          </div>

          {/* Quick search card */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Quick Search</h3>
            <form action="/search" method="get">
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label className="label" htmlFor="q">What are you looking for?</label>
                <div style={{ display: 'flex', gap: '0' }}>
                  <input id="q" name="q" className="input" placeholder="e.g. Omega-3, Vitamin D..." style={{ flex: 1 }} />
                  <button type="submit" className="btn btn-primary" style={{ borderLeft: 'none' }}>
                    <Search size={16} />
                  </button>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={12} /> We&apos;ll use your location to find the nearest pharmacy
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────── */}
      <section style={{ padding: '4rem 0', borderBottom: '2px solid var(--border)' }}>
        <div className="container">
         <h2 style={{ marginBottom: '0.5rem' }}>Why ParaPharm?</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '2.5rem' }}>Everything you need, from pharmacies you can trust.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {[
              { icon: <MapPin size={24} color="var(--primary)" />, title: 'Nearby First', desc: 'Uses geolocation to find the closest stocked pharmacy instantly.' },
              { icon: <ShoppingBag size={24} color="var(--primary)" />, title: 'Easy Ordering', desc: 'Add to cart, place your order in seconds. Cash on delivery — no card needed.' },
              { icon: <Zap size={24} color="var(--primary)" />, title: 'Real-time Updates', desc: 'Track your order status live via Supabase Broadcast — from accepted to delivered.' },
              { icon: <Shield size={24} color="var(--primary)" />, title: 'Verified Pharmacies', desc: 'All listings are managed by licensed pharmacy accounts on the platform.' },
              { icon: <Clock size={24} color="var(--primary)" />, title: 'Quick Delivery', desc: 'Local pharmacies fulfill orders faster. Most ready within the hour.' },
              { icon: <Search size={24} color="var(--primary)" />, title: 'Smart Search', desc: 'Full-text search across all products in our network, ranked by proximity.' },
            ].map((f) => (
              <div key={f.title} className="card card-hover" style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '0.875rem' }}>{f.icon}</div>
                <h4 style={{ marginBottom: '0.5rem' }}>{f.title}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────── */}
      <section style={{ padding: '4rem 0', background: 'var(--primary)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Are You a Pharmacy Owner?</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2rem', fontSize: '1.05rem' }}>
            Join ParaPharm and start reaching more customers near you. Free to list your products.
          </p>
          <Link href="/register?role=pharmacy" className="btn btn-lg" style={{ background: '#fff', color: 'var(--primary)', border: '2px solid #fff' }}>
            Register Your Pharmacy →
          </Link>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <footer style={{ borderTop: '2px solid var(--border)', padding: '2rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>◼ ParaPharm</span>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>© {new Date().getFullYear()} ParaPharm. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
