'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { bannerUrl, uploadBanner } from '@/lib/storage';
import { ROLE_TABLES } from '@/lib/roleProfileFields';
import PasswordField from '@/components/PasswordField';

export default function MyProfileSettingsPage() {
  const { session, profile } = useSession();
  const table = profile?.role ? ROLE_TABLES[profile.role] : null;

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)' }}>Settings</div>

      <BannerSection session={session} table={table} />
      <PasswordSection session={session} />
      <BillingSection />

      <div>
        <div className="field-label" style={{ marginBottom: 6 }}>Account</div>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 13.5 }}>{session?.user?.email}</div>
        </div>
      </div>
    </div>
  );
}

function BannerSection({ session, table }) {
  const [bannerPath, setBannerPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    if (!session?.user?.id || !table) return undefined;
    supabase
      .from(table)
      .select('banner_path')
      .eq('auth_user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) {
          setBannerPath(data?.banner_path || null);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id, table]);

  const onChooseFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id || !table) return;
    setError('');
    setSaved(false);
    setUploading(true);
    try {
      const path = await uploadBanner(file, session.user.id);
      const { error: updateError } = await supabase.from(table).update({ banner_path: path }).eq('auth_user_id', session.user.id);
      if (updateError) throw updateError;
      setBannerPath(path);
      setSaved(true);
    } catch {
      setError("Couldn't upload that image — please try again.");
    } finally {
      setUploading(false);
    }
  };

  const banner = bannerUrl(bannerPath);

  return (
    <div>
      <div className="field-label" style={{ marginBottom: 6 }}>Profile banner</div>
      <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {error && <div className="error-banner">{error}</div>}
        {saved && <div className="success-banner">Banner updated.</div>}
        <div
          style={{
            height: 110,
            borderRadius: 12,
            background: banner ? `center / cover no-repeat url(${banner})` : 'linear-gradient(160deg, var(--brown) 0%, var(--brown-light) 100%)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            padding: 10,
          }}
        >
          <label className="btn btn-outline btn-small" style={{ background: 'var(--white)', cursor: 'pointer' }}>
            {uploading ? 'Uploading…' : 'Choose photo'}
            <input type="file" accept="image/*" onChange={onChooseFile} disabled={loading || uploading} style={{ display: 'none' }} />
          </label>
        </div>
        <div className="muted" style={{ fontSize: 11.5 }}>Shown at the top of your public profile preview.</div>
      </div>
    </div>
  );
}

function PasswordSection({ session }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

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
    <div>
      <div className="field-label" style={{ marginBottom: 6 }}>Change password</div>
      <div className="card" style={{ padding: 18 }}>
        <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
          <button type="submit" disabled={busy} className="btn btn-primary btn-small" style={{ alignSelf: 'flex-start' }}>
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}

// No payment processor is connected to the site yet — this stays an honest
// placeholder (same pattern as the "Managed in the app" Spiritual Family
// stub) rather than a form that looks like it saves real billing details.
function BillingSection() {
  return (
    <div>
      <div className="field-label" style={{ marginBottom: 6 }}>Billing</div>
      <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="muted" style={{ fontSize: 13 }}>No payment method on file.</div>
        <div className="note" style={{ fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.5, background: 'var(--cream-dark)', borderRadius: 10, padding: '10px 12px' }}>
          This marketplace is in test mode — purchases are simulated, no real card is charged yet.
        </div>
      </div>
    </div>
  );
}
