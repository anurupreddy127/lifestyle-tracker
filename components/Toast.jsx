'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'

export default function Toast({ message, isVisible, onDismiss }) {
  useEffect(() => {
    if (!isVisible) return
    const timer = setTimeout(() => onDismiss(), 2500)
    return () => clearTimeout(timer)
  }, [isVisible, onDismiss])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-4 left-4 right-4 z-50 bg-slate-900 border border-slate-800 rounded-xl p-4 text-white text-sm shadow-lg"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
