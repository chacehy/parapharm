'use client'

import { useState, useEffect } from 'react'
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
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)')
    setIsMobile(media.matches)
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  const handleCardClick = (id: string) => {
    if (isMobile) {
      setActiveCat((prev) => (prev === id ? null : id))
    }
  }

  const handleMouseEnter = (id: string) => {
    if (!isMobile) {
      setHoveredCat(id)
    }
  }

  const handleMouseLeave = () => {
    if (!isMobile) {
      setHoveredCat(null)
    }
  }

  return (
    <div style={{ marginBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Parcourir nos catégories</h2>
        <p style={{ color: 'var(--muted)' }}>Trouvez rapidement ce que vous cherchez parmi notre sélection.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {categoriesData.map((cat) => {
          const isExpanded = isMobile ? activeCat === cat.id : hoveredCat === cat.id

          return (
            <div 
              key={cat.id}
              className="card"
              onMouseEnter={() => handleMouseEnter(cat.id)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleCardClick(cat.id)}
              style={{
                padding: '1.5rem',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.75s cubic-bezier(0.32, 0.72, 0, 1)',
                cursor: 'pointer',
                background: '#fff',
                borderColor: isExpanded ? cat.color : 'var(--green-200)',
                transform: isExpanded ? 'translateY(-6px)' : 'none',
                boxShadow: isExpanded 
                  ? `0 20px 40px -10px ${cat.color}20, 0 15px 20px -12px ${cat.color}15`
                  : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                minHeight: '112px'
              }}
            >
              {/* Card Header */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                marginBottom: isExpanded ? '1.25rem' : '0px', 
                zIndex: 2,
                transition: 'margin-bottom 0.75s cubic-bezier(0.32, 0.72, 0, 1)'
              }}>
                {/* Double-Bezel nested core for icon */}
                <div style={{ 
                  width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isExpanded ? cat.color : 'var(--green-50)',
                  color: isExpanded ? '#fff' : 'var(--primary)',
                  transform: isExpanded ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.5s cubic-bezier(0.32, 0.72, 0, 1)'
                }}>
                  {cat.icon}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.2, color: 'var(--text)' }}>{cat.title}</h3>
              </div>

              {/* Subcategories list wrapper (Smooth Fold/Expansion) */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr', 
                gap: '0.5rem', 
                zIndex: 2,
                maxHeight: isExpanded ? `${cat.subcategories.length * 48 + 30}px` : '0px',
                opacity: isExpanded ? 1 : 0,
                overflow: 'hidden',
                transition: 'all 0.75s cubic-bezier(0.32, 0.72, 0, 1)',
                marginTop: isExpanded ? '0.25rem' : '0px',
                padding: '4px 12px 4px 4px'
              }}>
                {cat.subcategories.map((sub, i) => (
                  <Link 
                    key={i} 
                    href={`/search?q=${encodeURIComponent(sub.name)}`}
                    className="bento-subcat-link"
                    onClick={(e) => e.stopPropagation()}
                    style={{ 
                      '--hover-color': cat.color,
                      transform: isExpanded ? 'translateX(0)' : 'translateX(-12px)',
                      opacity: isExpanded ? 1 : 0
                    } as React.CSSProperties}
                  >
                    <span className="subcat-icon">{sub.icon}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{sub.name}</span>
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
                opacity: isExpanded ? 1 : 0,
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
