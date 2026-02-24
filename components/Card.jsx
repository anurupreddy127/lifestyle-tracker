export default function Card({ children, className = '', onClick }) {
  return (
    <div
      className={`bg-slate-900 rounded-xl p-4 border border-slate-800 ${onClick ? 'active:bg-slate-800 cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
