import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  distDir: process.env.VERCEL ? undefined : '.next-dev',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'huhmvtjpzuwugzdgnjig.supabase.co' },
      { protocol: 'https', hostname: 'unpkg.com' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
    ],
  },
  // Allow Leaflet's CSS to be imported in client components
  transpilePackages: ['leaflet', 'react-leaflet'],
}

export default nextConfig
