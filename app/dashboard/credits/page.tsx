import { createClient } from '@/lib/supabase/client';
import { createChargilyCheckout } from '@/lib/chargily';
import { redirect } from 'next/navigation';
import { Shield, Zap, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default async function CreditsPage({ searchParams }: { searchParams: { success?: string, canceled?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  if (profile?.role !== 'pharmacy') {
    redirect('/');
  }

  const handleCheckout = async (formData: FormData) => {
    'use server';
    const amount = Number(formData.get('amount'));
    const credits = Number(formData.get('credits'));
    const pharmacyId = formData.get('pharmacyId') as string;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const checkout = await createChargilyCheckout({
      amount: amount,
      success_url: `${baseUrl}/dashboard/credits?success=true`,
      failure_url: `${baseUrl}/dashboard/credits?canceled=true`,
      metadata: {
        pharmacy_id: pharmacyId,
        credit_amount: credits
      }
    });

    if (checkout.success && checkout.url) {
      redirect(checkout.url);
    } else {
      console.error('Checkout failed', checkout.message);
    }
  };

  const packages = [
    { credits: 500, price: 500, title: 'Starter', desc: 'Perfect for testing out sponsored listings.', icon: <Zap size={24} /> },
    { credits: 1000, price: 1000, title: 'Pro', desc: 'Solid visibility for a mid-sized pharmacy.', icon: <TrendingUp size={24} /> },
    { credits: 5000, price: 4500, title: 'Enterprise (Save 10%)', desc: 'Dominate the local search results.', icon: <Shield size={24} />, popular: true },
  ];

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Marketing Credits</h1>
          <p style={{ color: 'var(--muted)' }}>Purchase credits to sponsor your products in search results.</p>
        </div>
        <Link href="/dashboard" className="btn btn-sm">Back to Dashboard</Link>
      </div>

      {searchParams.success && (
        <div style={{ padding: '1rem', background: 'var(--green-50)', color: 'var(--green-800)', border: '2px solid var(--green-200)', borderRadius: '8px', marginBottom: '2rem' }}>
          <strong>Payment Successful!</strong> Your credits will be added to your account momentarily.
        </div>
      )}

      {searchParams.canceled && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', border: '2px solid #fecaca', borderRadius: '8px', marginBottom: '2rem' }}>
          <strong>Payment Cancelled.</strong> You have not been charged.
        </div>
      )}

      <div className="card" style={{ padding: '2rem', marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '2rem', background: 'linear-gradient(to right, var(--green-50), #fff)' }}>
        <div>
          <h3 style={{ color: 'var(--muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Available Balance</h3>
          <p style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{profile.credits || 0} <span style={{ fontSize: '1rem', color: 'var(--muted)', fontWeight: 500 }}>Credits</span></p>
        </div>
        <div style={{ flex: 1, paddingLeft: '2rem', borderLeft: '2px solid var(--border)' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>How it works</h4>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>1 Credit = 1 Click on your Sponsored Ad. If you bid 5 credits on the keyword "Vitamin C", you will be deducted 5 credits each time a user clicks your product in the sponsored row.</p>
        </div>
      </div>

      <h2 style={{ marginBottom: '1.5rem' }}>Buy Credits</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {packages.map((pkg, i) => (
          <div key={i} className="card" style={{ padding: '2rem', position: 'relative', border: pkg.popular ? '2px solid var(--primary)' : '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
            {pkg.popular && (
              <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: '#fff', padding: '0.25rem 1rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Most Popular</span>
            )}
            <div style={{ color: pkg.popular ? 'var(--primary)' : 'var(--muted)', marginBottom: '1rem' }}>
              {pkg.icon}
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{pkg.title}</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem', minHeight: '40px' }}>{pkg.desc}</p>
            
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>
                {pkg.credits} <span style={{ fontSize: '1rem', color: 'var(--muted)', fontWeight: 500 }}>Credits</span>
              </p>
              <p style={{ color: 'var(--muted)', fontWeight: 600 }}>for {pkg.price} DZD</p>
            </div>

            <form action={handleCheckout}>
              <input type="hidden" name="amount" value={pkg.price} />
              <input type="hidden" name="credits" value={pkg.credits} />
              <input type="hidden" name="pharmacyId" value={user.id} />
              <button type="submit" className={`btn ${pkg.popular ? 'btn-primary' : ''}`} style={{ width: '100%', background: !pkg.popular ? '#f3f4f6' : undefined, color: !pkg.popular ? 'var(--text)' : undefined, border: !pkg.popular ? 'none' : undefined }}>
                Purchase
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
