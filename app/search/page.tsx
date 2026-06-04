'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, MapPin, Package, AlertCircle, X, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { NearbyPharmacy, Product } from '@/lib/database.types'

interface ProductWithPharmacy extends Product {
  pharmacy_name: string
  distance_km: number
  search_type: 'sponsored' | 'organic'
}

const CATEGORIES_DATA = {
  'Santé et beauté': [
    'Protection solaire',
    'Vitamine & complément alimentaire',
    'Hygiène intime',
    'Cheveux',
    'Visage',
    'Dents',
    'Corps'
  ],
  'Bébé': [
    'Soins bébé',
    'Cosmétique Bébé (Couches, lingettes)'
  ],
  'Complément alimentaire (Sport)': [
    'Protéines Whey',
    'Mass Grainer',
    'Fast Burner',
    'BCAA',
    'Créatine',
    'Pré workout',
    'Vitamine',
    'Acide Aminé'
  ]
}

function SearchContent() {
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [query, setQuery] = useState('')
  const [lastSearchQuery, setLastSearchQuery] = useState('')
  const [radius, setRadius] = useState(10)
  const [productsGrid, setProductsGrid] = useState<ProductWithPharmacy[]>([])
  const [pharmaciesFound, setPharmaciesFound] = useState(0)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubcategory, setSelectedSubcategory] = useState('')
  const [subcatLookup, setSubcatLookup] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)

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

  const doSearch = useCallback(async (searchQuery = query, searchRadius = radius) => {
    if (!coords) return
    setLoading(true)
    setLastSearchQuery(searchQuery)

    const { data: rankedProducts, error } = await (supabase as any).rpc('search_products_amazon_model', {
      p_query: searchQuery.trim(),
      p_lat: coords.lat,
      p_lng: coords.lng,
      p_radius_km: searchRadius,
    }) as { data: ProductWithPharmacy[] | null, error: any }

    if (error || !rankedProducts || rankedProducts.length === 0) { 
      setPharmaciesFound(0)
      setProductsGrid([])
      setLoading(false)
      return 
    }

    setPharmaciesFound(1)
    setProductsGrid(rankedProducts)
    setLoading(false)
  }, [coords, query, radius, supabase])

  // Get geolocation on mount
  useEffect(() => { requestLocation() }, [requestLocation])

  // Sync parameters & lookup table on mount / coords resolution
  useEffect(() => {
    const fetchSubcats = async () => {
      const { data } = await supabase.from('products').select('id, subcategory')
      if (data) {
        const lookup: Record<string, string> = {}
        data.forEach(p => {
          if (p.subcategory) lookup[p.id] = p.subcategory
        })
        setSubcatLookup(lookup)
      }
    }
    fetchSubcats()

    const initialQuery = params.get('q') ?? ''
    if (initialQuery) {
      if (Object.keys(CATEGORIES_DATA).includes(initialQuery)) {
        setSelectedCategory(initialQuery)
        setShowFilters(true)
        setQuery('')
        if (coords) doSearch('', radius)
      } else {
        let found = false
        for (const [cat, subs] of Object.entries(CATEGORIES_DATA)) {
          if (subs.some(s => s.toLowerCase() === initialQuery.toLowerCase() || initialQuery.toLowerCase().includes(s.toLowerCase()))) {
            setSelectedCategory(cat)
            const matchedSub = subs.find(s => s.toLowerCase() === initialQuery.toLowerCase() || initialQuery.toLowerCase().includes(s.toLowerCase())) || initialQuery
            setSelectedSubcategory(matchedSub)
            setShowFilters(true)
            setQuery('')
            found = true
            if (coords) doSearch('', radius)
            break
          }
        }
        if (!found) {
          setQuery(initialQuery)
          if (coords) doSearch(initialQuery, radius)
        }
      }
    } else if (coords) {
      doSearch('', radius)
    }
  }, [coords, params, supabase])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    doSearch(query, radius)
  }

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius)
    doSearch(query, newRadius)
  }

  const handleReset = () => {
    setQuery('')
    setSelectedCategory('')
    setSelectedSubcategory('')
    doSearch('', radius)
  }



  // Removed direct handleProductClick here as sponsored click tracking is handled via URL params on the product detail page to prevent component unmount request aborts.

  // Client-side filtering
  const filteredProducts = productsGrid.filter(product => {
    if (selectedCategory) {
      if (!product.category || product.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false
      }
    }
    if (selectedSubcategory) {
      const productSubcat = subcatLookup[product.id]
      if (!productSubcat || productSubcat.toLowerCase() !== selectedSubcategory.toLowerCase()) {
        return false
      }
    }
    return true
  })

  return (
    <div className="container" style={{ padding: '1rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Compact Header */}
      <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '0.25rem', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800 }}>Find Products Nearby</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Searching within <strong>{radius} km</strong> of your location</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-wrapper">
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="input search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit (ex: Vitamine C, Protéine...)"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        <div className="search-radius-wrapper">
          <select
            className="input search-radius-select"
            value={radius}
            onChange={(e) => handleRadiusChange(Number(e.target.value))}
          >
            {[2, 5, 10, 20, 50, 100, 500].map((r) => <option key={r} value={r}>{r} km</option>)}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--gray-500)' }} />
        </div>
        <button type="submit" className="btn btn-primary search-btn" disabled={!coords || loading}>
          {loading ? <span className="spinner" /> : <><Search size={16} /> Rechercher</>}
        </button>
      </form>

      {/* Filters Toggle Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-ghost"
          style={{
            height: '42px',
            borderRadius: '12px',
            padding: '0 1.25rem',
            border: '2px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            background: showFilters ? 'var(--green-50)' : '#fff',
            color: showFilters ? 'var(--primary)' : 'var(--gray-700)',
            borderColor: showFilters ? 'var(--primary)' : 'var(--border)',
            transition: 'all 0.2s ease'
          }}
        >
          <SlidersHorizontal size={16} />
          {showFilters ? 'Masquer les filtres' : 'Filtres'}
          {(selectedCategory || selectedSubcategory) && (
            <span style={{
              background: 'var(--primary)',
              color: '#fff',
              fontSize: '0.75rem',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '0.25rem',
              fontWeight: 700
            }}>
              {selectedSubcategory ? 2 : 1}
            </span>
          )}
        </button>
      </div>

      {/* Dropdown Filters under Search Bar (Progressive Disclosure) */}
      <div style={{ 
        maxHeight: showFilters ? '150px' : '0px',
        opacity: showFilters ? 1 : 0,
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex', 
        gap: '0.75rem', 
        marginBottom: showFilters ? '2rem' : '0px', 
        flexWrap: 'wrap', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: showFilters ? '0.25rem 0' : '0px'
      }}>
        {/* Main Category Selector */}
        <div className="custom-select-wrapper" style={{
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: showFilters ? 'translateY(0)' : 'translateY(-10px)',
          opacity: showFilters ? 1 : 0
        }}>
          <select
            className="custom-select"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              setSelectedSubcategory('')
            }}
          >
            <option value="">Toutes les catégories</option>
            {Object.keys(CATEGORIES_DATA).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown size={16} className="custom-select-icon" />
        </div>

        {/* Subcategory Selector (Reveals only when a category is selected) */}
        {selectedCategory && (
          <div className="custom-select-wrapper animate-slide-down-fade">
            <select
              className="custom-select"
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
            >
              <option value="">Toutes les sous-catégories</option>
              {CATEGORIES_DATA[selectedCategory as keyof typeof CATEGORIES_DATA].map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
            <ChevronDown size={16} className="custom-select-icon" />
          </div>
        )}

        {(selectedCategory || selectedSubcategory || query) && (
          <button
            onClick={handleReset}
            className="btn btn-ghost"
            style={{ 
              height: '46px', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              fontSize: '0.875rem', 
              color: '#dc2626',
              padding: '0 1.25rem',
              border: '2px solid transparent',
              transition: 'all 0.2s ease',
              transform: showFilters ? 'translateY(0)' : 'translateY(-10px)',
              opacity: showFilters ? 1 : 0
            }}
          >
            <X size={14} /> Réinitialiser
          </button>
        )}
      </div>

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

      {/* Results & Categories Grid */}
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

      {!loading && coords && pharmaciesFound > 0 && filteredProducts.length === 0 && (
        <div className="empty-state">
          <Package size={48} />
          <h3>No matching products</h3>
          <p>We found {pharmaciesFound} pharmacies nearby, but none had matching products in stock.</p>
          <p>Try searching for a different product, selecting another category, or increasing your radius.</p>
        </div>
      )}

      {!loading && filteredProducts.length > 0 && (
        <>
          {filteredProducts.filter((p) => p.search_type === 'sponsored').length > 0 && (
            <div style={{ marginBottom: '2.5rem', background: 'linear-gradient(to right, rgba(234, 179, 8, 0.05), rgba(234, 179, 8, 0.02))', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
              <h2 style={{ fontSize: '1rem', color: '#854d0e', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#eab308' }}></span>
                Sponsorisé
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                {filteredProducts.filter((p) => p.search_type === 'sponsored').map((product) => (
                  <Link key={`sponsored-${product.id}`} href={`/product/${product.id}?sponsored=true&keyword=${encodeURIComponent(lastSearchQuery)}`} style={{ textDecoration: 'none' }}>
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
            {filteredProducts.filter((p) => p.search_type === 'organic').length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                {filteredProducts.filter((p) => p.search_type === 'organic').map((product) => (
                  <Link key={`organic-${product.id}`} href={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
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
