import Link from 'next/link'
import Image from 'next/image'
import {
  Search, MapPin, ShoppingBag, Zap, Shield, Clock,
  Star, ChevronRight, CheckCircle, Leaf, Pill, HeartPulse, Sparkles, Flame
} from 'lucide-react'

/* ─── Static data ────────────────────────────────────────────────── */
const CATEGORIES = [
  { icon: <Leaf size={28} />,       label: 'Vitamines & Minéraux', tag: 'Carences · Immunité · Énergie',    color: '#dcfce7', border: '#4ade80' },
  { icon: <HeartPulse size={28} />, label: 'Cœur & Immunité',      tag: 'Oméga-3 · Magnésium · Antioxydants', color: '#d1fae5', border: '#34d399' },
  { icon: <Pill size={28} />,       label: 'Compléments',           tag: 'Collagène · Probiotiques · Zinc',  color: '#f0fdf4', border: '#86efac' },
  { icon: <Sparkles size={28} />,   label: 'Beauté & Peau',         tag: 'Kératine · Biotine · Anti-âge',    color: '#ecfccb', border: '#a3e635' },
  { icon: <Flame size={28} />,      label: 'Sport & Énergie',       tag: 'Protéines · BCAA · Créatine',      color: '#d1fae5', border: '#4ade80' },
  { icon: <ShoppingBag size={28} />,label: 'Bien-être Général',     tag: 'Sommeil · Stress · Digestion',     color: '#f0fdf4', border: '#86efac' },
]

const TESTIMONIALS = [
  {
    name: 'Amira K.',
    location: 'Alger',
    stars: 5,
    text: 'Trouvé mon Omega-3 en moins de 2 minutes, livré dans l\'heure. Je commande chaque semaine maintenant !',
  },
  {
    name: 'Riad M.',
    location: 'Oran',
    stars: 5,
    text: 'Plus besoin de courir de pharmacie en pharmacie. ParaPharm m\'affiche direct ce qui est disponible près de chez moi.',
  },
  {
    name: 'Meriem N.',
    location: 'Constantine',
    stars: 5,
    text: 'Interface super propre, paiement à la livraison, et mon colis est arrivé en 45 min. Top service !',
  },
]

const FEATURES = [
  {
    icon: <MapPin size={22} />,
    title: 'Géolocalisation Intelligente',
    desc: 'On détecte votre position et on vous affiche les pharmacies les plus proches ayant le produit en stock — en temps réel.',
  },
  {
    icon: <Zap size={22} />,
    title: 'Commande en 30 Secondes',
    desc: 'Recherchez, ajoutez au panier, confirmez. Pas de compte bancaire, pas de prise de tête. Paiement cash à la livraison.',
  },
  {
    icon: <Shield size={22} />,
    title: 'Pharmacies Vérifiées',
    desc: 'Chaque pharmacie sur ParaPharm est vérifiée et agréée. Vos produits de santé sont entre de bonnes mains.',
  },
  {
    icon: <Clock size={22} />,
    title: 'Livraison Ultra-Rapide',
    desc: 'Les pharmacies locales traitent vos commandes en priorité. La plupart sont livrées en moins d\'une heure.',
  },
]

const STEPS = [
  { n: '01', title: 'Recherchez', desc: 'Tapez le nom du produit — vitamines, compléments, soins — et on localise tout ça près de vous.' },
  { n: '02', title: 'Choisissez', desc: 'Comparez les prix et choisissez la pharmacie la plus proche ou la mieux notée.' },
  { n: '03', title: 'Recevez', desc: 'Confirmez en quelques clics. La pharmacie prépare, livre, et vous payez à la porte.' },
]

/* ─── Component ──────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div style={{ overflowX: 'hidden' }}>

      {/* ══════════════════ HERO ══════════════════════════════════════ */}
      <section style={{
        background: 'linear-gradient(150deg, var(--green-50) 0%, #fff 55%)',
        borderBottom: '2px solid var(--border)',
        padding: '0 0 0',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative grid lines */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(var(--green-100) 1px, transparent 1px), linear-gradient(90deg, var(--green-100) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: 0.45,
        }} />

        <div className="container" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          alignItems: 'center',
          minHeight: '520px',
          position: 'relative',
          paddingTop: '3rem',
          paddingBottom: '3rem',
        }}>
          {/* Left — copy */}
          <div className="hero-left">
            {/* Pill badge */}
            <div className="hero-badge" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'var(--green-100)', color: 'var(--green-700)',
              border: '2px solid var(--green-400)',
              fontSize: '0.78rem', fontWeight: 700, padding: '0.3rem 0.85rem',
              letterSpacing: '0.03em', marginBottom: '1.25rem',
              textTransform: 'uppercase',
            }}>
              <span style={{ width: 8, height: 8, background: 'var(--primary)', display: 'inline-block' }} />
              Vos pharmacies proches, en ligne
            </div>

            <h1 style={{ marginBottom: '1.25rem', fontSize: 'clamp(2rem, 5vw, 3.25rem)', lineHeight: 1.1 }}>
              Vos compléments,<br />
              <span style={{ color: 'var(--primary)' }}>livrés en une heure.</span>
            </h1>

            <p style={{ color: 'var(--muted)', fontSize: '1.05rem', marginBottom: '2rem', maxWidth: '480px', lineHeight: 1.7 }}>
              Recherchez vitamines, protéines, et soins parapharmaceutiques dans les pharmacies autour de vous. Commandez en ligne, payez à la livraison.
            </p>

            {/* CTA row */}
            <div className="hero-cta-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
              <Link href="/search" className="btn btn-primary btn-lg" style={{ gap: '0.6rem' }}>
                <Search size={18} /> Trouver un produit
              </Link>
              <Link href="/register" className="btn btn-outline btn-lg">
                Créer un compte gratuit
              </Link>
            </div>

            {/* Trust micro-stats */}
            <div className="hero-stats" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {[
                { val: '500+', label: 'Pharmacies partenaires' },
                { val: '50K+', label: 'Commandes livrées' },
                { val: '4.9★', label: 'Note moyenne' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{s.val}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — hero image + floating card */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            {/* Image wrapper */}
            <div style={{
              border: '2px solid var(--border)',
              background: '#fff',
              overflow: 'hidden',
              boxShadow: '8px 8px 0 var(--green-200)',
              maxWidth: '460px',
              width: '100%',
            }}>
              <Image
                src="/hero-supplements.png"
                alt="Supplements wellness flat-lay"
                width={460}
                height={380}
                style={{ objectFit: 'cover', width: '100%', height: 'auto', display: 'block' }}
                priority
              />
            </div>

            {/* Floating order card */}
            <div style={{
              position: 'absolute', bottom: -20, left: 0,
              background: '#fff',
              border: '2px solid var(--border)',
              boxShadow: '4px 4px 0 var(--green-200)',
              padding: '0.875rem 1.25rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              minWidth: '210px',
            }}>
              <div style={{
                width: 40, height: 40, background: 'var(--green-100)',
                border: '2px solid var(--green-400)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <CheckCircle size={20} color="var(--primary)" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Commande livrée ✓</div>
                <div style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>Omega-3 · Pharmacie Centrale · 48 min</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ QUICK SEARCH BAR ════════════════════════ */}
      <div style={{ borderBottom: '2px solid var(--border)', background: '#fff' }}>
        <div className="container" style={{ padding: '1.5rem 1.5rem' }}>
          <form action="/search" method="get">
            <div style={{ display: 'flex', gap: 0, border: '2px solid var(--border)', overflow: 'hidden' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0 1rem', borderRight: '2px solid var(--border)',
                color: 'var(--muted)',
              }}>
                <Search size={16} />
              </div>
              <input
                name="q"
                className="input"
                placeholder="Rechercher un produit : Vitamine C, Collagène, Whey..."
                style={{ flex: 1, border: 'none', borderRadius: 0 }}
                id="hero-search"
              />
              <button type="submit" className="btn btn-primary" style={{ borderRadius: 0, borderLeft: 'none', padding: '0 1.5rem', fontSize: '0.9rem' }}>
                Rechercher
              </button>
            </div>
          </form>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MapPin size={11} /> Suggestions : Omega-3, Vitamine D, Magnésium, Collagène, Zinc, Protéines
          </p>
        </div>
      </div>

      {/* ══════════════════ CATEGORIES GRID ════════════════════════ */}
      <section style={{ padding: '4rem 0', borderBottom: '2px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              Parcourez par catégorie
            </p>
            <h2 style={{ marginBottom: '0.5rem' }}>Tout ce dont vous avez besoin,<br />au même endroit.</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
            {CATEGORIES.map(cat => (
              <Link
                key={cat.label}
                href={`/search?category=${encodeURIComponent(cat.label)}`}
                style={{
                  background: cat.color,
                  border: `2px solid ${cat.border}`,
                  padding: '1.5rem 1.25rem',
                  display: 'flex', flexDirection: 'column', gap: '0.75rem',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  textDecoration: 'none', color: 'var(--text)',
                }}
                className="category-card"
              >
                <div style={{ color: 'var(--primary)' }}>{cat.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{cat.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{cat.tag}</div>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--primary)', marginTop: 'auto', alignSelf: 'flex-end' }} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ HOW IT WORKS ════════════════════════════ */}
      <section style={{ padding: '4rem 0', borderBottom: '2px solid var(--border)', background: 'var(--green-50)' }}>
        <div className="container">
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              Comment ça marche
            </p>
            <h2>Commander n&apos;a jamais été aussi simple.</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', alignItems: 'stretch' }}>
            {STEPS.map((step, i) => (
              <div key={step.n} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {/* Connector line (not on last) */}
                {i < STEPS.length - 1 && (
                  <div aria-hidden style={{
                    display: 'none', // shown via CSS on desktop
                  }} className="step-connector" />
                )}
                <div className="card" style={{ padding: '2rem 1.5rem', height: '100%' }}>
                  <div style={{
                    fontWeight: 900, fontSize: '2.5rem', lineHeight: 1,
                    color: 'var(--green-200)', marginBottom: '1rem',
                    fontFamily: 'monospace',
                  }}>
                    {step.n}
                  </div>
                  <h3 style={{ marginBottom: '0.6rem' }}>{step.title}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.65 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link href="/search" className="btn btn-primary btn-lg">
              <Search size={18} /> Commencer maintenant — C&apos;est gratuit
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════ FEATURES ════════════════════════════════ */}
      <section style={{ padding: '4rem 0', borderBottom: '2px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              Pourquoi ParaPharm ?
            </p>
            <h2>Conçu pour votre confort.</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {FEATURES.map(f => (
              <div key={f.title} className="card card-hover" style={{ padding: '1.75rem' }}>
                <div style={{
                  width: 48, height: 48,
                  background: 'var(--green-100)', border: '2px solid var(--green-400)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--primary)', marginBottom: '1.25rem',
                }}>
                  {f.icon}
                </div>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>{f.title}</h4>
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ TESTIMONIALS ════════════════════════════ */}
      <section style={{ padding: '4rem 0', borderBottom: '2px solid var(--border)', background: 'var(--surface)' }}>
        <div className="container">
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              Ils nous font confiance
            </p>
            <h2>Des milliers de clients satisfaits.</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="card" style={{ padding: '1.75rem' }}>
                {/* Stars */}
                <div style={{ display: 'flex', gap: '3px', marginBottom: '1rem' }}>
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={15} fill="var(--primary)" color="var(--primary)" />
                  ))}
                </div>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--gray-800)', marginBottom: '1.25rem', fontStyle: 'italic' }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Avatar initials */}
                  <div style={{
                    width: 38, height: 38,
                    background: 'var(--green-100)', border: '2px solid var(--green-400)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.8rem', color: 'var(--primary)',
                    flexShrink: 0,
                  }}>
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <MapPin size={10} /> {t.location}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ VALUE STRIP ════════════════════════════ */}
      <div style={{ borderBottom: '2px solid var(--border)', background: 'var(--green-100)' }}>
        <div className="container" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{
            display: 'flex', gap: '2rem', flexWrap: 'wrap',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {[
              { icon: <Shield size={16} />, text: 'Pharmacies agréées uniquement' },
              { icon: <Zap size={16} />, text: 'Livraison en moins d\'une heure' },
              { icon: <ShoppingBag size={16} />, text: 'Paiement à la livraison' },
              { icon: <CheckCircle size={16} />, text: 'Sans inscription obligatoire' },
            ].map(v => (
              <div key={v.text} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--green-800)', fontWeight: 600, fontSize: '0.85rem' }}>
                {v.icon} {v.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════ FINAL CTA ═══════════════════════════════ */}
      <section style={{ padding: '5rem 0', background: 'var(--primary)', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative grid */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        <div className="container" style={{ textAlign: 'center', position: 'relative' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
            Prêt à commencer ?
          </p>
          <h2 style={{ color: '#fff', marginBottom: '1rem', fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
            Vos compléments, en quelques clics.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '2.5rem', fontSize: '1.05rem', maxWidth: '480px', margin: '0 auto 2.5rem' }}>
            Rejoignez plus de 50 000 personnes qui commandent leurs produits de santé facilement, rapidement, et en toute confiance.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/search" className="btn btn-lg" style={{ background: '#fff', color: 'var(--primary)', border: '2px solid #fff', fontWeight: 700 }}>
              <Search size={18} /> Trouver un produit
            </Link>
            <Link href="/register" className="btn btn-lg" style={{ background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,0.6)' }}>
              Créer un compte
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════ FOOTER ══════════════════════════════════ */}
      <footer style={{ borderTop: '2px solid var(--border)', padding: '2.5rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>
            {/* Brand */}
            <div>
              <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>◼ ParaPharm</div>
              <p style={{ fontSize: '0.825rem', color: 'var(--muted)', maxWidth: '220px', lineHeight: 1.6 }}>
                Votre pharmacie de quartier, accessible en ligne.
              </p>
            </div>

            {/* Links */}
            {[
              { heading: 'Produits', links: [['Vitamines', '/search'], ['Compléments', '/search'], ['Soins', '/search']] },
              { heading: 'Compte', links: [['Se connecter', '/login'], ['S\'inscrire', '/register'], ['Mes commandes', '/orders']] },
              { heading: 'Légal', links: [['CGU', '#'], ['Confidentialité', '#'], ['Contact', '#']] },
            ].map(col => (
              <div key={col.heading}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-700)', marginBottom: '0.75rem' }}>
                  {col.heading}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {col.links.map(([label, href]) => (
                    <Link key={label} href={href} style={{ fontSize: '0.85rem', color: 'var(--muted)', transition: 'color 0.15s' }}
                      className="footer-link">{label}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '2px solid var(--border)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>© {new Date().getFullYear()} ParaPharm. Tous droits réservés.</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Fait avec ♥ en Algérie</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
