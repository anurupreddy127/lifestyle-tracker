import { Inter } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/BottomNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Lifestyle Tracker',
  description: 'Personal gym and finance tracker',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#020617" />
      </head>
      <body className="bg-slate-950 text-slate-50 select-none overscroll-none">
        <div
          className="min-h-screen pb-20"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  )
}
