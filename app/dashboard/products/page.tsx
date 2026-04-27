'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Package, X, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/Toast'
import type { Product, Profile } from '@/lib/database.types'

const CATEGORIES = ['Vitamins', 'Supplements', 'Skincare', 'Baby', 'Orthopedics', 'Homeopathy', 'Other']

const EMPTY_FORM = {
  name: '', description: '', price: '', stock: '', category: '', image_url: '', is_available: true,
}

export default function DashboardProductsPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p || p.role !== 'pharmacy') { router.push('/'); return }
      setProfile(p)

      const { data: prods } = await supabase.from('products').select('*').eq('pharmacy_id', user.id).order('created_at', { ascending: false })
      setProducts(prods ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowModal(true) }
  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      name: p.name, description: p.description ?? '', price: String(p.price),
      stock: String(p.stock), category: p.category ?? '', image_url: p.image_url ?? '', is_available: p.is_available,
    })
    setShowModal(true)
  }

  const handleImageUpload = async (file: File) => {
    if (!profile) return
    setUploading(true)
    const path = `${profile.id}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('products').upload(path, file, { upsert: true })
    if (error) { toast.error('Image upload failed'); setUploading(false); return }
    const { data: url } = supabase.storage.from('products').getPublicUrl(path)
    setForm((f) => ({ ...f, image_url: url.publicUrl }))
    setUploading(false)
    toast.success('Image uploaded')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseFloat(form.price),
      stock: parseInt(form.stock, 10),
      category: form.category || null,
      image_url: form.image_url || null,
      is_available: form.is_available,
      pharmacy_id: profile.id,
    }

    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id)
      if (error) { toast.error('Failed to update product'); setSaving(false); return }
      setProducts((prev) => prev.map((p) => p.id === editing.id ? { ...p, ...payload, id: editing.id, created_at: editing.created_at } : p))
      toast.success('Product updated')
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select().single()
      if (error || !data) { toast.error('Failed to add product'); setSaving(false); return }
      setProducts((prev) => [data, ...prev])
      toast.success('Product added')
    }

    setSaving(false)
    setShowModal(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return
    setDeleting(id)
    await supabase.from('products').delete().eq('id', id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
    setDeleting(null)
    toast.success('Product deleted')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
    </div>
  )

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/dashboard')} className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: 0 }}>
          &larr; Back to Dashboard
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Products</h1>
          <p style={{ color: 'var(--muted)' }}>{products.length} product{products.length !== 1 ? 's' : ''} listed</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary"><Plus size={16} /> Add Product</button>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <Package size={56} />
          <h3>No products yet</h3>
          <p>Add your first product so customers can find and order it.</p>
          <button onClick={openAdd} className="btn btn-primary">Add First Product</button>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table" style={{ minWidth: '600px' }}>
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} style={{ width: '48px', height: '48px', objectFit: 'cover', border: '2px solid var(--border)' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', background: 'var(--green-50)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={16} color="var(--green-300)" />
                      </div>
                    )}
                  </td>
                  <td style={{ fontWeight: 600, maxWidth: '200px' }}>
                    <p>{p.name}</p>
                    {p.description && <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{p.description}</p>}
                  </td>
                  <td>{p.category ? <span className="badge badge-gray">{p.category}</span> : '—'}</td>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.price.toFixed(2)} DZD</td>
                  <td>
                    <span style={{ fontWeight: 600, color: p.stock === 0 ? '#dc2626' : p.stock < 5 ? '#92400e' : 'var(--text)' }}>{p.stock}</span>
                  </td>
                  <td>
                    <span className={`badge ${p.is_available ? 'badge-green' : 'badge-gray'}`}>
                      {p.is_available ? 'Available' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => openEdit(p)} className="btn btn-ghost btn-sm"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(p.id)} className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} disabled={deleting === p.id}>
                        {deleting === p.id ? <span className="spinner" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '2px solid var(--border)' }}>
              <h3 style={{ margin: 0 }}>{editing ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="label" htmlFor="p-name">Product Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input id="p-name" type="text" className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. Omega-3 Fish Oil 1000mg" />
              </div>

              <div className="input-group">
                <label className="label" htmlFor="p-desc">Description</label>
                <textarea id="p-desc" className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief product description…" style={{ minHeight: '80px', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div className="input-group">
                  <label className="label" htmlFor="p-price">Price (DZD) <span style={{ color: '#dc2626' }}>*</span></label>
                  <input id="p-price" type="number" className="input" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required min="0" step="0.01" placeholder="0.00" />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="p-stock">Stock <span style={{ color: '#dc2626' }}>*</span></label>
                  <input id="p-stock" type="number" className="input" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} required min="0" placeholder="0" />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="p-cat">Category</label>
                  <select id="p-cat" className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    <option value="">Select…</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Image upload */}
              <div className="input-group">
                <label className="label">Product Image</label>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]) }} />
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {form.image_url && (
                    <img src={form.image_url} alt="preview" style={{ width: '64px', height: '64px', objectFit: 'cover', border: '2px solid var(--border)' }} />
                  )}
                  <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost" disabled={uploading}>
                    <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload Image'}
                  </button>
                  {form.image_url && (
                    <button type="button" onClick={() => setForm((f) => ({ ...f, image_url: '' }))} className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }}>
                      <X size={14} /> Remove
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input type="checkbox" id="p-avail" checked={form.is_available} onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                <label htmlFor="p-avail" className="label" style={{ margin: 0, cursor: 'pointer' }}>Visible to customers (available)</label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '2px solid var(--border)' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : editing ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
