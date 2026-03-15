export default function Card({ children, className = '', onClick }) {
  return (
    <div
      className={`glass rounded-2xl p-4 shadow-sm shadow-black/[0.03] ${onClick ? 'active:bg-white/70 cursor-pointer transition-colors' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
