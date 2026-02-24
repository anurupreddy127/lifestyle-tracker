'use client'

export default function BottomSheet({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-slate-900 border-t border-slate-800 max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mt-3 mb-4" />

        {/* Title */}
        {title && (
          <h2 className="text-lg font-semibold text-slate-50 px-4 mb-4">{title}</h2>
        )}

        {/* Content */}
        <div className="px-4 pb-6">
          {children}
        </div>
      </div>
    </>
  )
}
