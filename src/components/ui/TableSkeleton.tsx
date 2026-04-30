interface TableSkeletonProps {
  rows?: number
  cols?: number
}

export function TableSkeleton({ rows = 5, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="animate-pulse divide-y divide-gray-50">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-5 py-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="flex-1 h-4 bg-gray-200 rounded" />
          ))}
        </div>
      ))}
    </div>
  )
}

