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

  useEffect(() => {
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
    setTimeout(() => router.push('/'), 2000);
  };

  return (
    <div style={{ width: '100%', minHeight: 'calc(100vh - 76px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div className="card" style={{ width: 420, maxWidth: '100%', padding: 32 }}>
        <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)', marginBottom: 18 }}>
          Reset your password
        </div>

        {!ready && <div className="muted" style={{ fontSize: 13.5 }}>Checking your link…</div>}

        {ready && !hasSession && (
          <div className="error-banner">
            This reset link is invalid or has expired. Go back to Log In and request a new one.
          </div>
        )}

        {ready && hasSession && !done && (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div className="error-banner">{error}</div>}
            <div>
              <label className="field-label">New password</label>
              <PasswordField
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="field-label">Confirm password</label>
              <PasswordField
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Type it again"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ marginTop: 4 }}>
              {busy ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}

        {done && <div className="success-banner">Password updated — taking you to the marketplace…</div>}
      </div>
    </div>
  );
}
