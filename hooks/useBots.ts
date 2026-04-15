import useSWR from 'swr';

export interface BotSummary {
  id: string;
  name: string;
  isActive: boolean;
  autoReply: boolean;
  account: {
    platform: string;
    pageName: string;
    pictureUrl: string | null;
  };
}

interface BotsResponse {
  bots: BotSummary[];
}

async function fetchBots(url: string): Promise<BotsResponse> {
  const res = await fetch(url);
  return res.json() as Promise<BotsResponse>;
}

export function useBots() {
  const { data, error, isLoading, mutate } = useSWR<BotsResponse>(
    '/api/bots',
    fetchBots,
    { refreshInterval: 30_000 }
  );

  return {
    bots: data?.bots ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
