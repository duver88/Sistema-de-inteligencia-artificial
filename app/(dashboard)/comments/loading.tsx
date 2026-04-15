import { Skeleton } from '@/components/ui/skeleton';

export default function CommentsLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-7 w-40 mb-1" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex gap-3 mb-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
