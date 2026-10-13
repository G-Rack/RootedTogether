'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import PasswordField from '@/components/PasswordField';
import { FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/lib/config';

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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Delete account: a two-step flow (open the warning, then confirm with the
  // password and the word DELETE). The delete-account Edge Function is the same
  // one the mobile app uses; it only ever deletes the caller's own account.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteWord, setDeleteWord] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const leadsFamily = profile?.role === 'mother' || profile?.role === 'pastor';
  const isCreatorRole = ['mother', 'pastor', 'influencer', 'church'].includes(profile?.role);

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeletePassword('');
    setDeleteWord('');
    setDeleteError('');
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError('');
    if (deleteWord.trim() !== 'DELETE') {
      setDeleteError('Type DELETE in capitals to confirm.');
      return;
    }
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm.');
      return;
    }
    setDeleteBusy(true);

    // Same re-authentication used for changing a password, so a stray open
    // session on a shared computer can't delete the account.
    const { data: reauth, error: verifyError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: deletePassword,
    });
    if (verifyError) {
      setDeleteBusy(false);
      setDeleteError('Password is incorrect.');
      return;
    }
    const token = reauth?.session?.access_token || session?.access_token;

    try {
      const res = await fetch(`${FUNCTIONS_URL}/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON_KEY,
        },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        setDeleteBusy(false);
        setDeleteError(body.error || "Couldn't delete your account right now. Please try again.");
        return;
      }
    } catch {
      setDeleteBusy(false);
      setDeleteError("Couldn't reach the server. Please try again.");
      return;
    }

    try {
      await signOut();
    } catch {
      // The account is already gone; clearing the local session is best effort.
    }
    router.push('/');
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (!currentPassword) {
      setError('Enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords don’t match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    setBusy(true);

    // Supabase has no direct "verify current password" call, so we confirm it
    // the same way sign-in does: re-authenticate with it before changing anything.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword,
    });
    if (verifyError) {
      setBusy(false);
      setError('Current password is incorrect.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (updateError) {
      setError("Couldn't update your password — please try again.");
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
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
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
              <PasswordField
                minLength={8}
                placeholder="New password (at least 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <PasswordField
                minLength={8}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              <LinkRow href="/complete-profile" label="Complete your profile" />
            </div>
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

        <div>
          <GroupLabel>Close your account</GroupLabel>
          <div className="card" style={{ padding: deleteOpen ? 20 : '13px 16px', borderColor: 'rgba(138,59,47,0.25)' }}>
            {!deleteOpen ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>Delete account</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-soft)', marginTop: 2, lineHeight: 1.45 }}>
                    Permanently remove your account and everything attached to it.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="btn btn-outline btn-small"
                  style={{ color: '#8A3B2F', borderColor: 'rgba(138,59,47,0.35)', flexShrink: 0 }}
                >
                  Delete
                </button>
              </div>
            ) : (
              <form onSubmit={deleteAccount} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#8A3B2F' }}>Delete your account?</div>
                <div style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.55 }}>
                  This permanently deletes your account, posts, messages and everything else attached to it. This can&rsquo;t be undone.
                  {isCreatorRole && ' Your storefront and offerings will be removed, and your one-time $49 membership is not refundable or transferable. Withdraw any earnings from Payouts & sales first.'}
                  {leadsFamily && ' Because you lead a Spiritual Family, that family and everyone in it will be removed too.'}
                </div>
                {deleteError && <div className="error-banner">{deleteError}</div>}
                <PasswordField
                  placeholder="Your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  autoComplete="current-password"
                />
                <div>
                  <label className="field-label">Type DELETE to confirm</label>
                  <input
                    className="input-field"
                    value={deleteWord}
                    onChange={(e) => setDeleteWord(e.target.value)}
                    autoComplete="off"
                    autoCapitalize="characters"
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    disabled={deleteBusy}
                    className="btn btn-primary"
                    style={{ background: '#8A3B2F' }}
                  >
                    {deleteBusy ? 'Deleting…' : 'Permanently delete my account'}
                  </button>
                  <button type="button" onClick={closeDelete} disabled={deleteBusy} className="btn btn-outline">
                    Cancel
                  </button>
                </div>
              </form>
            )}
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
