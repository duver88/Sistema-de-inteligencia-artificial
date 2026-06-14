import type { Metadata } from 'next';
import { Shield, Eye, Lock, Trash2, Mail, Users, Database } from 'lucide-react';
import { LionsCoreIcon } from '@/components/icons/LionsCoreIcon';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — LionsCore',
  description: 'LionsCore privacy policy. How we collect, use and protect your data.',
};

const LAST_UPDATED = 'April 15, 2026';
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
          <span className="text-slate-400 text-sm">Last updated: {LAST_UPDATED}</span>
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
        <h1 className="text-4xl font-black text-white mb-4">Privacy Policy</h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          At LionsCore we take the privacy of your data seriously. This policy explains
          what information we collect, how we use it and how we protect it.
        </p>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 pb-20 space-y-6">

        {/* Section 1 */}
        <Section icon={<Database className="h-5 w-5 text-cyan-400" />} title="1. Data we collect">
          <p>When you use LionsCore, we collect the following information:</p>
          <ul className="mt-3 space-y-2">
            <Item>
              <strong>Facebook profile data:</strong> name and profile picture, required to identify your account.
            </Item>
            <Item>
              <strong>Email address</strong> (if you share it through Facebook): used solely for platform communications.
            </Item>
            <Item>
              <strong>Facebook and Instagram pages:</strong> name, ID, photo and image of the pages you choose to connect to LionsCore.
            </Item>
            <Item>
              <strong>Page access tokens:</strong> encrypted credentials that allow us to read and manage comments on your behalf. They are never exposed in plain text.
            </Item>
            <Item>
              <strong>Comments on your posts:</strong> the text of the comments your pages receive, processed in real time to apply the moderation rules you configure.
            </Item>
            <Item>
              <strong>Platform settings:</strong> moderation rules, knowledge base, bot instructions and your account preferences.
            </Item>
          </ul>
        </Section>

        {/* Section 2 */}
        <Section icon={<Eye className="h-5 w-5 text-cyan-400" />} title="2. What we use your data for">
          <p>We use the information we collect exclusively to:</p>
          <ul className="mt-3 space-y-2">
            <Item>Authenticate your session and keep your account active on the platform.</Item>
            <Item>Connect and sync your Facebook and Instagram pages so you can manage them from LionsCore.</Item>
            <Item>Process the comments on your pages using artificial intelligence, applying the rules and settings you define.</Item>
            <Item>Reply to, hide or delete comments automatically according to your instructions.</Item>
            <Item>Show you the history and statistics of moderated comments in your dashboard.</Item>
            <Item>Send you relevant notifications about how the service is running.</Item>
          </ul>
          <p className="mt-4 text-slate-400 text-sm">
            We never use your data for purposes other than those described without your explicit consent.
          </p>
        </Section>

        {/* Section 3 */}
        <Section icon={<Lock className="h-5 w-5 text-cyan-400" />} title="3. How we protect your data">
          <ul className="space-y-2">
            <Item>
              <strong>Encryption at rest:</strong> all access tokens are stored encrypted with AES-256-GCM. They are never saved in plain text in the database.
            </Item>
            <Item>
              <strong>Encryption in transit:</strong> all communication between your browser and our servers uses HTTPS with TLS.
            </Item>
            <Item>
              <strong>Limited access:</strong> only the strictly necessary technical staff have access to production systems.
            </Item>
            <Item>
              <strong>Secure infrastructure:</strong> the application runs on servers with a configured firewall, key-based SSH access and SSL certificates managed by Let's Encrypt.
            </Item>
            <Item>
              <strong>Short-lived tokens:</strong> Facebook user tokens are exchanged for long-lived tokens (60 days) and are renewed automatically upon reconnecting.
            </Item>
          </ul>
        </Section>

        {/* Section 4 */}
        <Section icon={<Users className="h-5 w-5 text-cyan-400" />} title="4. Sharing data with third parties">
          <p>
            <strong className="text-white">We do not sell, rent or share your personal data with third parties</strong> for commercial or advertising purposes.
          </p>
          <p className="mt-3">We only share information with:</p>
          <ul className="mt-3 space-y-2">
            <Item>
              <strong>Meta (Facebook/Instagram):</strong> to carry out moderation actions (replying to, hiding, deleting comments) through its official API, using the permissions you granted.
            </Item>
            <Item>
              <strong>OpenAI:</strong> the text of comments is sent to the OpenAI API for classification and response generation. You can use your own API key configured in Settings. OpenAI processes the data under its own privacy policy.
            </Item>
          </ul>
          <p className="mt-4 text-slate-400 text-sm">
            No other third party has access to your data. We do not use third-party analytics tools that collect personal data.
          </p>
        </Section>

        {/* Section 5 */}
        <Section icon={<Trash2 className="h-5 w-5 text-cyan-400" />} title="5. Deleting your data">
          <p>You have the right to request the complete deletion of your data at any time.</p>
          <ul className="mt-3 space-y-2">
            <Item>
              <strong>Disconnect a page:</strong> from the <em>Accounts</em> section of the app you can disconnect any page at any time. This revokes LionsCore's access to that page.
            </Item>
            <Item>
              <strong>Delete your account:</strong> send an email to{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-cyan-400 hover:text-cyan-300 underline">
                {CONTACT_EMAIL}
              </a>{' '}
              with the subject <em>"Delete LionsCore account"</em>. We will erase all your data (profile, connected pages, tokens, comment history and bot settings) within a maximum of 7 business days.
            </Item>
            <Item>
              <strong>Revoke Facebook permissions:</strong> you can revoke the permissions granted to LionsCore directly from{' '}
              <a
                href="https://www.facebook.com/settings?tab=applications"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Facebook Settings → Apps
              </a>.
            </Item>
          </ul>
        </Section>

        {/* Section 6 */}
        <Section icon={<Mail className="h-5 w-5 text-cyan-400" />} title="6. Contact">
          <p>For any question, request or concern about this privacy policy:</p>
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
            We respond to all requests within a maximum of 5 business days.
          </p>
        </Section>

        {/* Footer note */}
        <div className="pt-4 border-t border-white/10 text-center">
          <p className="text-slate-500 text-sm">
            This policy may be updated occasionally. The date of the last update will always be visible at the top of this page.
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
