'use client'

export default function Header({ title, subtitle, rightContent, onMenuClick }) {
  return (
    <header
      className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 relative">
        <button
          onClick={onMenuClick}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 active:bg-slate-100 -ml-1 z-10"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <h1 className="text-lg font-bold leading-tight tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-slate-500 text-xs font-medium mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1 z-10">
          {rightContent}
        </div>
      </div>
    </header>
  )
}
