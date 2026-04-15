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
      params.delete('page');
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-3 mb-5">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar comentarios…"
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
          <SelectValue placeholder="Todos los bots" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos los bots</SelectItem>
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
        <SelectTrigger className="w-48 text-sm">
          <SelectValue placeholder="Todas las acciones" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todas las acciones</SelectItem>
          <SelectItem value="REPLIED">Respondido</SelectItem>
          <SelectItem value="DELETED">Eliminado</SelectItem>
          <SelectItem value="HIDDEN">Oculto</SelectItem>
          <SelectItem value="IGNORED">Ignorado</SelectItem>
          <SelectItem value="MANUAL_REPLY">Resp. Manual</SelectItem>
          <SelectItem value="MANUAL_DELETE">Elim. Manual</SelectItem>
          <SelectItem value="ERROR">Error</SelectItem>
        </SelectContent>
      </Select>

      {/* Platform filter */}
      <Select
        value={searchParams.get('platform') ?? ''}
        onValueChange={v => updateParam('platform', v ?? '')}
      >
        <SelectTrigger className="w-40 text-sm">
          <SelectValue placeholder="Todas las plataformas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todas las plataformas</SelectItem>
          <SelectItem value="FACEBOOK">Facebook</SelectItem>
          <SelectItem value="INSTAGRAM">Instagram</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
