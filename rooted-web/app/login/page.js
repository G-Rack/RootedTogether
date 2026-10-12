'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { SUBMIT_ENDPOINT, SUPABASE_ANON_KEY, FUNCTIONS_URL, ONBOARDING_URL } from '@/lib/config';
import { ROLE_LABELS } from '@/lib/roles';
import PasswordField from '@/components/PasswordField';
import DateOfBirthField from '@/components/DateOfBirthField';

// The signup flow's role keys match what the submit-signup Edge Function
// expects in `TABLES` / `FIELD_MAP` there. Note "priest" here, not
// "pastor" — the rest of the app (profiles.role, ROLE_LABELS) spells the
// Priest/Pastor role "pastor", but the Edge Function's flow key has always
// been "priest" (inherited from the original Airtable field naming), so
// this is the one place that translation has to happen.
const ROLE_OPTIONS = [
  // Seeker and Assistant sign-up is hidden for now (the app still supports them).
  // To bring them back, uncomment these two lines:
  // { key: 'seeker', label: ROLE_LABELS.seeker, blurb: 'Request prayer, meditation, and guidance from Spiritual Mothers, Pastors, and Leaders.' },
  // { key: 'assistant', label: ROLE_LABELS.assistant, blurb: 'Support a Spiritual Mother or Pastor in caring for the people they serve.' },
  { key: 'mother', label: ROLE_LABELS.mother, blurb: 'Offer prayer, mentorship, and guidance to seekers who need you.' },
  { key: 'priest', label: ROLE_LABELS.pastor, blurb: 'Offer prayer, mentorship, and guidance to seekers who need you.' },
  { key: 'influencer', label: ROLE_LABELS.influencer, blurb: 'Share your voice and ministry with a wider community. Reviewed before going live.' },
];

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
          Sign in with the same details you use on the Rooted Together app — whether you&rsquo;re a Seeker, a
          Spiritual Assistant, Mother, Pastor, or Leader.
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
  const loginParams = useSearchParams();
  const [mode, setMode] = useState(loginParams.get('forgot') ? 'forgot' : 'login'); // 'login' | 'forgot'
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
      const tooMany = resetError.status === 429 || resetError.code === 'over_email_send_rate_limit';
      setError(
        tooMany
          ? 'Too many reset emails requested. Please wait a few minutes and try again.'
          : "Couldn't send that email — please try again.",
      );
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

// Shown on the Sign Up tab when there is no confirmed, unused payment.
function JoinFirst({ gate }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const resend = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch(`${FUNCTIONS_URL}/membership-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action: 'resend', email: email.trim() }),
      });
    } catch {
      // Same neutral confirmation either way, so this can't be used to probe emails.
    }
    setBusy(false);
    setSent(true);
  };

  const heading =
    gate === 'claimed' ? 'This payment has already been used' : gate === 'error' ? "We couldn't confirm your payment" : 'Join first, then create your account';
  const intro =
    gate === 'claimed'
      ? 'Each membership creates one account. If you already created yours, log in instead.'
      : gate === 'error'
        ? 'Something went wrong on our side. Please refresh this page, or use the box below to get a fresh link by email.'
        : 'Creator accounts open once you have joined with the one-time $49 membership. After you pay, you will land right back here to set up your account.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--brown)', marginBottom: 6 }}>{heading}</div>
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>{intro}</div>
      </div>
      {gate !== 'claimed' && (
        <a href={ONBOARDING_URL} className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
          Join for $49
        </a>
      )}
      <div style={{ borderTop: '1px solid rgba(107,66,38,0.1)', paddingTop: 16 }}>
        {sent ? (
          <div className="success-banner" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            If that email has an unused membership, a sign-up link is on its way. Check your inbox and spam. Still stuck? Write to admin@rootedtogether.club.
          </div>
        ) : (
          <form onSubmit={resend} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--brown)' }}>Already paid?</div>
            <div className="muted" style={{ fontSize: 12.5 }}>Enter the email you paid with and we will send your sign-up link.</div>
            <input
              className="input-field"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" disabled={busy} className="btn btn-outline">
              {busy ? 'Sending…' : 'Email me my link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function RolePicker({ onPick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
        How will you use Rooted Together? This matches the same sign-up flow as the app.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ROLE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onPick(opt.key)}
            style={{
              textAlign: 'left',
              background: 'var(--cream)',
              border: '1px solid rgba(107,66,38,0.14)',
              borderRadius: 14,
              padding: '16px 18px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--brown)' }}>{opt.label}</span>
            <span className="muted" style={{ fontSize: 12 }}>{opt.blurb}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Signup stays minimal — just enough to create the account. Everything
// role-specific (spiritual gifts, church info, credentials, file uploads,
// etc.) is filled in afterwards on /complete-profile, once the person is
// signed in. The only thing this form adds beyond the original signup is the
// role picker, so the right table/profile gets created from the start.
function SignupForm({ router }) {
  const searchParams = useSearchParams();
  const [role, setRole] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [religion, setReligion] = useState('');
  const [password, setPassword] = useState('');
  // A referral link (?ref=RT-00042) is picked up silently from the URL. There
  // is no code field on the form; the code travels inside the link.
  const urlReferralCode = searchParams.get('ref') || '';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Creator sign-up is for paid members only. The Stripe payment link sends
  // people here with ?session_id=...; the server confirms that payment is real
  // and unused. Nothing is trusted client-side: submit-signup checks it again.
  const sessionId = searchParams.get('session_id') || '';
  const [gate, setGate] = useState(sessionId ? 'checking' : 'needs_payment');
  const [paidEmail, setPaidEmail] = useState('');
  const [paidReferral, setPaidReferral] = useState('');
  const referralCode = urlReferralCode || paidReferral;

  useEffect(() => {
    if (!sessionId) {
      setGate('needs_payment');
      return undefined;
    }
    let cancelled = false;
    setGate('checking');
    (async () => {
      try {
        const res = await fetch(`${FUNCTIONS_URL}/membership-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ action: 'verify', sessionId }),
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (body.ok) {
          setPaidEmail(body.email || '');
          setEmail(body.email || '');
          setPaidReferral(body.referralCode || '');
          setGate('ok');
        } else if (body.reason === 'claimed') {
          setGate('claimed');
        } else if (res.ok || body.reason) {
          setGate('needs_payment');
        } else {
          setGate('error');
        }
      } catch {
        if (!cancelled) setGate('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const pickRole = (key) => {
    setRole(key);
    setError('');
  };

  if (gate === 'checking') {
    return <div className="muted" style={{ fontSize: 14 }}>Confirming your payment…</div>;
  }
  if (gate !== 'ok') {
    return <JoinFirst gate={gate} />;
  }

  if (!role) {
    return <RolePicker onPick={pickRole} />;
  }

  const roleMeta = ROLE_OPTIONS.find((o) => o.key === role);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    const fields = { Name: name, Email: email, 'Date of Birth': dob };
    if (role === 'seeker') fields.Religion = religion;

    try {
      const res = await fetch(SUBMIT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          role,
          fields,
          password,
          membershipSessionId: sessionId,
          referredByCode: referralCode.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.code === 'membership_required') {
          setGate('claimed');
          setBusy(false);
          return;
        }
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
      // Everything role-specific still needs filling in — send them there next.
      router.push('/complete-profile');
    } catch {
      setBusy(false);
      setError("Couldn't reach the server — please try again.");
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button
        type="button"
        onClick={() => pickRole(null)}
        style={{ background: 'none', border: 'none', fontSize: 12.5, fontWeight: 600, color: 'var(--text-soft)', alignSelf: 'flex-start', padding: 0 }}
      >
        ← Choose a different role
      </button>

      {error && <div className="error-banner">{error}</div>}

      <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
        Signing up as <strong style={{ color: 'var(--brown)' }}>{roleMeta?.label}</strong>.
        {role === 'influencer' && ' Spiritual Leader profiles are reviewed before they appear publicly.'}
      </div>

      <div>
        <label className="field-label">Name</label>
        <input className="input-field" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="field-label">Email</label>
        <input
          className="input-field"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          readOnly={!!paidEmail}
          style={paidEmail ? { opacity: 0.75 } : undefined}
        />
        {paidEmail && (
          <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
            This is the email you paid with.
          </div>
        )}
      </div>
      <div>
        <label className="field-label">Date of birth</label>
        <DateOfBirthField required value={dob} onChange={setDob} />
      </div>
      {role === 'seeker' && (
        <div>
          <label className="field-label">Religion</label>
          <input className="input-field" required value={religion} onChange={(e) => setReligion(e.target.value)} />
        </div>
      )}

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
      {referralCode && (
        <div className="success-banner" style={{ fontSize: 12.5 }}>
          You were invited by a Rooted Together member. They&rsquo;ll be credited when you join.
        </div>
      )}
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
