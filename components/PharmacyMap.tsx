'use client'
import dynamic from 'next/dynamic'

// Leaflet must be loaded client-side only
const MapInner = dynamic(() => import('./MapInner'), { ssr: false, loading: () => (
  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)', border: '2px solid var(--border)' }}>
    <div className="spinner" />
  </div>
)})

interface Props {
  lat: number
  lng: number
  label?: string
  height?: string
  zoom?: number
}

export function PharmacyMap({ lat, lng, label, height = '300px', zoom = 15 }: Props) {
  return (
    <div style={{ height }}>
      <MapInner lat={lat} lng={lng} label={label} zoom={zoom} />
    </div>
  )
}
