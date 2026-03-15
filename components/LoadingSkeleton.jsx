export default function LoadingSkeleton({ count = 3, height = 'h-20', className = '' }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`bg-white/40 rounded-2xl w-full animate-pulse ${height}`} />
      ))}
    </div>
  )
}
