import { Skeleton } from '@/components/ui/skeleton';

export default function AccountsLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-7 w-32 mb-1" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
