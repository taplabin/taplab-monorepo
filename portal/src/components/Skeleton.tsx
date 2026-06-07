export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 dark:bg-gray-800 rounded animate-pulse ${className}`} />;
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-3 animate-pulse">
      <SkeletonLine className="h-3 w-24" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} className={`h-4 ${i === 0 ? 'w-3/4' : 'w-1/2'}`} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="space-y-2">
        <SkeletonLine className="h-6 w-32" />
        <SkeletonLine className="h-3 w-48" />
      </div>
      <SkeletonCard rows={2} />
      <SkeletonCard rows={3} />
      <SkeletonCard rows={2} />
    </div>
  );
}
