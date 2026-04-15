import type { Metadata } from 'next';
import { Shield, Eye, Lock, Trash2, Mail, Users, Database } from 'lucide-react';
import { LionsCoreIcon } from '@/components/icons/LionsCoreIcon';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidad — LionsCore',
  description: 'Política de privacidad de LionsCore. Cómo recolectamos, usamos y protegemos tus datos.',
};

const LAST_UPDATED = '15 de abril de 2026';
const CONTACT_EMAIL = 'hernesto.ariza@lionsagencia.com';
const DOMAIN = 'sia.lionscore.ai';

export default function PrivacyPage() {
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
          <Shield className="h-8 w-8" style={{ color: '#0a1628' }} />
        </div>
        <h1 className="text-4xl font-black text-white mb-4">Política de Privacidad</h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          En LionsCore nos tomamos en serio la privacidad de tus datos. Esta política explica
          qué información recolectamos, cómo la usamos y cómo la protegemos.
        </p>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 pb-20 space-y-6">

        {/* Section 1 */}
        <Section icon={<Database className="h-5 w-5 text-cyan-400" />} title="1. Datos que recolectamos">
          <p>Al usar LionsCore, recolectamos la siguiente información:</p>
          <ul className="mt-3 space-y-2">
            <Item>
              <strong>Datos de perfil de Facebook:</strong> nombre y foto de perfil, necesarios para identificar tu cuenta.
            </Item>
            <Item>
              <strong>Correo electrónico</strong> (si lo compartes a través de Facebook): usado únicamente para comunicaciones de la plataforma.
            </Item>
            <Item>
              <strong>Páginas de Facebook e Instagram:</strong> nombre, ID, foto e imagen de las páginas que eliges conectar a LionsCore.
            </Item>
            <Item>
              <strong>Tokens de acceso de páginas:</strong> credenciales cifradas que nos permiten leer y gestionar comentarios en tu nombre. Nunca se exponen en texto plano.
            </Item>
            <Item>
              <strong>Comentarios de tus publicaciones:</strong> el texto de los comentarios que reciben tus páginas, procesado en tiempo real para aplicar las reglas de moderación que tú configures.
            </Item>
            <Item>
              <strong>Configuración de la plataforma:</strong> reglas de moderación, base de conocimiento, instrucciones para el bot y preferencias de tu cuenta.
            </Item>
          </ul>
        </Section>

        {/* Section 2 */}
        <Section icon={<Eye className="h-5 w-5 text-cyan-400" />} title="2. Para qué usamos tus datos">
          <p>Utilizamos la información recolectada exclusivamente para:</p>
          <ul className="mt-3 space-y-2">
            <Item>Autenticar tu sesión y mantener tu cuenta activa en la plataforma.</Item>
            <Item>Conectar y sincronizar tus páginas de Facebook e Instagram para gestionarlas desde LionsCore.</Item>
            <Item>Procesar los comentarios de tus páginas mediante inteligencia artificial, aplicando las reglas y configuraciones que tú defines.</Item>
            <Item>Responder, ocultar o eliminar comentarios automáticamente según tus instrucciones.</Item>
            <Item>Mostrarte el historial y estadísticas de comentarios moderados en tu dashboard.</Item>
            <Item>Enviarte notificaciones relevantes sobre el funcionamiento del servicio.</Item>
          </ul>
          <p className="mt-4 text-slate-400 text-sm">
            Nunca usamos tus datos para fines distintos a los descritos sin tu consentimiento explícito.
          </p>
        </Section>

        {/* Section 3 */}
        <Section icon={<Lock className="h-5 w-5 text-cyan-400" />} title="3. Cómo protegemos tus datos">
          <ul className="space-y-2">
            <Item>
              <strong>Cifrado en reposo:</strong> todos los tokens de acceso se almacenan cifrados con AES-256-GCM. Nunca se guardan en texto plano en la base de datos.
            </Item>
            <Item>
              <strong>Cifrado en tránsito:</strong> toda la comunicación entre tu navegador y nuestros servidores usa HTTPS con TLS.
            </Item>
            <Item>
              <strong>Acceso limitado:</strong> solo el personal técnico estrictamente necesario tiene acceso a los sistemas de producción.
            </Item>
            <Item>
              <strong>Infraestructura segura:</strong> la aplicación corre en servidores con firewall configurado, acceso SSH por clave y certificados SSL gestionados por Let's Encrypt.
            </Item>
            <Item>
              <strong>Tokens de corta duración:</strong> los tokens de usuario de Facebook se intercambian por tokens de larga duración (60 días) y se renuevan automáticamente al reconectar.
            </Item>
          </ul>
        </Section>

        {/* Section 4 */}
        <Section icon={<Users className="h-5 w-5 text-cyan-400" />} title="4. Compartición de datos con terceros">
          <p>
            <strong className="text-white">No vendemos, alquilamos ni compartimos tus datos personales con terceros</strong> con fines comerciales o publicitarios.
          </p>
          <p className="mt-3">Únicamente compartimos información con:</p>
          <ul className="mt-3 space-y-2">
            <Item>
              <strong>Meta (Facebook/Instagram):</strong> para ejecutar las acciones de moderación (responder, ocultar, eliminar comentarios) a través de su API oficial, usando los permisos que tú otorgaste.
            </Item>
            <Item>
              <strong>OpenAI:</strong> el texto de los comentarios se envía a la API de OpenAI para clasificación y generación de respuestas. Puedes usar tu propia API key configurada en Ajustes. OpenAI procesa los datos bajo su propia política de privacidad.
            </Item>
          </ul>
          <p className="mt-4 text-slate-400 text-sm">
            Ningún otro tercero tiene acceso a tus datos. No usamos herramientas de analítica de terceros que recolecten datos personales.
          </p>
        </Section>

        {/* Section 5 */}
        <Section icon={<Trash2 className="h-5 w-5 text-cyan-400" />} title="5. Eliminación de tus datos">
          <p>Tienes derecho a solicitar la eliminación completa de tus datos en cualquier momento.</p>
          <ul className="mt-3 space-y-2">
            <Item>
              <strong>Desconectar una página:</strong> desde la sección <em>Cuentas</em> de la app puedes desconectar cualquier página en cualquier momento. Esto revoca el acceso de LionsCore a esa página.
            </Item>
            <Item>
              <strong>Eliminar tu cuenta:</strong> envía un correo a{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-cyan-400 hover:text-cyan-300 underline">
                {CONTACT_EMAIL}
              </a>{' '}
              con el asunto <em>"Eliminar cuenta LionsCore"</em>. Borraremos todos tus datos (perfil, páginas conectadas, tokens, historial de comentarios y configuración del bot) en un plazo máximo de 7 días hábiles.
            </Item>
            <Item>
              <strong>Revocar permisos de Facebook:</strong> puedes revocar los permisos otorgados a LionsCore directamente desde{' '}
              <a
                href="https://www.facebook.com/settings?tab=applications"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Configuración → Aplicaciones de Facebook
              </a>.
            </Item>
          </ul>
        </Section>

        {/* Section 6 */}
        <Section icon={<Mail className="h-5 w-5 text-cyan-400" />} title="6. Contacto">
          <p>Para cualquier pregunta, solicitud o inquietud sobre esta política de privacidad:</p>
          <div className="mt-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-white font-semibold">LionsCore</p>
            <p className="text-slate-400 text-sm mt-1">{DOMAIN}</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 mt-2 text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium"
            >
              <Mail className="h-4 w-4" />
              {CONTACT_EMAIL}
            </a>
          </div>
          <p className="mt-4 text-slate-400 text-sm">
            Respondemos a todas las solicitudes en un plazo máximo de 5 días hábiles.
          </p>
        </Section>

        {/* Footer note */}
        <div className="pt-4 border-t border-white/10 text-center">
          <p className="text-slate-500 text-sm">
            Esta política puede actualizarse ocasionalmente. La fecha de última actualización siempre estará visible en la parte superior de esta página.
          </p>
          <p className="text-slate-600 text-xs mt-2">© {new Date().getFullYear()} LionsCore · {DOMAIN}</p>
        </div>

      </main>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-xl bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      <div className="text-slate-300 text-sm leading-relaxed space-y-2">
        {children}
      </div>
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
