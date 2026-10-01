'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import PasswordField from '@/components/PasswordField';

function ChevronRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function GroupLabel({ children }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 8 }}>
      {children}
    </div>
  );
}

function LinkRow({ href, label, external }) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px' }}
    >
      <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>{label}</span>
      <ChevronRight />
    </Link>
  );
}

export default function SettingsPage() {
  const { session, profile, signOut } = useSession();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError("Couldn't update your password — please try again.");
      return;
    }
    setPassword('');
    setSaved(true);
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', marginBottom: 22 }}>
        Settings
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <GroupLabel>Account</GroupLabel>
          <div className="card" style={{ padding: '16px 16px' }}>
            <div className="field-label" style={{ marginBottom: 2 }}>Email</div>
            <div style={{ fontSize: 14 }}>{session?.user?.email}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Signed in as {profile?.full_name || session?.user?.email} — same login as the Rooted Together app.
            </div>
          </div>
        </div>

        <div>
          <GroupLabel>Change password</GroupLabel>
          <div className="card" style={{ padding: 20 }}>
            <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <div className="error-banner">{error}</div>}
              {saved && <div className="success-banner">Password updated.</div>}
              <PasswordField
                minLength={8}
                placeholder="New password (at least 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button type="submit" disabled={busy} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                {busy ? 'Saving…' : 'Update password'}
              </button>
            </form>
          </div>
        </div>

        <div>
          <GroupLabel>Creator tools</GroupLabel>
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ borderBottom: '1px solid rgba(107,66,38,0.1)' }}>
              <LinkRow href="/dashboard/branding" label="Storefront branding" />
            </div>
            <LinkRow href="/dashboard/payouts" label="Payouts & sales" />
          </div>
        </div>

        <div>
          <GroupLabel>More</GroupLabel>
          <div className="card" style={{ padding: '13px 16px' }}>
            <div style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5 }}>
              This marketplace is in test mode — purchases and payouts are simulated, no real money moves yet.
              Questions? Reach out from inside the Rooted Together app.
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            await signOut();
            router.push('/');
          }}
          style={{ background: 'none', border: 'none', textAlign: 'center', color: '#8A3B2F', fontSize: 13.5, fontWeight: 700, padding: '6px 0' }}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
