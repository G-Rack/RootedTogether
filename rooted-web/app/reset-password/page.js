'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PasswordField from '@/components/PasswordField';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    // Sent here by SessionProvider (or an old bookmark) when the link was dead.
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash || '';
    if (params.get('expired') || /error_code=otp_expired/.test(hash)) {
      setExpired(true);
      setReady(true);
      return undefined;
    }

    // The reset-link redirect carries a recovery token in the URL —
    // supabase-js (detectSessionInUrl: true) picks it up and fires this
    // automatically once it's done, which is why we wait for it rather
    // than just calling getSession() once on mount.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setHasSession(true);
        setReady(true);
      } else if (event === 'SIGNED_OUT') {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setHasSession(true);
      }
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError("Couldn't update your password — try requesting a new reset link.");
      return;
    }
    setDone(true);
    // They're already signed in from the reset link. Send creators to their
    // dashboard, everyone else to the home page, same as after a normal login.
    let destination = '/';
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: isCreator } = await supabase.rpc('is_valid_creator', { check_auth_id: userData.user.id });
        if (isCreator) destination = '/dashboard';
      }
    } catch {
      // Fall back to the home page.
    }
    setTimeout(() => router.push(destination), 1500);
  };

  return (
    <div style={{ width: '100%', minHeight: 'calc(100vh - 76px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div className="card" style={{ width: 420, maxWidth: '100%', padding: 32 }}>
        <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)', marginBottom: 18 }}>
          Reset your password
        </div>

        {!ready && <div className="muted" style={{ fontSize: 13.5 }}>Checking your link…</div>}

        {ready && expired && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="error-banner">
              This reset link has expired or was already used. Reset links work once and only for a short time.
            </div>
            <a href="/login?forgot=1" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Send me a new link
            </a>
          </div>
        )}

        {ready && !expired && !hasSession && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="error-banner">
              This reset link is invalid or has expired. Request a new one from the Log In page.
            </div>
            <a href="/login" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Back to log in
            </a>
          </div>
        )}

        {ready && !expired && hasSession && !done && (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div className="error-banner">{error}</div>}
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
              Choose a new password for your Rooted Together account.
            </div>
            <PasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (at least 8 characters)"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <PasswordField
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              {busy ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}

        {done && <div className="success-banner">Password updated. Taking you to your account…</div>}
      </div>
    </div>
  );
}
