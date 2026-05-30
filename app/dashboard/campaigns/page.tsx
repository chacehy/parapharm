'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Megaphone, Plus, Trash2, Coins, Zap, Play, Pause, X, 
  ArrowLeft, ClipboardList, AlertCircle, CheckCircle2 
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/Toast'
import type { Profile, Product, KeywordBid, CreditTransaction } from '@/lib/database.types'

interface BidWithProduct extends KeywordBid {
  product?: { name: string } | null
}

const EMPTY_FORM = {
  productId: '',
  keyword: '',
  bidAmount: '1',
}

export default function CampaignManagementPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [bids, setBids] = useState<BidWithProduct[]>([])
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  // Fetch all necessary data
  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p || p.role !== 'pharmacy') {
      router.push('/')
      return
    }
    setProfile(p)

    const [productsRes, bidsRes, transactionsRes] = await Promise.all([
      supabase.from('products').select('*').eq('pharmacy_id', user.id).order('name', { ascending: true }),
      supabase.from('keyword_bids').select('*, product:products(name)').eq('pharmacy_id', user.id).order('created_at', { ascending: false }),
      supabase.from('credit_transactions').select('*').eq('pharmacy_id', user.id).order('created_at', { ascending: false }),
    ])

    setProducts(productsRes.data ?? [])
    setBids((bidsRes.data as BidWithProduct[]) ?? [])
    setTransactions(transactionsRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleToggleActive = async (bidId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    const { error } = await supabase
      .from('keyword_bids')
      .update({ is_active: newStatus } as any)
      .eq('id', bidId)

    if (error) {
      toast.error('Failed to update campaign status')
      return
    }

    setBids((prev) =>
      prev.map((b) => (b.id === bidId ? { ...b, is_active: newStatus } : b))
    )
    toast.success(newStatus ? 'Campaign activated' : 'Campaign paused')
  }

  const handleDeleteBid = async (bidId: string) => {
    if (!confirm('Are you sure you want to delete this keyword campaign?')) return

    const { error } = await supabase
      .from('keyword_bids')
      .delete()
      .eq('id', bidId)

    if (error) {
      toast.error('Failed to delete campaign')
      return
    }

    setBids((prev) => prev.filter((b) => b.id !== bidId))
    toast.success('Campaign deleted')
  }

  const handleCreateBid = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    const keyword = form.keyword.trim().toLowerCase()
    const bidAmount = parseInt(form.bidAmount, 10)
    const productId = form.productId || null

    if (!keyword) {
      toast.error('Keyword cannot be empty')
      return
    }

    if (isNaN(bidAmount) || bidAmount < 1) {
      toast.error('Bid amount must be at least 1 credit')
      return
    }

    // Check if the pharmacy has enough credits to support at least 1 click
    const balance = profile.credits ?? 0
    if (balance < bidAmount) {
      toast.error(`Insufficient credits. You currently have ${balance} credits, but the bid is ${bidAmount}.`)
      return
    }

    // Check for client-side duplicate bids (same product and keyword)
    const exists = bids.some(
      (b) => b.keyword === keyword && b.product_id === productId
    )
    if (exists) {
      toast.error('You already have a campaign for this keyword and product combination')
      return
    }

    setSaving(true)

    const { data, error } = await supabase
      .from('keyword_bids')
      .insert({
        pharmacy_id: profile.id,
        product_id: productId,
        keyword,
        bid_amount: bidAmount,
        is_active: true,
      } as any)
      .select('*, product:products(name)')
      .single()

    if (error) {
      toast.error('Failed to create campaign. Please try again.')
      setSaving(false)
      return
    }

    setBids((prev) => [data as BidWithProduct, ...prev])
    toast.success('Keyword campaign launched successfully!')
    
    // Refresh profile to fetch any real-time balance if updated, though it remains same on insert
    setForm({ ...EMPTY_FORM })
    setShowModal(false)
    setSaving(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
    </div>
  )

  const activeBidsCount = bids.filter((b) => b.is_active).length
  const totalAdSpend = transactions
    .filter((t) => t.type === 'click_charge')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0)

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1050px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/dashboard')} className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: 0 }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Megaphone color="var(--primary)" /> Ad Campaigns
          </h1>
          <p style={{ color: 'var(--muted)' }}>Promote your products at the top of local search results using keywords.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} /> Launch Campaign
        </button>
      </div>

      {/* Warning if credits are low */}
      {profile && (profile.credits ?? 0) <= 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '2rem' }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ display: 'block', fontSize: '0.95rem' }}>Your Ads are Paused!</strong>
            <span style={{ fontSize: '0.85rem' }}>Your marketing credit balance is 0. Purchase credits to reactivate your campaigns.</span>
          </div>
          <Link href="/dashboard/credits" className="btn btn-sm" style={{ marginLeft: 'auto', background: '#991b1b', color: '#fff', border: 'none' }}>Buy Credits</Link>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <span style={{ color: 'var(--muted)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Credit Budget</span>
              <p style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>{profile?.credits || 0}</p>
            </div>
            <div style={{ background: 'var(--green-50)', padding: '0.75rem', borderRadius: '8px' }}>
              <Coins size={24} color="var(--primary)" />
            </div>
          </div>
          <Link href="/dashboard/credits" className="btn btn-outline btn-sm" style={{ width: '100%', textAlign: 'center' }}>Top Up Balance</Link>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <span style={{ color: 'var(--muted)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Active Keywords</span>
              <p style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text)', marginTop: '0.25rem' }}>{activeBidsCount}</p>
            </div>
            <div style={{ background: 'var(--green-50)', padding: '0.75rem', borderRadius: '8px' }}>
              <Zap size={24} color="var(--primary)" />
            </div>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: 0 }}>Total campaigns listed: {bids.length}</p>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <span style={{ color: 'var(--muted)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Total Ad Cost</span>
              <p style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text)', marginTop: '0.25rem' }}>{totalAdSpend} <span style={{ fontSize: '1rem', color: 'var(--muted)', fontWeight: 500 }}>Credits</span></p>
            </div>
            <div style={{ background: 'var(--green-50)', padding: '0.75rem', borderRadius: '8px' }}>
              <Megaphone size={24} color="var(--primary)" />
            </div>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: 0 }}>Deducted via Pay-Per-Click billing</p>
        </div>
      </div>

      {/* Campaigns Listing */}
      <h2 style={{ marginBottom: '1.25rem' }}>Active Keyword Bids</h2>
      {bids.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: '3rem' }}>
          <Megaphone size={48} color="var(--muted)" />
          <h3>No campaigns running</h3>
          <p style={{ maxWidth: '460px', margin: '0.5rem auto 1.5rem' }}>Launch your first sponsored keyword ad to push your products to the top when customers search for specific wellness terms.</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">Create Your First Ad</button>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto', marginBottom: '3rem' }}>
          <table className="table" style={{ minWidth: '700px' }}>
            <thead>
              <tr>
                <th>Target Product</th>
                <th>Search Keyword</th>
                <th>Bid Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bids.map((bid) => {
                const isOutOfCredits = (profile?.credits ?? 0) <= 0
                return (
                  <tr key={bid.id}>
                    <td style={{ fontWeight: 600 }}>
                      {bid.product_id ? (
                        <span>{bid.product?.name || 'Loading product...'}</span>
                      ) : (
                        <span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>Store-wide (All Products)</span>
                      )}
                    </td>
                    <td>
                      <code style={{ background: 'var(--green-50)', color: 'var(--primary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                        {bid.keyword}
                      </code>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {bid.bid_amount} Credits <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '0.8rem' }}>/ click</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button 
                          onClick={() => handleToggleActive(bid.id, bid.is_active)}
                          className={`btn btn-sm ${bid.is_active && !isOutOfCredits ? 'btn-primary' : 'btn-outline'}`}
                          style={{
                            padding: '0.25rem 0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            background: bid.is_active && !isOutOfCredits ? 'var(--primary)' : 'transparent',
                            color: bid.is_active && !isOutOfCredits ? '#fff' : 'var(--muted)'
                          }}
                          disabled={isOutOfCredits}
                        >
                          {bid.is_active && !isOutOfCredits ? (
                            <>
                              <Play size={10} fill="currentColor" /> Active
                            </>
                          ) : (
                            <>
                              <Pause size={10} fill="currentColor" /> Paused
                            </>
                          )}
                        </button>
                        {isOutOfCredits && bid.is_active && (
                          <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>(Inactive - Insufficient Credits)</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button 
                        onClick={() => handleDeleteBid(bid.id)} 
                        className="btn btn-ghost btn-sm" 
                        style={{ color: '#dc2626', padding: '0.25rem' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Activity Log */}
      <h2 style={{ marginBottom: '1.25rem' }}>Recent Performance & Activity</h2>
      <div className="card" style={{ padding: '1.5rem' }}>
        {transactions.filter((t) => t.type === 'click_charge').length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--muted)' }}>
            <ClipboardList size={32} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>No clicks recorded yet. Once users click on your sponsored ads, the charges will be logged here.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: '600px' }}>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Details</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions
                  .filter((t) => t.type === 'click_charge')
                  .slice(0, 10)
                  .map((t) => (
                    <tr key={t.id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none' }}>
                        <CheckCircle2 size={16} color="var(--primary)" />
                        <span style={{ fontWeight: 600 }}>Sponsored Click</span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {t.description || 'PPC Click charge'}
                      </td>
                      <td style={{ fontWeight: 700, color: '#dc2626' }}>
                        {t.amount} Credits
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '2px solid var(--border)' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Megaphone size={20} color="var(--primary)" /> New Keyword Campaign</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateBid} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="label" htmlFor="b-product">Select Target Product <span style={{ color: '#dc2626' }}>*</span></label>
                <select 
                  id="b-product" 
                  className="input" 
                  value={form.productId} 
                  onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                >
                  <option value="">Store-wide (Promotes All Matches)</option>
                  {products
                    .filter((p) => p.is_available)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.price.toFixed(2)} DZD)</option>
                    ))
                  }
                </select>
                <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                  Choose a specific product or keep it "Store-wide" to promote any in-stock product matching the keyword.
                </p>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="b-keyword">Search Keyword <span style={{ color: '#dc2626' }}>*</span></label>
                <input 
                  id="b-keyword" 
                  type="text" 
                  className="input" 
                  value={form.keyword} 
                  onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))} 
                  required 
                  placeholder="e.g. vitamin, skincare, baby" 
                />
                <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                  The ad displays when users search for this term. Keywords are matched case-insensitively.
                </p>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="b-amount">Bid Amount (Credits) <span style={{ color: '#dc2626' }}>*</span></label>
                <input 
                  id="b-amount" 
                  type="number" 
                  className="input" 
                  value={form.bidAmount} 
                  onChange={(e) => setForm((f) => ({ ...f, bidAmount: e.target.value }))} 
                  required 
                  min="1" 
                  step="1" 
                  placeholder="e.g. 5" 
                />
                <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                  1 Credit = 1 Click. Higher bids increase your product's chances of winning the Sponsored Slots at the top of search.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '2px solid var(--border)' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : 'Launch Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
