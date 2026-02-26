export default function Card({ children, className = '', onClick }) {
  return (
    <div
      className={`bg-white rounded-xl p-4 border border-slate-200 shadow-sm ${onClick ? 'active:bg-slate-50 cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
