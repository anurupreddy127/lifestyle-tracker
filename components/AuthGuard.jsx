'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const PUBLIC_ROUTES = ['/login', '/signup']

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

  useEffect(() => {
    if (loading) return

    if (!user && !isPublicRoute) {
      router.push('/login')
    }

    if (user && isPublicRoute) {
      router.push('/')
    }
  }, [user, loading, isPublicRoute, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user && !isPublicRoute) return null
  if (user && isPublicRoute) return null

  return children
}
