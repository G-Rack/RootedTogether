'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { SUBMIT_ENDPOINT, SUPABASE_ANON_KEY } from '@/lib/config';
import PasswordField from '@/components/PasswordField';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'signup' ? 'signup' : 'login');

  return (
    <div className="login-shell" style={{ width: '100%', minHeight: 'calc(100vh - 76px)' }}>
      {/* Brand panel */}
      <div
        className="login-brand"
        style={{
          background: 'linear-gradient(160deg, var(--brown) 0%, var(--brown-light) 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 72px',
          color: 'var(--white)',
        }}
      >
        <div className="serif" style={{ fontSize: 26, fontWeight: 700, marginBottom: 18 }}>Rooted Together</div>
        <div className="serif" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.3, maxWidth: 420 }}>
          One account for the app and the marketplace.
        </div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, maxWidth: 400, marginTop: 16 }}>
          Sign in with the same details you use on the Rooted Together app to buy courses, book calls, and manage
          your storefront.
        </div>
      </div>

      {/* Form panel */}
      <div
        className="login-form-panel"
        style={{
          background: 'var(--white)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 64px',
        }}
      >
        <div style={{ display: 'flex', gap: 24, marginBottom: 28, borderBottom: '1px solid rgba(107,66,38,0.1)' }}>
          <button
            onClick={() => setTab('login')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 15,
              fontWeight: tab === 'login' ? 700 : 600,
              color: tab === 'login' ? 'var(--brown)' : 'var(--text-soft)',
              paddingBottom: 14,
              borderBottom: tab === 'login' ? '2px solid var(--brown)' : 'none',
            }}
          >
            Log In
          </button>
          <button
            onClick={() => setTab('signup')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 15,
              fontWeight: tab === 'signup' ? 700 : 600,
              color: tab === 'signup' ? 'var(--brown)' : 'var(--text-soft)',
              paddingBottom: 14,
              borderBottom: tab === 'signup' ? '2px solid var(--brown)' : 'none',
            }}
          >
            Sign Up
          </button>
        </div>

        {tab === 'login' ? <LoginForm router={router} /> : <SignupForm router={router} />}
      </div>
    </div>
  );
}

function LoginForm({ router }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [forgotSent, setForgotSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setBusy(false);
      setError(signInError.message === 'Invalid login credentials'
        ? "That email and password don't match — check them and try again."
        : signInError.message);
      return;
    }

    // Check directly (rather than waiting on session-provider state, which
    // updates async) so creators land straight on their dashboard instead
    // of the public homepage.
    const { data: isCreator } = await supabase.rpc('is_valid_creator', { check_auth_id: data.user.id });
    setBusy(false);
    router.push(isCreator ? '/dashboard' : '/');
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (resetError) {
      setError("Couldn't send that email — please try again.");
      return;
    }
    setForgotSent(true);
  };

  if (mode === 'forgot') {
    return (
      <form onSubmit={submitForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div className="error-banner">{error}</div>}
        {forgotSent ? (
          <div className="success-banner">
            If an account exists for {email}, a reset link is on its way — check your inbox.
          </div>
        ) : (
          <>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
              Enter your account email and we&rsquo;ll send you a link to reset your password.
            </div>
            <div>
              <label className="field-label">Email</label>
              <input
                className="input-field"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
              />
            </div>
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ marginTop: 4 }}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setForgotSent(false);
            setError('');
          }}
          style={{ background: 'none', border: 'none', fontSize: 12.5, fontWeight: 600, color: 'var(--text-soft)', alignSelf: 'center' }}
        >
          ← Back to log in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div className="error-banner">{error}</div>}
      <div>
        <label className="field-label">Email</label>
        <input
          className="input-field"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
      </div>
      <div>
        <label className="field-label">Password</label>
        <PasswordField
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>
      <button
        type="button"
        onClick={() => setMode('forgot')}
        style={{ background: 'none', border: 'none', fontSize: 12.5, fontWeight: 600, color: 'var(--brown)', alignSelf: 'flex-end', padding: 0 }}
      >
        Forgot password?
      </button>
      <button type="submit" disabled={busy} className="btn btn-primary" style={{ marginTop: 4 }}>
        {busy ? 'Logging in…' : 'Log In'}
      </button>
    </form>
  );
}

function SignupForm({ router }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [religion, setReligion] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const res = await fetch(SUBMIT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          role: 'seeker',
          fields: {
            Name: name,
            Email: email,
            'Date of Birth': dob,
            Religion: religion,
          },
          password,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Couldn't create your account right now.");
        setBusy(false);
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (signInError) {
        setError('Account created — please log in.');
        return;
      }
      router.push('/');
    } catch {
      setBusy(false);
      setError("Couldn't reach the server — please try again.");
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && <div className="error-banner">{error}</div>}
      <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
        This creates a buyer account for the marketplace. Already a Spiritual Mother, Pastor, or Leader? Log in
        with the account you signed up with in the app.
      </div>
      <div>
        <label className="field-label">Name</label>
        <input className="input-field" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="field-label">Email</label>
        <input className="input-field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="responsive-2col" style={{ '--col-gap': '12px' }}>
        <div>
          <label className="field-label">Date of birth</label>
          <input className="input-field" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Religion</label>
          <input className="input-field" required value={religion} onChange={(e) => setReligion(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="field-label">Password</label>
        <PasswordField
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <button type="submit" disabled={busy} className="btn btn-primary" style={{ marginTop: 4 }}>
        {busy ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
