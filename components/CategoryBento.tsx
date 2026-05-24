'use client'

import { useState } from 'react'
import Link from 'next/link'
import { HeartPulse, Baby, Dumbbell, Sun, Pill, ShieldAlert, Sparkles, Smile, Droplets, BicepsFlexed, Flame } from 'lucide-react'

const categoriesData = [
  {
    id: 'sante-beaute',
    title: 'Santé et beauté',
    icon: <HeartPulse size={32} />,
    color: '#ec4899', // Pink
    bgLight: '#fce7f3',
    subcategories: [
      { name: 'Protection solaire', icon: <Sun size={18} /> },
      { name: 'Vitamine & complément', icon: <Pill size={18} /> },
      { name: 'Hygiène intime', icon: <ShieldAlert size={18} /> },
      { name: 'Soins (Cheveux, Visage, Dents, Corps)', icon: <Sparkles size={18} /> },
    ]
  },
  {
    id: 'bebe',
    title: 'Bébé',
    icon: <Baby size={32} />,
    color: '#06b6d4', // Cyan
    bgLight: '#cffafe',
    subcategories: [
      { name: 'Soins bébé', icon: <Smile size={18} /> },
      { name: 'Cosmétique Bébé (Couches, lingettes)', icon: <Droplets size={18} /> },
    ]
  },
  {
    id: 'sport',
    title: 'Complément alimentaire (Sport)',
    icon: <Dumbbell size={32} />,
    color: '#f59e0b', // Amber
    bgLight: '#fef3c7',
    subcategories: [
      { name: 'Protéines Whey', icon: <BicepsFlexed size={18} /> },
      { name: 'Mass Grainer', icon: <BicepsFlexed size={18} /> },
      { name: 'Fast Burner', icon: <Flame size={18} /> },
      { name: 'BCAA', icon: <Pill size={18} /> },
      { name: 'Créatine', icon: <Pill size={18} /> },
      { name: 'Pré workout', icon: <Flame size={18} /> },
      { name: 'Vitamine', icon: <Pill size={18} /> },
      { name: 'Acide Aminé', icon: <Sparkles size={18} /> },
    ]
  }
]

export default function CategoryBento() {
  const [hoveredCat, setHoveredCat] = useState<string | null>(null)

  return (
    <div style={{ marginBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Parcourir nos catégories</h2>
        <p style={{ color: 'var(--muted)' }}>Trouvez rapidement ce que vous cherchez parmi notre sélection.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {categoriesData.map((cat) => {
          const isHovered = hoveredCat === cat.id;

          return (
            <div 
              key={cat.id}
              className="card"
              onMouseEnter={() => setHoveredCat(cat.id)}
              onMouseLeave={() => setHoveredCat(null)}
              style={{
                padding: '2rem',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                background: isHovered ? cat.bgLight : '#fff',
                borderColor: isHovered ? cat.color : 'var(--border)',
                transform: isHovered ? 'translateY(-4px)' : 'none',
                boxShadow: isHovered ? `0 10px 25px -5px ${cat.color}20, 0 8px 10px -6px ${cat.color}20` : '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', zIndex: 2 }}>
                <div style={{ 
                  width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isHovered ? cat.color : cat.bgLight,
                  color: isHovered ? '#fff' : cat.color,
                  transition: 'all 0.3s ease'
                }}>
                  {cat.icon}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.2 }}>{cat.title}</h3>
              </div>

              <div style={{ 
                display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', zIndex: 2,
                opacity: isHovered ? 1 : 0.7,
                transition: 'opacity 0.3s ease'
              }}>
                {cat.subcategories.map((sub, i) => (
                  <Link 
                    key={i} 
                    href={`/search?q=${encodeURIComponent(sub.name)}`}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)',
                      color: 'var(--text)', textDecoration: 'none',
                      transition: 'all 0.2s ease',
                      border: '1px solid rgba(0,0,0,0.05)',
                      transform: isHovered ? 'translateX(0)' : 'translateX(-10px)',
                      opacity: isHovered ? 1 : 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = cat.color;
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
                      e.currentTarget.style.borderColor = 'rgba(0,0,0,0.05)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <span style={{ color: cat.color }}>{sub.icon}</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{sub.name}</span>
                  </Link>
                ))}
              </div>
              
              {/* Background decorative blob */}
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-50%',
                width: '100%',
                height: '100%',
                background: `radial-gradient(circle, ${cat.color}15 0%, transparent 70%)`,
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.5s ease',
                pointerEvents: 'none',
                zIndex: 0
              }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
