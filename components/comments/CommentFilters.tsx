'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

interface Bot {
  id: string;
  name: string;
}

interface CommentFiltersProps {
  bots: Bot[];
}

export function CommentFilters({ bots }: CommentFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page'); // Reset to page 1 on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search comments…"
          defaultValue={searchParams.get('search') ?? undefined}
          onChange={e => updateParam('search', e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      {/* Bot filter */}
      <Select
        value={searchParams.get('botId') ?? ''}
        onValueChange={v => updateParam('botId', v ?? '')}
      >
        <SelectTrigger className="w-44 text-sm">
          <SelectValue placeholder="All bots" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All bots</SelectItem>
          {bots.map(b => (
            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Action filter */}
      <Select
        value={searchParams.get('action') ?? ''}
        onValueChange={v => updateParam('action', v ?? '')}
      >
        <SelectTrigger className="w-44 text-sm">
          <SelectValue placeholder="All actions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All actions</SelectItem>
          <SelectItem value="REPLIED">Replied</SelectItem>
          <SelectItem value="DELETED">Deleted</SelectItem>
          <SelectItem value="HIDDEN">Hidden</SelectItem>
          <SelectItem value="IGNORED">Ignored</SelectItem>
          <SelectItem value="MANUAL_REPLY">Manual Reply</SelectItem>
          <SelectItem value="MANUAL_DELETE">Manual Delete</SelectItem>
          <SelectItem value="ERROR">Error</SelectItem>
        </SelectContent>
      </Select>

      {/* Platform filter */}
      <Select
        value={searchParams.get('platform') ?? ''}
        onValueChange={v => updateParam('platform', v ?? '')}
      >
        <SelectTrigger className="w-36 text-sm">
          <SelectValue placeholder="All platforms" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All platforms</SelectItem>
          <SelectItem value="FACEBOOK">Facebook</SelectItem>
          <SelectItem value="INSTAGRAM">Instagram</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
