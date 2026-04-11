'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { MapPin, ShoppingCart, Package, Phone, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/cart-store'
import { PharmacyMap } from '@/components/PharmacyMap'
import { toast } from '@/components/Toast'
import type { Profile, Product } from '@/lib/database.types'

const CATEGORIES = ['All', 'Vitamins', 'Supplements', 'Skincare', 'Baby', 'Orthopedics', 'Homeopathy', 'Other']

export default function PharmacyPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const highlight = searchParams.get('highlight')
  const supabase = createClient()
  const addItem = useCartStore((s) => s.addItem)

  const [pharmacy, setPharmacy] = useState<Profile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [filtered, setFiltered] = useState<Product[]>([])
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      const [{ data: ph }, { data: prods }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('products').select('*').eq('pharmacy_id', id).eq('is_available', true).order('name'),
      ])
      setPharmacy(ph)
      setProducts(prods ?? [])
      setFiltered(prods ?? [])

      // Parse PostGIS location
      if (ph?.location) {
        // location comes as WKB hex string from supabase; use ST_AsText via rpc
        const { data: loc } = await supabase.rpc('find_nearby_pharmacies', {
          p_lat: 0, p_lng: 0, p_radius_km: 99999,
        }).eq('pharmacy_id', id)
        if (loc && loc[0]) {
          setCoords({ lat: loc[0].pharmacy_lat, lng: loc[0].pharmacy_lng })
        }
      }
      setLoading(false)
    }
    fetch()
  }, [id])

  useEffect(() => {
    let list = products
    if (category !== 'All') list = list.filter((p) => p.category === category)
    if (search) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    setFiltered(list)
  }, [category, search, products])

  // Scroll to highlighted product
  useEffect(() => {
    if (highlight) {
      setTimeout(() => {
        document.getElementById(`product-${highlight}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 500)
    }
  }, [highlight, filtered])

  const handleAddToCart = (product: Product) => {
    if (!pharmacy) return
    setAdding(product.id)
    addItem(product, pharmacy.id, pharmacy.name)
    toast.success(`${product.name} added to cart`)
    setTimeout(() => setAdding(null), 600)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
      <span style={{ color: 'var(--muted)' }}>Loading pharmacy…</span>
    </div>
  )

  if (!pharmacy) return (
    <div className="empty-state" style={{ minHeight: '60vh' }}>
      <Package size={48} />
      <h3>Pharmacy not found</h3>
      <Link href="/search" className="btn btn-primary">Back to Search</Link>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ borderBottom: '2px solid var(--border)', padding: '1.5rem 0', background: 'var(--green-50)' }}>
        <div className="container">
          <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            <ChevronLeft size={14} /> Back to Search
          </Link>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'start' }}>
            <div>
              <h1 style={{ marginBottom: '0.5rem' }}>{pharmacy.name}</h1>
              {pharmacy.address && (
                <p style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <MapPin size={14} /> {pharmacy.address}
                </p>
              )}
              {pharmacy.phone && (
                <p style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
                  <Phone size={14} /> {pharmacy.phone}
                </p>
              )}
              <div style={{ marginTop: '0.75rem' }}>
                <span className="badge badge-green">{products.length} Products Available</span>
              </div>
            </div>
            <Link href="/cart" className="btn btn-primary">
              <ShoppingCart size={16} /> View Cart
            </Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
          {/* Products panel */}
          <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter products…"
                style={{ maxWidth: '240px' }}
              />
              <div style={{ display: 'flex', gap: '0', border: '2px solid var(--border)', overflowX: 'auto' }}>
                {CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className="btn btn-sm"
                    style={{
                      borderRadius: 0, border: 'none', borderRight: cat !== 'Other' ? '1px solid var(--border)' : 'none',
                      background: category === cat ? 'var(--primary)' : 'transparent',
                      color: category === cat ? '#fff' : 'var(--gray-700)',
                    }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <Package size={40} />
                <p>No products match your filter.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
                {filtered.map((product) => (
                  <div key={product.id} id={`product-${product.id}`}
                    className="card"
                    style={{
                      transition: 'all 0.2s',
                      outline: highlight === product.id ? '3px solid var(--primary)' : 'none',
                      outlineOffset: '2px',
                    }}>
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '160px', objectFit: 'cover', borderBottom: '2px solid var(--border)' }} />
                    ) : (
                      <div style={{ width: '100%', height: '160px', background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '2px solid var(--border)' }}>
                        <Package size={32} color="var(--green-300)" />
                      </div>
                    )}
                    <div style={{ padding: '1rem' }}>
                      {product.category && <span className="badge badge-gray" style={{ marginBottom: '0.5rem' }}>{product.category}</span>}
                      <h4 style={{ marginBottom: '0.25rem', fontSize: '0.9375rem' }}>{product.name}</h4>
                      {product.description && <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>{product.description}</p>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{product.price.toFixed(2)} DZD</p>
                          <p style={{ fontSize: '0.75rem', color: product.stock > 0 ? 'var(--green-600)' : '#dc2626' }}>
                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="btn btn-primary btn-sm"
                          disabled={product.stock === 0 || adding === product.id}
                        >
                          {adding === product.id ? <span className="spinner" /> : <ShoppingCart size={14} />}
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Map sidebar */}
          <div style={{ position: 'sticky', top: '80px' }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '2px solid var(--border)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} color="var(--primary)" /> Pharmacy Location
                </h4>
              </div>
              {coords ? (
                <PharmacyMap lat={coords.lat} lng={coords.lng} label={pharmacy.name} height="300px" />
              ) : (
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)', color: 'var(--muted)', fontSize: '0.875rem' }}>
                  Location coordinates not set
                </div>
              )}
              {pharmacy.address && (
                <div style={{ padding: '1rem 1.25rem', borderTop: '2px solid var(--border)' }}>
                  <p style={{ fontSize: '0.875rem' }}>{pharmacy.address}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
