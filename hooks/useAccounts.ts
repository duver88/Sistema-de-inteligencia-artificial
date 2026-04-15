import useSWR from 'swr';

export interface AccountSummary {
  id: string;
  pageId: string;
  pageName: string;
  platform: string;
  pictureUrl: string | null;
  isActive: boolean;
  tokenExpiresAt: string | null;
}

interface AccountsResponse {
  accounts: AccountSummary[];
}

async function fetchAccounts(url: string): Promise<AccountsResponse> {
  const res = await fetch(url);
  return res.json() as Promise<AccountsResponse>;
}

export function useAccounts() {
  const { data, error, isLoading, mutate } = useSWR<AccountsResponse>(
    '/api/accounts',
    fetchAccounts,
    { refreshInterval: 60_000 }
  );

  return {
    accounts: data?.accounts ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
