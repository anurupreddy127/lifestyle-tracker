export default function Card({ children, className = '', onClick }) {
  return (
    <div
      className={`bg-bg-card rounded-2xl p-4 border border-border ${onClick ? 'active:bg-white/5 cursor-pointer transition-colors' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
