import useSWR from 'swr';

export interface CommentSummary {
  id: string;
  originalText: string;
  authorName: string | null;
  action: string;
  platform: string;
  aiReply: string | null;
  createdAt: string;
  bot: {
    name: string;
    account: { pageName: string };
  };
}

interface CommentsResponse {
  comments: CommentSummary[];
  total: number;
  page: number;
  totalPages: number;
}

interface UseCommentsOptions {
  botId?: string;
  action?: string;
  platform?: string;
  search?: string;
  page?: number;
}

async function fetchComments(url: string): Promise<CommentsResponse> {
  const res = await fetch(url);
  return res.json() as Promise<CommentsResponse>;
}

export function useComments(options: UseCommentsOptions = {}) {
  const params = new URLSearchParams();
  if (options.botId) params.set('botId', options.botId);
  if (options.action) params.set('action', options.action);
  if (options.platform) params.set('platform', options.platform);
  if (options.search) params.set('search', options.search);
  if (options.page) params.set('page', String(options.page));

  const key = `/api/comments?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<CommentsResponse>(
    key,
    fetchComments,
    { refreshInterval: 15_000 }
  );

  return {
    comments: data?.comments ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    isLoading,
    isError: !!error,
    mutate,
  };
}
