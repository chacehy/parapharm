import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { ToastProvider } from '@/components/Toast'

export const metadata: Metadata = {
  title: 'ParaPharm — Find Nearby Pharmacies & Supplements',
  description:
    'Discover parapharmacy products at pharmacies near you. Order supplements, vitamins, and wellness products online with cash-on-delivery.',
  keywords: 'pharmacy, supplements, parapharmacy, Algeria, vitamins, wellness',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ToastProvider />
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  )
}
