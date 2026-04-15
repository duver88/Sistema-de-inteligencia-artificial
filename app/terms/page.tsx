import type { Metadata } from 'next';
import { FileText, AlertCircle, CheckCircle, XCircle, RefreshCw, Scale, Mail } from 'lucide-react';
import { LionsCoreIcon } from '@/components/icons/LionsCoreIcon';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Términos de Servicio — LionsCore',
  description: 'Términos y condiciones de uso de la plataforma LionsCore.',
};

const LAST_UPDATED = '15 de abril de 2026';
const DOMAIN = 'sia.lionscore.ai';
const CONTACT_EMAIL = 'hernesto.ariza@lionsagencia.com';

export default function TermsPage() {
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
          <FileText className="h-8 w-8" style={{ color: '#0a1628' }} />
        </div>
        <h1 className="text-4xl font-black text-white mb-4">Términos de Servicio</h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Al usar LionsCore aceptas estos términos. Por favor léelos con atención
          antes de usar la plataforma.
        </p>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 pb-20 space-y-6">

        <Section icon={<FileText className="h-5 w-5 text-cyan-400" />} title="1. Aceptación de los términos">
          <p>
            Al acceder y usar LionsCore (<strong className="text-white">{DOMAIN}</strong>), aceptas quedar vinculado por estos Términos de Servicio.
            Si no estás de acuerdo con alguno de estos términos, no debes usar la plataforma.
          </p>
          <p className="mt-3">
            Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entran en vigor
            al publicarse en esta página. El uso continuado de la plataforma después de cualquier cambio constituye
            tu aceptación de los nuevos términos.
          </p>
        </Section>

        <Section icon={<CheckCircle className="h-5 w-5 text-cyan-400" />} title="2. Descripción del servicio">
          <p>LionsCore es una plataforma de gestión de comentarios en redes sociales que ofrece:</p>
          <ul className="mt-3 space-y-2">
            <Item>Conexión con páginas de Facebook e Instagram mediante la API oficial de Meta.</Item>
            <Item>Moderación automática de comentarios mediante inteligencia artificial.</Item>
            <Item>Respuesta automática a comentarios según reglas y base de conocimiento configuradas por el usuario.</Item>
            <Item>Panel de control para supervisar y gestionar la actividad de moderación.</Item>
            <Item>Configuración de bots de moderación por página conectada.</Item>
          </ul>
        </Section>

        <Section icon={<AlertCircle className="h-5 w-5 text-cyan-400" />} title="3. Requisitos de uso">
          <p>Para usar LionsCore debes:</p>
          <ul className="mt-3 space-y-2">
            <Item>Tener al menos 18 años de edad.</Item>
            <Item>Ser administrador de las páginas de Facebook que deseas conectar.</Item>
            <Item>Cumplir con los <a href="https://www.facebook.com/terms.php" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">Términos de Servicio de Meta</a> y las políticas de la plataforma.</Item>
            <Item>Usar el servicio únicamente para fines legales y legítimos.</Item>
            <Item>No usar la plataforma para enviar spam, contenido ofensivo o violar los derechos de terceros.</Item>
          </ul>
        </Section>

        <Section icon={<CheckCircle className="h-5 w-5 text-cyan-400" />} title="4. Cuenta y acceso">
          <ul className="space-y-2">
            <Item>El acceso a LionsCore se realiza exclusivamente mediante Facebook Login. Eres responsable de mantener la seguridad de tu cuenta de Facebook.</Item>
            <Item>Cada cuenta de Facebook da acceso a un espacio de trabajo (tenant) independiente dentro de LionsCore.</Item>
            <Item>No puedes compartir tu cuenta con terceros ni usarla para gestionar páginas sin autorización de sus propietarios.</Item>
            <Item>Nos reservamos el derecho de suspender o cancelar cuentas que violen estos términos sin previo aviso.</Item>
          </ul>
        </Section>

        <Section icon={<XCircle className="h-5 w-5 text-cyan-400" />} title="5. Uso prohibido">
          <p>Está estrictamente prohibido:</p>
          <ul className="mt-3 space-y-2">
            <Item>Usar LionsCore para hostigar, amenazar o discriminar a personas.</Item>
            <Item>Intentar acceder a cuentas, páginas o datos de otros usuarios sin autorización.</Item>
            <Item>Usar la plataforma para distribuir malware, phishing u otro contenido malicioso.</Item>
            <Item>Intentar hacer ingeniería inversa, descompilar o alterar el código de la plataforma.</Item>
            <Item>Sobrecargar intencionalmente los servidores o infraestructura del servicio.</Item>
            <Item>Revender o redistribuir el servicio sin autorización escrita de LionsCore.</Item>
          </ul>
        </Section>

        <Section icon={<RefreshCw className="h-5 w-5 text-cyan-400" />} title="6. Disponibilidad del servicio">
          <p>
            LionsCore se esfuerza por mantener el servicio disponible de forma continua, pero no garantiza
            disponibilidad ininterrumpida. Podemos realizar mantenimientos programados que impliquen
            interrupciones temporales.
          </p>
          <p className="mt-3">
            No somos responsables de interrupciones causadas por factores fuera de nuestro control, incluyendo
            cambios en la API de Meta, problemas de conectividad o fuerza mayor.
          </p>
        </Section>

        <Section icon={<Scale className="h-5 w-5 text-cyan-400" />} title="7. Limitación de responsabilidad">
          <ul className="space-y-2">
            <Item>LionsCore no se hace responsable por comentarios respondidos, ocultados o eliminados de forma incorrecta como resultado de la configuración del bot realizada por el usuario.</Item>
            <Item>El usuario es el único responsable de las acciones que configure en sus bots de moderación y de las consecuencias que estas generen en sus páginas.</Item>
            <Item>No garantizamos que la moderación por IA sea 100% precisa. Recomendamos revisar periódicamente la actividad del bot.</Item>
            <Item>En ningún caso nuestra responsabilidad excederá el monto pagado por el servicio en los últimos 3 meses.</Item>
          </ul>
        </Section>

        <Section icon={<FileText className="h-5 w-5 text-cyan-400" />} title="8. Propiedad intelectual">
          <p>
            Todo el contenido, diseño, código y marca de LionsCore es propiedad de LionsCore y está protegido
            por las leyes de propiedad intelectual aplicables. No se concede ningún derecho sobre estos elementos
            más allá del uso normal de la plataforma.
          </p>
          <p className="mt-3">
            El contenido de tus páginas (comentarios, publicaciones, imágenes) es tuyo. LionsCore solo lo
            procesa según tus instrucciones y no reclama ningún derecho sobre él.
          </p>
        </Section>

        <Section icon={<Mail className="h-5 w-5 text-cyan-400" />} title="9. Contacto">
          <p>Para dudas sobre estos términos:</p>
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
        </Section>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 text-center space-y-3">
          <div className="flex items-center justify-center gap-6 text-sm">
            <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 transition-colors">Política de Privacidad</Link>
            <Link href="/data-deletion" className="text-cyan-400 hover:text-cyan-300 transition-colors">Eliminación de Datos</Link>
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
