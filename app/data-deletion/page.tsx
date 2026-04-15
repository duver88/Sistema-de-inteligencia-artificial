import type { Metadata } from 'next';
import { Trash2, Mail, LogOut, Clock, CheckCircle, ShieldCheck } from 'lucide-react';
import { LionsCoreIcon } from '@/components/icons/LionsCoreIcon';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Eliminación de Datos — LionsCore',
  description: 'Cómo solicitar la eliminación de tus datos personales en LionsCore.',
};

const LAST_UPDATED = '15 de abril de 2026';
const DOMAIN = 'sia.lionscore.ai';
const CONTACT_EMAIL = 'hernesto.ariza@lionsagencia.com';

export default function DataDeletionPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #021130 0%, #032040 50%, #021130 100%)' }}
    >
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <LionsCoreIcon size={30} />
            <div className="flex items-baseline gap-0.5">
              <span className="text-white font-bold text-xl">Lionscore</span>
              <span className="text-sm font-semibold" style={{ color: '#12fdee' }}>ai</span>
            </div>
          </Link>
          <span className="text-slate-400 text-sm">Última actualización: {LAST_UPDATED}</span>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-10 text-center">
        <div
          className="inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-6"
          style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)' }}
        >
          <Trash2 className="h-8 w-8" style={{ color: '#0a1628' }} />
        </div>
        <h1 className="text-4xl font-black text-white mb-4">Eliminación de Datos</h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Tienes derecho a solicitar la eliminación de todos tus datos personales de LionsCore
          en cualquier momento. Aquí te explicamos cómo hacerlo.
        </p>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 pb-20 space-y-6">

        {/* Qué datos tenemos */}
        <Section icon={<ShieldCheck className="h-5 w-5 text-cyan-400" />} title="Datos que almacenamos sobre ti">
          <p>LionsCore puede tener almacenados los siguientes datos asociados a tu cuenta:</p>
          <ul className="mt-3 space-y-2">
            <Item>Nombre y foto de perfil de Facebook.</Item>
            <Item>Correo electrónico (si fue compartido mediante Facebook Login).</Item>
            <Item>ID y tokens de acceso de tus páginas de Facebook e Instagram conectadas (almacenados cifrados).</Item>
            <Item>Configuración de tus bots de moderación, reglas y base de conocimiento.</Item>
            <Item>Historial de comentarios procesados por la plataforma.</Item>
            <Item>Preferencias y ajustes de tu cuenta (por ejemplo, API key de OpenAI si la configuraste).</Item>
          </ul>
        </Section>

        {/* Opción 1 — Desde la app */}
        <div className="bg-white/5 border border-cyan-500/30 rounded-2xl p-7 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
              <LogOut className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Opción 1 — Desconectar tus cuentas desde la app</h2>
              <p className="text-slate-400 text-xs mt-0.5">Rápido · Sin necesidad de contactarnos</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            Si solo quieres retirar el acceso de LionsCore a tus páginas de Facebook e Instagram,
            puedes hacerlo directamente desde la plataforma:
          </p>
          <ol className="space-y-3">
            {[
              'Inicia sesión en LionsCore en ' + DOMAIN,
              'Ve a la sección "Cuentas" en el menú lateral.',
              'Haz clic en el botón de desconectar junto a cada página que desees retirar.',
              'LionsCore dejará de tener acceso a esa página de inmediato.',
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-slate-300 text-sm">
                <span
                  className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }}
                >
                  {i + 1}
                </span>
                <span className="mt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5">
            <Link
              href="/accounts"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
              style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }}
            >
              <LogOut className="h-4 w-4" />
              Ir a Cuentas
            </Link>
          </div>
        </div>

        {/* Opción 2 — Por email */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Opción 2 — Solicitar eliminación completa por correo</h2>
              <p className="text-slate-400 text-xs mt-0.5">Elimina todos tus datos del servidor</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-5">
            Para eliminar permanentemente toda la información asociada a tu cuenta (perfil, páginas, historial,
            configuración de bots y base de conocimiento), envíanos un correo con los siguientes datos:
          </p>

          <div className="bg-slate-900/60 rounded-xl p-5 space-y-3 text-sm font-mono">
            <div>
              <span className="text-slate-500">Para: </span>
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-cyan-400 hover:text-cyan-300">
                {CONTACT_EMAIL}
              </a>
            </div>
            <div>
              <span className="text-slate-500">Asunto: </span>
              <span className="text-white">Solicitud de eliminación de datos — LionsCore</span>
            </div>
            <div>
              <span className="text-slate-500">Incluye: </span>
              <span className="text-slate-300">Tu nombre y el correo o ID de Facebook asociado a tu cuenta</span>
            </div>
          </div>

          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20datos%20%E2%80%94%20LionsCore&body=Hola%2C%0A%0ASolicito%20la%20eliminaci%C3%B3n%20completa%20de%20mis%20datos%20en%20LionsCore.%0A%0ANombre%3A%20%0ACorreo%2FID%20de%20Facebook%3A%20%0A%0AGracias.`}
            className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
            style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }}
          >
            <Mail className="h-4 w-4" />
            Enviar solicitud por correo
          </a>
        </div>

        {/* Plazos */}
        <Section icon={<Clock className="h-5 w-5 text-cyan-400" />} title="Plazos de respuesta">
          <ul className="space-y-2">
            <Item>Confirmaremos la recepción de tu solicitud en un plazo de <strong className="text-white">48 horas hábiles</strong>.</Item>
            <Item>La eliminación completa de tus datos se realizará en un plazo máximo de <strong className="text-white">7 días hábiles</strong> desde la confirmación.</Item>
            <Item>Recibirás un correo de confirmación una vez que tus datos hayan sido eliminados.</Item>
          </ul>
        </Section>

        {/* Qué se elimina */}
        <Section icon={<CheckCircle className="h-5 w-5 text-cyan-400" />} title="Qué se elimina al procesar tu solicitud">
          <ul className="space-y-2">
            <Item>Tu perfil de usuario y datos de sesión.</Item>
            <Item>Todas las páginas de Facebook e Instagram conectadas y sus tokens de acceso.</Item>
            <Item>La configuración de todos tus bots de moderación.</Item>
            <Item>Tu base de conocimiento y reglas de moderación.</Item>
            <Item>El historial de comentarios procesados por la plataforma.</Item>
            <Item>Cualquier otra información personal asociada a tu cuenta.</Item>
          </ul>
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-300 text-xs">
              <strong>Nota:</strong> Esta acción es irreversible. Una vez eliminados, tus datos no pueden recuperarse.
              Si en el futuro deseas volver a usar LionsCore, deberás crear una cuenta nueva.
            </p>
          </div>
        </Section>

        {/* Revocar en Facebook */}
        <Section icon={<ShieldCheck className="h-5 w-5 text-cyan-400" />} title="Revocar permisos directamente en Facebook">
          <p>
            También puedes revocar el acceso de LionsCore a tu cuenta de Facebook directamente desde
            la configuración de Meta, sin necesidad de contactarnos:
          </p>
          <ol className="mt-3 space-y-2">
            <Item>
              Ve a{' '}
              <a
                href="https://www.facebook.com/settings?tab=applications"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Facebook → Configuración → Aplicaciones y sitios web
              </a>
            </Item>
            <Item>Busca "LionsCore" en la lista de aplicaciones conectadas.</Item>
            <Item>Haz clic en "Eliminar" para revocar todos los permisos.</Item>
          </ol>
          <p className="mt-3 text-slate-400 text-xs">
            Si además quieres que eliminemos los datos almacenados en nuestros servidores, usa la Opción 2 de arriba.
          </p>
        </Section>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 text-center space-y-3">
          <div className="flex items-center justify-center gap-6 text-sm">
            <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 transition-colors">Política de Privacidad</Link>
            <Link href="/terms" className="text-cyan-400 hover:text-cyan-300 transition-colors">Términos de Servicio</Link>
          </div>
          <p className="text-slate-500 text-xs">© {new Date().getFullYear()} LionsCore · {DOMAIN}</p>
        </div>

      </main>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-xl bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      <div className="text-slate-300 text-sm leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 list-none">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
      <span>{children}</span>
    </li>
  );
}
