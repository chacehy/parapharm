'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, MapPin, Package, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { NearbyPharmacy, Product } from '@/lib/database.types'

interface PharmacyWithProducts extends NearbyPharmacy {
  products: Product[]
  expanded: boolean
}

function SearchContent() {
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [query, setQuery] = useState(params.get('q') ?? '')
  const [radius, setRadius] = useState(10)
  const [results, setResults] = useState<PharmacyWithProducts[]>([])
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationError('Geolocation not supported by this browser.'); return }
    setLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setLocating(false)
        setLocationError('Location access denied. Please allow location access to find nearby pharmacies.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  useEffect(() => { requestLocation() }, [])

  const doSearch = useCallback(async () => {
    if (!coords) return
    setLoading(true)

    const { data: pharmacies, error } = await supabase.rpc('find_nearby_pharmacies', {
      p_lat: coords.lat,
      p_lng: coords.lng,
      p_radius_km: radius,
      p_product_search: query.trim() || undefined,
    })

    if (error || !pharmacies) { setLoading(false); return }

    // Fetch products for each pharmacy
    const withProducts = await Promise.all(
      pharmacies.map(async (ph: NearbyPharmacy) => {
        let q = supabase
          .from('products')
          .select('*')
          .eq('pharmacy_id', ph.pharmacy_id)
          .eq('is_available', true)
          .order('name')

        if (query.trim()) {
          q = q.ilike('name', `%${query.trim()}%`)
        }

        const { data: products } = await q.limit(6)
        return { ...ph, products: products ?? [], expanded: false }
      })
    )

    setResults(withProducts)
    setLoading(false)
  }, [coords, query, radius, supabase])

  useEffect(() => {
    if (coords) doSearch()
  }, [coords])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    doSearch()
  }

  const toggleExpand = (id: string) => {
    setResults((r) => r.map((ph) => ph.pharmacy_id === id ? { ...ph, expanded: !ph.expanded } : ph))
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Find Products Nearby</h1>
        <p style={{ color: 'var(--muted)' }}>Searching pharmacies within <strong>{radius} km</strong> of your location</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products (e.g. Vitamin C, Omega-3…)"
            style={{ paddingLeft: '2.5rem', borderRight: 'none' }}
          />
        </div>
        <select
          className="input"
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          style={{ width: '130px', borderLeft: 'none', borderRight: 'none' }}
        >
          {[2, 5, 10, 20, 50].map((r) => <option key={r} value={r}>{r} km</option>)}
        </select>
        <button type="submit" className="btn btn-primary" disabled={!coords || loading}>
          {loading ? <span className="spinner" /> : <><Search size={16} /> Search</>}
        </button>
      </form>

      {/* Location status */}
      {locationError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#fee2e2', border: '2px solid #fecaca', marginBottom: '1.5rem' }}>
          <AlertCircle size={18} color="#dc2626" />
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#991b1b' }}>{locationError}</p>
            <button onClick={requestLocation} className="btn btn-sm" style={{ marginTop: '0.5rem', background: '#dc2626', color: '#fff', border: 'none' }}>
              Try Again
            </button>
          </div>
        </div>
      )}

      {locating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--green-50)', border: '2px solid var(--green-200)', marginBottom: '1.5rem' }}>
          <span className="spinner" />
          <p style={{ fontSize: '0.875rem', color: 'var(--green-800)' }}>Getting your location…</p>
        </div>
      )}

      {/* Results */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
          <span className="spinner" />
          <span style={{ color: 'var(--muted)' }}>Finding nearby pharmacies…</span>
        </div>
      )}

      {!loading && coords && results.length === 0 && (
        <div className="empty-state">
          <MapPin size={48} />
          <h3>No pharmacies found</h3>
          <p>Try increasing the search radius or changing your search term.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {results.map((ph) => (
          <div key={ph.pharmacy_id} className="card">
            {/* Pharmacy header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: ph.expanded ? '2px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                  <h3 style={{ margin: 0 }}>{ph.pharmacy_name}</h3>
                  <span className="badge badge-green">{ph.distance_km} km away</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <MapPin size={12} /> {ph.pharmacy_address || 'Address not provided'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  <Package size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  {ph.product_count} products
                </span>
                <Link href={`/pharmacy/${ph.pharmacy_id}`} className="btn btn-outline btn-sm">View All</Link>
                <button onClick={() => toggleExpand(ph.pharmacy_id)} className="btn btn-ghost btn-sm">
                  {ph.expanded ? 'Collapse ↑' : 'Show Products ↓'}
                </button>
              </div>
            </div>

            {/* Products */}
            {ph.expanded && (
              <div style={{ padding: '1.25rem 1.5rem' }}>
                {ph.products.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No matching products at this pharmacy.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {ph.products.map((product) => (
                      <Link key={product.id} href={`/pharmacy/${ph.pharmacy_id}?highlight=${product.id}`} style={{ textDecoration: 'none' }}>
                        <div className="card card-hover" style={{ padding: '1rem' }}>
                          {product.image_url && (
                            <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '120px', objectFit: 'cover', marginBottom: '0.75rem', border: '1px solid var(--border)' }} />
                          )}
                          <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{product.name}</p>
                          {product.category && <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>{product.category}</p>}
                          <p style={{ fontWeight: 700, color: 'var(--primary)' }}>{product.price.toFixed(2)} DZD</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                  <Link href={`/pharmacy/${ph.pharmacy_id}`} className="btn btn-primary btn-sm">
                    Visit Pharmacy Store →
                  </Link>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  )
}
