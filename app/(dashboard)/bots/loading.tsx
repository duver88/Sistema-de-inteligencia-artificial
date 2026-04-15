import { Skeleton } from '@/components/ui/skeleton';

export default function BotsLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-7 w-24 mb-1" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
