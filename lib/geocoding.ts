/**
 * Reverse geocodes latitude and longitude coordinates into a human-readable place name
 * using OpenStreetMap Nominatim API.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return ''
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'Accept-Language': 'fr,ar,en',
          'User-Agent': 'ParaPharm-Marketplace-App' // Nominatim requires a user-agent to avoid getting blocked
        }
      }
    )
    if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    const data = await res.json()
    if (!data.address) return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`

    const addr = data.address
    const parts = [
      addr.road || addr.suburb || addr.neighbourhood,
      addr.city || addr.town || addr.village || addr.county,
      addr.state || addr.region
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(', ') : data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch (err) {
    console.error('Error reverse geocoding:', err)
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}
