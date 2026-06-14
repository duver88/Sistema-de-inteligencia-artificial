import type { Metadata } from 'next';
import { Trash2, Mail, LogOut, Clock, CheckCircle, ShieldCheck } from 'lucide-react';
import { LionsCoreIcon } from '@/components/icons/LionsCoreIcon';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Data Deletion — LionsCore',
  description: 'How to request the deletion of your personal data in LionsCore.',
};

const LAST_UPDATED = 'April 15, 2026';
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
          <span className="text-slate-400 text-sm">Last updated: {LAST_UPDATED}</span>
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
        <h1 className="text-4xl font-black text-white mb-4">Data Deletion</h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          You have the right to request the deletion of all your personal data from LionsCore
          at any time. Here we explain how to do it.
        </p>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 pb-20 space-y-6">

        {/* Qué datos tenemos */}
        <Section icon={<ShieldCheck className="h-5 w-5 text-cyan-400" />} title="Data we store about you">
          <p>LionsCore may have the following data associated with your account stored:</p>
          <ul className="mt-3 space-y-2">
            <Item>Facebook name and profile picture.</Item>
            <Item>Email address (if it was shared through Facebook Login).</Item>
            <Item>IDs and access tokens for your connected Facebook and Instagram pages (stored encrypted).</Item>
            <Item>The configuration of your moderation bots, rules and knowledge base.</Item>
            <Item>History of comments processed by the platform.</Item>
            <Item>Your account preferences and settings (for example, your OpenAI API key if you configured it).</Item>
          </ul>
        </Section>

        {/* Option 1 — From the app */}
        <div className="bg-white/5 border border-cyan-500/30 rounded-2xl p-7 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
              <LogOut className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Option 1 — Disconnect your accounts from the app</h2>
              <p className="text-slate-400 text-xs mt-0.5">Fast · No need to contact us</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            If you only want to withdraw LionsCore's access to your Facebook and Instagram pages,
            you can do it directly from the platform:
          </p>
          <ol className="space-y-3">
            {[
              'Log in to LionsCore at ' + DOMAIN,
              'Go to the "Accounts" section in the side menu.',
              'Click the disconnect button next to each page you want to remove.',
              'LionsCore will immediately stop having access to that page.',
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
              Go to Accounts
            </Link>
          </div>
        </div>

        {/* Option 2 — By email */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Option 2 — Request complete deletion by email</h2>
              <p className="text-slate-400 text-xs mt-0.5">Deletes all your data from the server</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-5">
            To permanently delete all the information associated with your account (profile, pages, history,
            bot configuration and knowledge base), send us an email with the following details:
          </p>

          <div className="bg-slate-900/60 rounded-xl p-5 space-y-3 text-sm font-mono">
            <div>
              <span className="text-slate-500">To: </span>
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-cyan-400 hover:text-cyan-300">
                {CONTACT_EMAIL}
              </a>
            </div>
            <div>
              <span className="text-slate-500">Subject: </span>
              <span className="text-white">Data deletion request — LionsCore</span>
            </div>
            <div>
              <span className="text-slate-500">Include: </span>
              <span className="text-slate-300">Your name and the email or Facebook ID associated with your account</span>
            </div>
          </div>

          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Data%20deletion%20request%20%E2%80%94%20LionsCore&body=Hello%2C%0A%0AI%20request%20the%20complete%20deletion%20of%20my%20data%20in%20LionsCore.%0A%0AName%3A%20%0AEmail%2FFacebook%20ID%3A%20%0A%0AThank%20you.`}
            className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
            style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }}
          >
            <Mail className="h-4 w-4" />
            Send request by email
          </a>
        </div>

        {/* Plazos */}
        <Section icon={<Clock className="h-5 w-5 text-cyan-400" />} title="Response times">
          <ul className="space-y-2">
            <Item>We will confirm receipt of your request within <strong className="text-white">48 business hours</strong>.</Item>
            <Item>The complete deletion of your data will be carried out within a maximum of <strong className="text-white">7 business days</strong> from the confirmation.</Item>
            <Item>You will receive a confirmation email once your data has been deleted.</Item>
          </ul>
        </Section>

        {/* Qué se elimina */}
        <Section icon={<CheckCircle className="h-5 w-5 text-cyan-400" />} title="What is deleted when we process your request">
          <ul className="space-y-2">
            <Item>Your user profile and session data.</Item>
            <Item>All connected Facebook and Instagram pages and their access tokens.</Item>
            <Item>The configuration of all your moderation bots.</Item>
            <Item>Your knowledge base and moderation rules.</Item>
            <Item>The history of comments processed by the platform.</Item>
            <Item>Any other personal information associated with your account.</Item>
          </ul>
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-300 text-xs">
              <strong>Note:</strong> This action is irreversible. Once deleted, your data cannot be recovered.
              If you wish to use LionsCore again in the future, you will need to create a new account.
            </p>
          </div>
        </Section>

        {/* Revocar en Facebook */}
        <Section icon={<ShieldCheck className="h-5 w-5 text-cyan-400" />} title="Revoke permissions directly on Facebook">
          <p>
            You can also revoke LionsCore's access to your Facebook account directly from
            Meta's settings, without needing to contact us:
          </p>
          <ol className="mt-3 space-y-2">
            <Item>
              Go to{' '}
              <a
                href="https://www.facebook.com/settings?tab=applications"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Facebook → Settings → Apps and Websites
              </a>
            </Item>
            <Item>Find "LionsCore" in the list of connected apps.</Item>
            <Item>Click "Remove" to revoke all permissions.</Item>
          </ol>
          <p className="mt-3 text-slate-400 text-xs">
            If you also want us to delete the data stored on our servers, use Option 2 above.
          </p>
        </Section>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 text-center space-y-3">
          <div className="flex items-center justify-center gap-6 text-sm">
            <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-cyan-400 hover:text-cyan-300 transition-colors">Terms of Service</Link>
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
