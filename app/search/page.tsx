'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, MapPin, Package, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { NearbyPharmacy, Product } from '@/lib/database.types'

interface ProductWithPharmacy extends Product {
  pharmacy_name: string
  distance_km: number
}

function SearchContent() {
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [query, setQuery] = useState(params.get('q') ?? '')
  const [radius, setRadius] = useState(10)
  const [productsGrid, setProductsGrid] = useState<ProductWithPharmacy[]>([])
  const [pharmaciesFound, setPharmaciesFound] = useState(0)
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
        setLocationError('Location access denied. Please allow location access to find nearby products.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  useEffect(() => { requestLocation() }, [requestLocation])

  const doSearch = useCallback(async () => {
    if (!coords) return
    setLoading(true)

    // Find nearby pharmacies first
    const { data: pharmacies, error } = await supabase.rpc('find_nearby_pharmacies', {
      p_lat: coords.lat,
      p_lng: coords.lng,
      p_radius_km: radius,
    })

    if (error || !pharmacies || pharmacies.length === 0) { 
      setPharmaciesFound(0)
      setProductsGrid([])
      setLoading(false)
      return 
    }

    setPharmaciesFound(pharmacies.length)

    // Fetch products from those pharmacies
    const pharmacyIds = pharmacies.map((p) => p.pharmacy_id)
    let q = supabase
      .from('products')
      .select('*')
      .in('pharmacy_id', pharmacyIds)
      .eq('is_available', true)

    if (query.trim()) {
      q = q.ilike('name', `%${query.trim()}%`)
    }

    const { data: products } = await q.order('name')

    // Map products to include pharmacy distance and name
    const flatProducts: ProductWithPharmacy[] = (products || []).map(prod => {
      const ph = pharmacies.find((p) => p.pharmacy_id === prod.pharmacy_id)
      return {
        ...prod,
        pharmacy_name: ph?.pharmacy_name || 'Nearby Pharmacy',
        distance_km: ph?.distance_km || 0
      }
    })

    // Sort products by distance
    flatProducts.sort((a, b) => a.distance_km - b.distance_km)

    setProductsGrid(flatProducts)
    setLoading(false)
  }, [coords, query, radius, supabase])

  useEffect(() => {
    if (coords) doSearch()
  }, [coords]) // Search runs initially when coords are found, otherwise relies on form submit

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    doSearch()
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Find Products Nearby</h1>
        <p style={{ color: 'var(--muted)' }}>Searching within <strong>{radius} km</strong> of your location</p>
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
          {[2, 5, 10, 20, 50, 100, 500].map((r) => <option key={r} value={r}>{r} km</option>)}
        </select>
        <button type="submit" className="btn btn-primary" disabled={!coords || loading}>
          {loading ? <span className="spinner" /> : <><Search size={16} /> Search</>}
        </button>
      </form>

      {/* Location status */}
      {locationError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#fee2e2', border: '2px solid #fecaca', marginBottom: '1.5rem', borderRadius: '8px' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--green-50)', border: '2px solid var(--green-200)', marginBottom: '1.5rem', borderRadius: '8px' }}>
          <span className="spinner" />
          <p style={{ fontSize: '0.875rem', color: 'var(--green-800)' }}>Getting your location…</p>
        </div>
      )}

      {/* Results */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
          <span className="spinner" />
          <span style={{ color: 'var(--muted)' }}>Finding nearby products…</span>
        </div>
      )}

      {!loading && coords && pharmaciesFound === 0 && (
        <div className="empty-state">
          <MapPin size={48} />
          <h3>No pharmacies found nearby</h3>
          <p>Please increase the search radius to discover pharmacies in your area.</p>
        </div>
      )}

      {!loading && coords && pharmaciesFound > 0 && productsGrid.length === 0 && (
        <div className="empty-state">
          <Package size={48} />
          <h3>No matching products</h3>
          <p>We found {pharmaciesFound} pharmacies nearby, but none had "{query}" in stock.</p>
          <p>Try searching for a different product or increasing your radius.</p>
        </div>
      )}

      {!loading && productsGrid.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
          {productsGrid.map((product) => (
            <Link key={product.id} href={`/pharmacy/${product.pharmacy_id}?highlight=${product.id}`} style={{ textDecoration: 'none' }}>
              <div className="card card-hover" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '160px', objectFit: 'cover', marginBottom: '1rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                ) : (
                  <div style={{ width: '100%', height: '160px', background: 'var(--green-50)', marginBottom: '1rem', borderRadius: '4px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={40} color="var(--primary)" opacity={0.5} />
                  </div>
                )}
                
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem', lineHeight: 1.2 }}>{product.name}</h3>
                {product.category && <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem', display: 'block' }}>{product.category}</span>}
                
                <div style={{ marginTop: 'auto' }}>
                  <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                    {product.price.toFixed(2)} DZD
                  </p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)', background: 'var(--green-50)', padding: '0.5rem', borderRadius: '4px' }}>
                    <span style={{ fontWeight: 500, color: 'var(--green-800)' }}>{product.pharmacy_name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={10} /> {product.distance_km} km</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
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
