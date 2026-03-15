'use client'

export default function Header({ title, subtitle, rightContent, onMenuClick }) {
  return (
    <header
      className="sticky top-0 z-20 glass-strong border-b-0 shadow-sm shadow-black/[0.03]"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 relative">
        <button
          onClick={onMenuClick}
          className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 active:bg-white/40 -ml-1 z-10 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <h1 className="text-[17px] font-bold leading-tight tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-slate-500 text-[11px] font-medium mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1 z-10">
          {rightContent}
        </div>
      </div>
    </header>
  )
}
