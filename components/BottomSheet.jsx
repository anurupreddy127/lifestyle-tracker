'use client'

import { motion, AnimatePresence } from 'motion/react'

export default function BottomSheet({ isOpen, onClose, title, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35, mass: 0.5 }}
            className="fixed inset-x-0 bottom-0 z-[60] rounded-t-3xl glass-strong shadow-2xl max-h-[85dvh] overflow-y-auto overflow-x-hidden overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch', borderTop: '1px solid rgba(255,255,255,0.4)' }}
          >
            {/* Drag handle */}
            <div className="w-12 h-1.5 bg-slate-300/60 rounded-full mx-auto mt-3 mb-4" />

            {/* Title row */}
            {title && (
              <div className="flex items-center justify-between px-5 mb-4">
                <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-slate-500 cursor-pointer transition-colors hover:bg-white/70"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )}

            {/* Content */}
            <div className="px-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
