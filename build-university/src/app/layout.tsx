import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import CookieConsent from '@/components/ui/CookieConsent'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: 'BuildRight 3D',
  description: 'Interactive 3D residential construction training platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#131313] text-[#e5e2e1] antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#FF8C00] focus:text-[#131313] focus:rounded-lg focus:text-sm focus:font-semibold">
          Skip to main content
        </a>
        {children}
        <CookieConsent />
      </body>
    </html>
  )
}
