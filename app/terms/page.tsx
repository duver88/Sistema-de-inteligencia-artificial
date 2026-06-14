import type { Metadata } from 'next';
import { FileText, AlertCircle, CheckCircle, XCircle, RefreshCw, Scale, Mail } from 'lucide-react';
import { LionsCoreIcon } from '@/components/icons/LionsCoreIcon';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — LionsCore',
  description: 'Terms and conditions of use for the LionsCore platform.',
};

const LAST_UPDATED = 'April 15, 2026';
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
          <span className="text-slate-400 text-sm">Last updated: {LAST_UPDATED}</span>
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
        <h1 className="text-4xl font-black text-white mb-4">Terms of Service</h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          By using LionsCore you accept these terms. Please read them carefully
          before using the platform.
        </p>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 pb-20 space-y-6">

        <Section icon={<FileText className="h-5 w-5 text-cyan-400" />} title="1. Acceptance of the terms">
          <p>
            By accessing and using LionsCore (<strong className="text-white">{DOMAIN}</strong>), you agree to be bound by these Terms of Service.
            If you do not agree with any of these terms, you must not use the platform.
          </p>
          <p className="mt-3">
            We reserve the right to modify these terms at any time. Changes take effect
            when published on this page. Continued use of the platform after any change constitutes
            your acceptance of the new terms.
          </p>
        </Section>

        <Section icon={<CheckCircle className="h-5 w-5 text-cyan-400" />} title="2. Description of the service">
          <p>LionsCore is a social media comment management platform that offers:</p>
          <ul className="mt-3 space-y-2">
            <Item>Connection to Facebook and Instagram pages through Meta's official API.</Item>
            <Item>Automatic comment moderation using artificial intelligence.</Item>
            <Item>Automatic replies to comments based on rules and a knowledge base configured by the user.</Item>
            <Item>A control panel to monitor and manage moderation activity.</Item>
            <Item>Moderation bot configuration per connected page.</Item>
          </ul>
        </Section>

        <Section icon={<AlertCircle className="h-5 w-5 text-cyan-400" />} title="3. Usage requirements">
          <p>To use LionsCore you must:</p>
          <ul className="mt-3 space-y-2">
            <Item>Be at least 18 years of age.</Item>
            <Item>Be an administrator of the Facebook pages you want to connect.</Item>
            <Item>Comply with <a href="https://www.facebook.com/terms.php" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">Meta's Terms of Service</a> and the platform's policies.</Item>
            <Item>Use the service only for legal and legitimate purposes.</Item>
            <Item>Not use the platform to send spam, offensive content or to violate the rights of third parties.</Item>
          </ul>
        </Section>

        <Section icon={<CheckCircle className="h-5 w-5 text-cyan-400" />} title="4. Account and access">
          <ul className="space-y-2">
            <Item>Access to LionsCore is exclusively through Facebook Login. You are responsible for maintaining the security of your Facebook account.</Item>
            <Item>Each Facebook account provides access to a separate workspace (tenant) within LionsCore.</Item>
            <Item>You may not share your account with third parties or use it to manage pages without authorization from their owners.</Item>
            <Item>We reserve the right to suspend or cancel accounts that violate these terms without prior notice.</Item>
          </ul>
        </Section>

        <Section icon={<XCircle className="h-5 w-5 text-cyan-400" />} title="5. Prohibited use">
          <p>The following is strictly prohibited:</p>
          <ul className="mt-3 space-y-2">
            <Item>Using LionsCore to harass, threaten or discriminate against people.</Item>
            <Item>Attempting to access other users' accounts, pages or data without authorization.</Item>
            <Item>Using the platform to distribute malware, phishing or other malicious content.</Item>
            <Item>Attempting to reverse engineer, decompile or alter the platform's code.</Item>
            <Item>Intentionally overloading the service's servers or infrastructure.</Item>
            <Item>Reselling or redistributing the service without written authorization from LionsCore.</Item>
          </ul>
        </Section>

        <Section icon={<RefreshCw className="h-5 w-5 text-cyan-400" />} title="6. Service availability">
          <p>
            LionsCore strives to keep the service continuously available, but does not guarantee
            uninterrupted availability. We may perform scheduled maintenance that involves
            temporary interruptions.
          </p>
          <p className="mt-3">
            We are not responsible for interruptions caused by factors beyond our control, including
            changes to Meta's API, connectivity issues or force majeure.
          </p>
        </Section>

        <Section icon={<Scale className="h-5 w-5 text-cyan-400" />} title="7. Limitation of liability">
          <ul className="space-y-2">
            <Item>LionsCore is not liable for comments incorrectly replied to, hidden or deleted as a result of the bot configuration set up by the user.</Item>
            <Item>The user is solely responsible for the actions they configure in their moderation bots and for the consequences these have on their pages.</Item>
            <Item>We do not guarantee that AI moderation is 100% accurate. We recommend reviewing the bot's activity periodically.</Item>
            <Item>In no event will our liability exceed the amount paid for the service in the last 3 months.</Item>
          </ul>
        </Section>

        <Section icon={<FileText className="h-5 w-5 text-cyan-400" />} title="8. Intellectual property">
          <p>
            All content, design, code and branding of LionsCore is the property of LionsCore and is protected
            by the applicable intellectual property laws. No rights over these elements are granted
            beyond normal use of the platform.
          </p>
          <p className="mt-3">
            The content of your pages (comments, posts, images) is yours. LionsCore only
            processes it according to your instructions and claims no rights over it.
          </p>
        </Section>

        <Section icon={<Mail className="h-5 w-5 text-cyan-400" />} title="9. Contact">
          <p>For questions about these terms:</p>
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
            <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 transition-colors">Privacy Policy</Link>
            <Link href="/data-deletion" className="text-cyan-400 hover:text-cyan-300 transition-colors">Data Deletion</Link>
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
