'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { AccountListItem } from '@/components/accounts/AccountListItem';
import { ConnectAccountCard } from '@/components/accounts/ConnectAccountCard';
import { Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Account {
  id: string;
  platform: 'FACEBOOK' | 'INSTAGRAM';
  pageName: string;
  pageId: string;
  pictureUrl: string | null;
  connectedAt: string;
  tokenExpiresAt: string | null;
  isActive: boolean;
}

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Acceso denegado. No se conectaron las cuentas.',
  missing_params: 'Error en el proceso de conexión.',
  invalid_state: 'Error de seguridad. Inténtalo de nuevo.',
  token_exchange: 'Error al obtener el token de Facebook.',
  server_config: 'Error de configuración del servidor.',
  unexpected: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
};

export function AccountsClient({ initialAccounts }: { initialAccounts: Account[] }) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      toast.success('Cuentas conectadas exitosamente');
      router.replace('/accounts');
    } else if (error) {
      const msg = ERROR_MESSAGES[error] ?? 'Error al conectar la cuenta.';
      toast.error(msg);
      router.replace('/accounts');
    }
  }, [searchParams, router]);

  function handleDisconnect(id: string) {
    setAccounts(prev => prev.filter(a => a.id !== id));
  }

  function handleConnected() {
    window.location.reload();
  }

  return (
    <div>
      <PageHeader
        title="Cuentas Conectadas"
        description="Gestiona tus páginas de Facebook y cuentas de Instagram."
        action={<ConnectAccountCard onConnected={handleConnected} />}
      />

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5">
            <LinkIcon className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-2">
            Sin cuentas conectadas
          </h3>
          <p className="text-sm text-slate-500 text-center max-w-xs mb-7">
            Conecta tus páginas de Facebook e Instagram para comenzar a gestionar
            comentarios con IA.
          </p>
          <ConnectAccountCard onConnected={handleConnected} />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Cuenta
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Plataforma
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Conectada
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Estado
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {accounts.map(account => (
                <AccountListItem
                  key={account.id}
                  account={account}
                  onDisconnect={handleDisconnect}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
