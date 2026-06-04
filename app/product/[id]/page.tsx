'use client'
import { useEffect, useState, useCallback, Suspense, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { MapPin, ShoppingCart, Package, Phone, ChevronLeft, Minus, Plus, AlertCircle, MapPinOff, Check } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/cart-store'
import { PharmacyMap } from '@/components/PharmacyMap'
import { toast } from '@/components/Toast'
import { reverseGeocode } from '@/lib/geocoding'
import type { Product, Profile } from '@/lib/database.types'

function ProductContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)

  const [product, setProduct] = useState<Product | null>(null)
  const [pharmacy, setPharmacy] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [pharmacyCoords, setPharmacyCoords] = useState<{ lat: number; lng: number } | null>(null)
  
  // Interaction State
  const [quantity, setQuantity] = useState(1)
  const [showCheckout, setShowCheckout] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)
  
  // Checkout Form State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [customerProfile, setCustomerProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locatingUser, setLocatingUser] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [placeName, setPlaceName] = useState<string | null>(null)

  useEffect(() => {
    if (!gpsCoords) { setPlaceName(null); return }
    reverseGeocode(gpsCoords.lat, gpsCoords.lng).then(setPlaceName)
  }, [gpsCoords])

  const registeredRef = useRef(false)

  useEffect(() => {
    if (!product || registeredRef.current) return

    const isSponsored = searchParams.get('sponsored') === 'true'
    const keyword = searchParams.get('keyword')

    if (isSponsored && keyword) {
      registeredRef.current = true
      
      const registerClick = async () => {
        try {
          const { error } = await supabase.rpc('register_sponsored_click', {
            p_pharmacy_id: product.pharmacy_id,
            p_product_id: product.id,
            p_keyword: keyword
          })
          if (error) {
            console.error('Error registering sponsored click:', error)
          } else {
            console.log('Sponsored click registered successfully')
          }
        } catch (err) {
          console.error('Error registering sponsored click:', err)
        }
      }
      registerClick()
    }
  }, [product, searchParams, supabase])

  // Fetch product and pharmacy details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // Fetch product
        const { data: prod, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single()

        if (prodErr || !prod) {
          setLoading(false)
          return
        }

        setProduct(prod)

        // Fetch pharmacy profile
        const { data: ph, error: phErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', prod.pharmacy_id)
          .single()

        if (ph) {
          setPharmacy(ph)
          // Resolve pharmacy coords via Postgres spatial RPC
          if (ph.location) {
            const { data: loc } = await supabase.rpc('find_nearby_pharmacies', {
              p_lat: 0, p_lng: 0, p_radius_km: 99999,
            }).eq('pharmacy_id', ph.id)
            
            if (loc && loc[0]) {
              setPharmacyCoords({ lat: loc[0].pharmacy_lat, lng: loc[0].pharmacy_lng })
            }
          }
        }

        // Check authentication & load customer profile
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setIsAuthenticated(true)
          const { data: customerProf } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (customerProf) {
            setCustomerProfile(customerProf)
            setFullName(customerProf.name || '')
            setPhone(customerProf.phone || '')
            setAddress(customerProf.address || '')
          }
        } else {
          setIsAuthenticated(false)
        }
      } catch (err) {
        console.error('Error loading product details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [id])

  // Get user GPS for order delivery
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n\'est pas supportée par votre navigateur.')
      return
    }
    setLocatingUser(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setGpsCoords(c)
        setLocatingUser(false)
        toast.success('Position GPS épinglée avec succès !')
        reverseGeocode(c.lat, c.lng).then((name) => {
          setPlaceName(name)
          if (!address.trim()) {
            setAddress(name)
          }
        })
      },
      () => {
        setLocatingUser(false)
        toast.error('Impossible d\'obtenir votre position GPS. Veuillez renseigner votre adresse.')
      },
      { enableHighAccuracy: true }
    )
  }

  // Handle placing the order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product || !pharmacy) return

    if (!isAuthenticated) {
      router.push(`/login?next=/product/${product.id}`)
      return
    }

    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires (*) pour la livraison.')
      return
    }

    setPlacingOrder(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/login?next=/product/${product.id}`)
        return
      }

      // Check stock limit
      if (product.stock < quantity) {
        toast.error(`Désolé, il ne reste que ${product.stock} articles en stock.`)
        setPlacingOrder(false)
        return
      }

      const totalAmount = product.price * quantity

      const orderPayload: Record<string, any> = {
        customer_id: user.id,
        pharmacy_id: pharmacy.id,
        delivery_address: address.trim(),
        notes: notes.trim() || null,
        total_price: totalAmount,
        payment_method: 'COD',
        status: 'pending'
      }

      if (gpsCoords) {
        orderPayload.delivery_location = `SRID=4326;POINT(${gpsCoords.lng} ${gpsCoords.lat})`
      }

      // 1. Insert order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select('id')
        .single()

      if (orderErr || !order) {
        console.error('Order creation error:', orderErr)
        toast.error('Erreur lors de la validation de la commande.')
        setPlacingOrder(false)
        return
      }

      // 2. Insert order items
      const orderItemPayload = {
        order_id: order.id,
        product_id: product.id,
        quantity: quantity,
        price: product.price
      }

      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(orderItemPayload)

      if (itemsErr) {
        console.error('Order items error:', itemsErr)
        // Rollback order
        await supabase.from('orders').delete().eq('id', order.id)
        toast.error('Erreur lors de la sauvegarde des détails de la commande.')
        setPlacingOrder(false)
        return
      }

      // Update local profile data if previously blank
      if (customerProfile && (!customerProfile.phone || !customerProfile.address)) {
        await supabase.from('profiles').update({
          phone: customerProfile.phone || phone.trim(),
          address: customerProfile.address || address.trim(),
          name: customerProfile.name || fullName.trim()
        }).eq('id', user.id)
      }

      toast.success('Votre commande a été passée avec succès !')
      router.push(`/orders?new=${order.id}`)
    } catch (err) {
      console.error('Error placing order:', err)
      toast.error('Une erreur est survenue lors de la commande.')
    } finally {
      setPlacingOrder(false)
    }
  }

  // Handle Add to Cart action
  const handleAddToCart = () => {
    if (!product || !pharmacy) return
    setAddingToCart(true)
    addItem(product, pharmacy.id, pharmacy.name)
    // Update the quantity in store to match quantity selector
    updateQuantity(product.id, quantity)
    toast.success(`${product.name} (${quantity}) ajouté au panier.`)
    setTimeout(() => setAddingToCart(false), 800)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
        <span style={{ color: 'var(--muted)' }}>Chargement du produit…</span>
      </div>
    )
  }

  if (!product || !pharmacy) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <Package size={48} />
        <h3>Produit introuvable</h3>
        <Link href="/search" className="btn btn-primary" style={{ borderRadius: '0px' }}>Retour à la recherche</Link>
      </div>
    )
  }

  return (
    <div style={{ background: '#fafafa', minHeight: 'calc(100vh - 64px)', padding: '2rem 0' }}>
      <div className="container" style={{ maxWidth: '1100px' }}>
        {/* Navigation Breadcrumb */}
        <Link 
          href="/search" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            color: 'var(--gray-500)', 
            fontSize: '0.875rem', 
            fontWeight: 600,
            textDecoration: 'none', 
            marginBottom: '1.5rem',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gray-500)'}
        >
          <ChevronLeft size={16} /> Retour aux produits
        </Link>

        {/* Dynamic product layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>
          
          {/* Left Column - Product detail and Checkout Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Product card details */}
            <div className="card" style={{ padding: '2rem', background: '#fff', borderRadius: '0px', border: '2px solid var(--border)' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', marginBottom: '1.5rem' }}>
                {/* Product Image */}
                <div style={{ width: '100%', aspectRatio: '1/1', position: 'relative' }}>
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover', 
                        border: '2px solid var(--border)', 
                        borderRadius: '0px'
                      }} 
                    />
                  ) : (
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      background: 'var(--green-50)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      border: '2px solid var(--border)', 
                      borderRadius: '0px' 
                    }}>
                      <Package size={56} color="var(--primary)" opacity={0.4} />
                    </div>
                  )}
                </div>

                {/* Meta details */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {/* Category Tags */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      {product.category && (
                        <span className="badge badge-green" style={{ borderRadius: '0px', border: '1px solid var(--primary)', textTransform: 'uppercase', fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                          {product.category}
                        </span>
                      )}
                      {/* Check if subcategory lookup maps or exists on the object */}
                      {(product as any).subcategory && (
                        <span className="badge badge-gray" style={{ borderRadius: '0px', border: '1px solid var(--border)', fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                          {(product as any).subcategory}
                        </span>
                      )}
                    </div>

                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem', lineHeight: 1.2 }}>
                      {product.name}
                    </h1>

                    {/* Stock indicator */}
                    <p style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: 600, 
                      color: product.stock > 0 ? 'var(--green-600)' : '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginBottom: '1rem'
                    }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: product.stock > 0 ? 'var(--primary)' : '#dc2626' }} />
                      {product.stock > 0 ? `${product.stock} en stock` : 'Rupture de stock'}
                    </p>

                    {product.description && (
                      <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div>
                    {/* Price banner */}
                    <p style={{ fontWeight: 800, fontSize: '1.85rem', color: 'var(--primary)', marginBottom: '0px' }}>
                      {product.price.toFixed(2)} DZD
                    </p>
                  </div>
                </div>
              </div>

              <hr className="divider" style={{ margin: '1.5rem 0' }} />

              {/* Quantity selector & CTAs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--gray-700)' }}>Quantité :</span>
                  <div style={{ display: 'flex', alignItems: 'center', border: '2px solid var(--border)' }}>
                    <button 
                      onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                      className="btn btn-ghost" 
                      style={{ border: 'none', borderRadius: '0px', height: '40px', width: '40px', padding: 0 }}
                      disabled={quantity <= 1 || product.stock <= 0}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ padding: '0 1rem', fontWeight: 800, minWidth: '40px', textAlign: 'center', fontSize: '1rem' }}>
                      {product.stock <= 0 ? 0 : quantity}
                    </span>
                    <button 
                      onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} 
                      className="btn btn-ghost" 
                      style={{ border: 'none', borderRadius: '0px', height: '40px', width: '40px', padding: 0 }}
                      disabled={quantity >= product.stock || product.stock <= 0}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {/* Add to cart */}
                  <button 
                    onClick={handleAddToCart}
                    className="btn btn-outline"
                    style={{ flex: 1, height: '50px', borderRadius: '0px', fontWeight: 700, borderWidth: '2px' }}
                    disabled={product.stock <= 0 || addingToCart}
                  >
                    {addingToCart ? <span className="spinner" /> : <><ShoppingCart size={16} /> Ajouter au panier</>}
                  </button>

                  {/* Buy Now toggle */}
                  <button 
                    onClick={() => {
                      if (!isAuthenticated) {
                        router.push(`/login?next=/product/${product.id}`)
                      } else {
                        setShowCheckout(!showCheckout)
                        // Scroll down to the checkout form
                        setTimeout(() => {
                          document.getElementById('checkout-form-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }, 100)
                      }
                    }}
                    className="btn btn-primary"
                    style={{ flex: 1, height: '50px', borderRadius: '0px', fontWeight: 800 }}
                    disabled={product.stock <= 0}
                  >
                    Acheter maintenant
                  </button>
                </div>
              </div>
            </div>

            {/* Inline Checkout Form */}
            {showCheckout && isAuthenticated && (
              <div 
                id="checkout-form-container"
                className="card animate-slide-down-fade" 
                style={{ 
                  padding: '2rem', 
                  background: '#fff', 
                  borderRadius: '0px', 
                  border: '2px solid var(--primary)', 
                  boxShadow: '0 10px 25px rgba(22, 163, 74, 0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800 }}>Détails de la commande</h2>
                  <span style={{ background: 'var(--green-50)', color: 'var(--primary)', border: '1px solid var(--primary)', fontSize: '0.8rem', padding: '0.2rem 0.5rem', fontWeight: 700 }}>
                    💵 Paiement cash à la livraison
                  </span>
                </div>

                <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Name field */}
                  <div className="input-group">
                    <label className="label" htmlFor="cust-name">Nom complet <span style={{ color: '#dc2626' }}>*</span></label>
                    <input 
                      id="cust-name" 
                      type="text" 
                      className="input" 
                      style={{ borderRadius: '0px' }}
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      required 
                      placeholder="e.g. Abdelbasset B." 
                    />
                  </div>

                  {/* Phone field */}
                  <div className="input-group">
                    <label className="label" htmlFor="cust-phone">Numéro de téléphone <span style={{ color: '#dc2626' }}>*</span></label>
                    <input 
                      id="cust-phone" 
                      type="tel" 
                      className="input" 
                      style={{ borderRadius: '0px' }}
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      required 
                      placeholder="e.g. 0550123456" 
                    />
                  </div>

                  {/* Address field */}
                  <div className="input-group">
                    <label className="label" htmlFor="cust-addr">Adresse de livraison <span style={{ color: '#dc2626' }}>*</span></label>
                    <textarea 
                      id="cust-addr" 
                      className="input" 
                      style={{ borderRadius: '0px', resize: 'vertical', minHeight: '80px' }}
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      required 
                      placeholder="Rue, Quartier, Commune, Wilaya…" 
                    />
                  </div>

                  {/* Location pinning (GPS) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: 'var(--green-50)', border: '1px dashed var(--primary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--green-800)' }}>Position GPS</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {gpsCoords ? (placeName ? `📍 ${placeName}` : `📍 Épinglé (${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)})`) : 'Ajoutez votre position GPS pour accélérer la livraison'}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={getUserLocation} 
                      className="btn btn-outline btn-sm" 
                      style={{ borderRadius: '0px', borderWidth: '1px', padding: '0.35rem 0.75rem' }} 
                      disabled={locatingUser}
                    >
                      {locatingUser ? 'Recherche…' : gpsCoords ? 'Réépingler' : 'M\'épingler'}
                    </button>
                  </div>

                  {/* Order notes */}
                  <div className="input-group">
                    <label className="label" htmlFor="cust-notes">Notes de livraison (optionnel)</label>
                    <textarea 
                      id="cust-notes" 
                      className="input" 
                      style={{ borderRadius: '0px', resize: 'vertical', minHeight: '60px' }}
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      placeholder="Digicode, instructions spéciales, points de repère…" 
                    />
                  </div>

                  <hr className="divider" style={{ margin: '0.5rem 0' }} />

                  {/* Summary Pricing block */}
                  <div style={{ background: 'var(--gray-50)', border: '2px solid var(--border)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--muted)' }}>
                      <span>Prix unitaire</span>
                      <span>{product.price.toFixed(2)} DZD</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--muted)' }}>
                      <span>Quantité sélectionnée</span>
                      <span>× {quantity}</span>
                    </div>
                    <hr className="divider" style={{ margin: '0.25rem 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.15rem', color: 'var(--text)' }}>
                      <span>Total à payer</span>
                      <span style={{ color: 'var(--primary)' }}>{(product.price * quantity).toFixed(2)} DZD</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setShowCheckout(false)} 
                      className="btn btn-ghost" 
                      style={{ borderRadius: '0px' }}
                      disabled={placingOrder}
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ borderRadius: '0px', padding: '0 2rem', height: '44px', fontWeight: 800 }}
                      disabled={placingOrder}
                    >
                      {placingOrder ? <span className="spinner" /> : 'Confirmer la commande'}
                    </button>
                  </div>
                </form>
              </div>
            )}
            
          </div>

          {/* Right Column - Pharmacy info & location map */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '90px' }}>
            
            {/* Pharmacy card */}
            <div className="card" style={{ background: '#fff', borderRadius: '0px', border: '2px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid var(--border)', background: 'var(--gray-50)' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} color="var(--primary)" /> Pharmacie vendeuse
                </h3>
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.25rem' }}>
                    {pharmacy.name}
                  </h4>
                  
                  {pharmacy.address && (
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'start', gap: '0.35rem', margin: '0.5rem 0' }}>
                      <MapPin size={14} style={{ flexShrink: 0, marginTop: '2px' }} /> {pharmacy.address}
                    </p>
                  )}

                  {pharmacy.phone && (
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: '0.5rem 0' }}>
                      <Phone size={14} /> {pharmacy.phone}
                    </p>
                  )}
                </div>

                {/* Leaflet Location map */}
                <div style={{ border: '2px solid var(--border)', overflow: 'hidden' }}>
                  {pharmacyCoords ? (
                    <PharmacyMap lat={pharmacyCoords.lat} lng={pharmacyCoords.lng} label={pharmacy.name} height="280px" />
                  ) : (
                    <div style={{ 
                      height: '280px', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      background: 'var(--gray-50)', 
                      color: 'var(--gray-400)', 
                      fontSize: '0.85rem',
                      gap: '0.5rem'
                    }}>
                      <MapPinOff size={32} />
                      <span>Coordonnées GPS non disponibles</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shopping guarantee pill */}
            <div className="card" style={{ padding: '1.25rem', background: 'var(--green-50)', border: '2px solid var(--green-200)', borderRadius: '0px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--green-800)', marginBottom: '0.25rem' }}>
                🛡️ Wellza Parapharm Garantie
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--green-800)', lineHeight: 1.5 }}>
                Les produits parapharmaceutiques et compléments sont vendus sous le contrôle de pharmaciens agréés. Livraison locale rapide avec règlement à la réception.
              </p>
            </div>

          </div>
          
        </div>
      </div>
    </div>
  )
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
      </div>
    }>
      <ProductContent />
    </Suspense>
  )
}
