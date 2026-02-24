'use client'

import { useEffect } from 'react'

export default function Toast({ message, isVisible, onDismiss }) {
  useEffect(() => {
    if (!isVisible) return
    const timer = setTimeout(() => onDismiss(), 2500)
    return () => clearTimeout(timer)
  }, [isVisible, onDismiss])

  if (!isVisible) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-50 text-sm">
      {message}
    </div>
  )
}
