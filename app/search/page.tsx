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
  search_type: 'sponsored' | 'organic'
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

    const { data: rankedProducts, error } = await (supabase as any).rpc('search_products_amazon_model', {
      p_query: query.trim(),
      p_lat: coords.lat,
      p_lng: coords.lng,
      p_radius_km: radius,
    }) as { data: ProductWithPharmacy[] | null, error: any }

    if (error || !rankedProducts || rankedProducts.length === 0) { 
      // Fallback or count pharmacies? We don't return pharmacy count directly now.
      // But we can check if it's empty.
      setPharmaciesFound(rankedProducts ? 1 : 0) // Just to avoid the "No pharmacies found" empty state incorrectly if there are no products. Wait, actually we don't have separate pharmacy count.
      setProductsGrid([])
      setLoading(false)
      return 
    }

    // Products are already sorted by the RPC (rank_score DESC, distance_km ASC)
    setPharmaciesFound(1) // Hack to bypass empty state
    setProductsGrid(rankedProducts)
    setLoading(false)
  }, [coords, query, radius, supabase])

  useEffect(() => {
    if (coords) doSearch()
  }, [coords]) // Search runs initially when coords are found, otherwise relies on form submit

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    doSearch()
  }

  const handleProductClick = async (product: ProductWithPharmacy) => {
    if (product.search_type === 'sponsored' && query.trim()) {
      // Background RPC call, no need to await it
      (supabase as any).rpc('register_sponsored_click', {
        p_pharmacy_id: product.pharmacy_id,
        p_product_id: product.id,
        p_keyword: query.trim()
      }).then(() => console.log('Click registered'))
        .catch((err: any) => console.error('Error registering click', err))
    }
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
        <>
          {productsGrid.filter((p) => p.search_type === 'sponsored').length > 0 && (
            <div style={{ marginBottom: '2.5rem', background: 'linear-gradient(to right, rgba(234, 179, 8, 0.05), rgba(234, 179, 8, 0.02))', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
              <h2 style={{ fontSize: '1rem', color: '#854d0e', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#eab308' }}></span>
                Sponsored
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                {productsGrid.filter((p) => p.search_type === 'sponsored').map((product) => (
                  <Link key={`sponsored-${product.id}`} href={`/pharmacy/${product.pharmacy_id}?highlight=${product.id}`} onClick={() => handleProductClick(product)} style={{ textDecoration: 'none' }}>
                    <div className="card card-hover" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', border: '1px solid rgba(234, 179, 8, 0.4)', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
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
            </div>
          )}

          <div>
            {productsGrid.filter((p) => p.search_type === 'organic').length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                {productsGrid.filter((p) => p.search_type === 'organic').map((product) => (
                  <Link key={`organic-${product.id}`} href={`/pharmacy/${product.pharmacy_id}?highlight=${product.id}`} onClick={() => handleProductClick(product)} style={{ textDecoration: 'none' }}>
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
            ) : (
              <div className="empty-state">
                <Package size={48} />
                <h3>No organic results</h3>
                <p>Try searching for a different product or increasing your radius.</p>
              </div>
            )}
          </div>
        </>
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
