'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { SUBMIT_ENDPOINT, SUPABASE_ANON_KEY, FUNCTIONS_URL, ONBOARDING_URL, PRO_JOIN_URL } from '@/lib/config';
import { ROLE_LABELS } from '@/lib/roles';
import PasswordField from '@/components/PasswordField';
import StoreBadges from '@/components/StoreBadges';
import DateOfBirthField from '@/components/DateOfBirthField';
import { CHURCH_TYPE_OPTIONS } from '@/lib/roleProfileFields';

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
  { key: 'church', label: ROLE_LABELS.church, blurb: 'Give your church or ministry a home: share your community, teaching and offerings. Goes live as soon as you sign up.' },
];

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'signup' ? 'signup' : 'login');
  // The join-first screen needs the whole page width, so it asks the shell to go wide.
  const [wide, setWide] = useState(false);

  return (
    <div className="login-shell login-shell-wide" style={{ width: '100%', minHeight: 'calc(100vh - 76px)' }}>
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
        <div className="login-tabs" role="tablist" aria-label="Account" style={{ display: 'flex', gap: 24, marginBottom: 28, borderBottom: '1px solid rgba(107,66,38,0.1)' }}>
          <button
            className={`login-tab${tab === 'login' ? ' is-active' : ''}`}
            role="tab"
            aria-selected={tab === 'login'}
            onClick={() => setTab('login')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 15,
              fontWeight: tab === 'login' ? 700 : 600,
              color: tab === 'login' ? 'var(--brown)' : 'var(--text-soft)',
              paddingTop: 10,
              paddingBottom: 14,
              borderBottom: tab === 'login' ? '2px solid var(--brown)' : 'none',
            }}
          >
            Log In
          </button>
          <button
            className={`login-tab${tab === 'signup' ? ' is-active' : ''}`}
            role="tab"
            aria-selected={tab === 'signup'}
            onClick={() => setTab('signup')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 15,
              fontWeight: tab === 'signup' ? 700 : 600,
              color: tab === 'signup' ? 'var(--brown)' : 'var(--text-soft)',
              paddingTop: 10,
              paddingBottom: 14,
              borderBottom: tab === 'signup' ? '2px solid var(--brown)' : 'none',
            }}
          >
            Sign Up
          </button>
        </div>

        {tab === 'login' && (
          <div style={{ textAlign: 'center', maxWidth: 520, margin: '0 auto 28px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brown)' }}>Welcome back</div>
            <h1 className="serif" style={{ margin: '12px 0 0', fontSize: 'clamp(30px, 4.4vw, 44px)', lineHeight: 1.1, letterSpacing: '-0.015em', fontWeight: 700, textWrap: 'balance' }}>
              Log in to Rooted Together
            </h1>
            <p style={{ margin: '14px 0 0', fontSize: 16, lineHeight: 1.6, color: '#6F5846' }}>
              One account for the app and the marketplace. Use the same details you use in the app.
            </p>
          </div>
        )}
        <div
          style={
            tab === 'signup' && wide
              ? undefined
              : { width: '100%', maxWidth: 520, margin: '0 auto', background: '#fff', border: '1px solid #EADBC8', borderRadius: 28, padding: 'clamp(24px, 5vw, 40px)' }
          }
        >
          {tab === 'login' ? <LoginForm router={router} /> : <SignupForm router={router} onWide={setWide} />}
        </div>

        {/* Brand + app downloads. The footer's own copy is hidden on this page so it appears once. */}
        <style>{'.footer-brand{display:none !important;}'}</style>
        <div style={{ marginTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
          <span className="serif" style={{ fontSize: 19, fontWeight: 700, color: 'var(--brown)' }}>Rooted Together</span>
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 260 }}>
            A faith-based mentorship community — on the app, and now in the marketplace.
          </div>
          <div style={{ marginTop: 10 }}>
            <StoreBadges align="center" showLabel={false} />
          </div>
        </div>
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
        style={{ background: 'none', border: 'none', fontSize: 12.5, fontWeight: 600, color: 'var(--brown)', alignSelf: 'flex-end', padding: '8px 0' }}
      >
        Forgot password?
      </button>
      <button type="submit" disabled={busy} className="btn btn-primary" style={{ marginTop: 4 }}>
        {busy ? 'Logging in…' : 'Log In'}
      </button>
    </form>
  );
}

const CREATOR_FEATURES = [
  'Your own storefront and link, on the web and in the app',
  'Sell courses, ebooks, audiobooks, printables, routines and bookings',
  'Get paid straight to your bank through Stripe',
  null,
  'No subscription for your storefront',
];

function PlanCheck({ color, children }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 15.5, lineHeight: 1.5 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', marginTop: 4 }}>
        <path d="M5 12l4 4 10-10" />
      </svg>
      <span>{children}</span>
    </div>
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
        : 'Choose how you want to start. Pay once on our secure checkout, and you will land right back here to set up your account. We also email you a sign-up link.';

  const deep = '#2E1B10';
  const gold = '#C8923F';
  const tan = '#E8CDA8';
  const muted = '#6F5846';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40, color: deep }}>
      <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brown)' }}>Creator accounts</div>
        <h1 className="serif" style={{ margin: '14px 0 0', fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 1.08, letterSpacing: '-0.015em', fontWeight: 700, textWrap: 'balance' }}>
          {heading}
        </h1>
        <p style={{ margin: '18px 0 0', fontSize: 18, lineHeight: 1.65, color: muted }}>{intro}</p>
      </div>

      {gate !== 'claimed' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 24, alignItems: 'stretch' }}>
          {/* Creator membership */}
          <section style={{ display: 'flex', flexDirection: 'column', background: '#F1E4D3', borderRadius: 28, padding: 'clamp(24px, 4vw, 36px)' }}>
            <span style={{ alignSelf: 'flex-start', padding: '5px 14px', borderRadius: 999, background: '#FBF6EF', color: 'var(--brown)', fontSize: 12, fontWeight: 700 }}>
              Creator membership
            </span>
            <div style={{ marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <b className="serif" style={{ fontSize: 64, lineHeight: 1, color: 'var(--brown)' }}>$49</b>
              <span style={{ fontSize: 15, color: muted }}>one-time payment</span>
            </div>
            <hr style={{ border: 0, height: 1, background: '#EADBC8', margin: '24px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
              {CREATOR_FEATURES.map((f, i) => (
                <PlanCheck key={i} color="var(--brown)">
                  {f ?? <><b>10% Rooted Together fee</b> on each sale, plus Stripe&rsquo;s card fee</>}
                </PlanCheck>
              ))}
            </div>
            <a
              href={ONBOARDING_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 54, borderRadius: 999, background: 'var(--brown)', color: '#fff', fontSize: 16.5, fontWeight: 600, textDecoration: 'none' }}
            >
              Join for $49
            </a>
          </section>

          {/* Creator Pro */}
          <section style={{ display: 'flex', flexDirection: 'column', background: deep, color: '#FBF6EF', borderRadius: 28, padding: 'clamp(24px, 4vw, 36px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ padding: '5px 14px', borderRadius: 999, background: gold, color: deep, fontSize: 12, fontWeight: 700 }}>Creator Pro</span>
              <span style={{ fontSize: 13.5, color: tan }}>Everything in the membership, and more</span>
            </div>
            <div style={{ marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <b className="serif" style={{ fontSize: 64, lineHeight: 1 }}>$88</b>
              <span style={{ fontSize: 15, color: tan }}>first year, then $39 a year</span>
            </div>
            <hr style={{ border: 0, height: 1, background: 'rgba(232,205,168,0.28)', margin: '24px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
              <PlanCheck color={gold}><b>Everything in the $49 membership,</b> plus a year of Pro</PlanCheck>
              <PlanCheck color={gold}><b>5% Rooted Together fee</b> on each sale, half the standard rate, plus Stripe&rsquo;s card fee</PlanCheck>
              <PlanCheck color={gold}><b>Rooted Pro badge</b> and priority placement in your category</PlanCheck>
              <PlanCheck color={gold}><b>Creator Academy:</b> selling more, social content and storefront training</PlanCheck>
              <PlanCheck color={gold}>Templates, swipe files and a 30-day launch plan</PlanCheck>
            </div>
            <a
              href={PRO_JOIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 54, borderRadius: 999, background: gold, color: deep, fontSize: 16.5, fontWeight: 700, textDecoration: 'none' }}
            >
              Get Creator Pro for $88
            </a>
            <p style={{ margin: '14px 0 0', textAlign: 'center', fontSize: 13, lineHeight: 1.5, color: tan }}>
              Pro renews at $39 a year. Cancel any time in your dashboard.
            </p>
          </section>
        </div>
      )}

      {/* Already paid */}
      <section
        style={{
          width: '100%', maxWidth: 760, margin: '0 auto', background: '#fff', border: '1px solid #EADBC8', borderRadius: 22,
          padding: '28px 32px', display: 'flex', flexWrap: 'wrap', gap: '20px 32px', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ flex: '1 1 260px' }}>
          <h2 className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.25 }}>Already paid?</h2>
          <p style={{ margin: '6px 0 0', fontSize: 14.5, lineHeight: 1.55, color: muted }}>
            Enter the email you paid with and we will send your sign-up link again.
          </p>
        </div>
        <div style={{ flex: '1 1 320px' }}>
          {sent ? (
            <div className="success-banner" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
              If that email has an unused membership, a sign-up link is on its way. Check your inbox and spam. Still stuck? Write to admin@rootedtogether.club.
            </div>
          ) : (
            <form onSubmit={resend} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <label htmlFor="paid-email" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                Email you paid with
              </label>
              <input
                id="paid-email"
                className="input-field"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ flex: '1 1 180px', minWidth: 0 }}
              />
              <button type="submit" disabled={busy} className="btn btn-outline">
                {busy ? 'Sending…' : 'Email me my link'}
              </button>
            </form>
          )}
        </div>
      </section>
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
function SignupForm({ router, onWide }) {
  const searchParams = useSearchParams();
  const [role, setRole] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [religion, setReligion] = useState('');
  // Church / Ministry essentials. Everything else is asked on /complete-profile.
  const [org, setOrg] = useState({
    name: '', type: '', denomination: '', city: '', country: '', contactName: '', contactRole: '',
  });
  const setOrgField = (key, value) => setOrg((prev) => ({ ...prev, [key]: value }));
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
  // Invited founders arrive from the private invitation page with ?invite=<token>. The
  // $49 is waived for them; submit-signup checks the token against the invitations table.
  const rawInvite = searchParams.get('invite') || '';
  const inviteToken = /^[a-f0-9]{64}$/.test(rawInvite) ? rawInvite : '';
  const [gate, setGate] = useState(sessionId ? 'checking' : inviteToken ? 'ok' : 'needs_payment');
  const [paidEmail, setPaidEmail] = useState('');
  const [paidReferral, setPaidReferral] = useState('');
  const referralCode = urlReferralCode || paidReferral;

  useEffect(() => {
    if (!sessionId) {
      setGate(inviteToken ? 'ok' : 'needs_payment');
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
  }, [sessionId, inviteToken]);

  // Tell the page shell when to use the full-width join-first layout.
  useEffect(() => {
    if (onWide) onWide(gate === 'needs_payment' || gate === 'claimed' || gate === 'error');
    return () => {
      if (onWide) onWide(false);
    };
  }, [gate, onWide]);

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

    let fields;
    if (role === 'church') {
      // Church sign-ups have no date of birth; the person filling the form is
      // recorded as the (private) contact, and the organisation is the profile.
      fields = {
        'Organisation Name': org.name.trim(),
        'Organisation Type': org.type,
        Denomination: org.denomination.trim(),
        City: org.city.trim(),
        Country: org.country.trim(),
        'Contact Name': org.contactName.trim(),
        'Contact Role': org.contactRole.trim(),
        Email: email,
      };
    } else {
      fields = { Name: name, Email: email, 'Date of Birth': dob };
      if (role === 'seeker') fields.Religion = religion;
    }

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
          inviteToken: inviteToken || undefined,
          referredByCode: referralCode.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.code === 'membership_required' && inviteToken && !sessionId) {
          setError('This invitation is no longer active. Please write to admin@rootedtogether.club and we will sort it out.');
          setBusy(false);
          return;
        }
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

      {role === 'church' ? (
        <>
          <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            Your church or ministry goes live as soon as you sign up. You can add more detail (trust and verification,
            contact and reference details) on the next page. Contact details are kept private.
          </div>
          <div>
            <label className="field-label">Church or ministry name</label>
            <input className="input-field" required value={org.name} onChange={(e) => setOrgField('name', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Type of organisation</label>
            <select className="input-field" required value={org.type} onChange={(e) => setOrgField('type', e.target.value)}>
              <option value="">Select…</option>
              {CHURCH_TYPE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Denomination or tradition (optional)</label>
            <input className="input-field" value={org.denomination} onChange={(e) => setOrgField('denomination', e.target.value)} placeholder="e.g. Baptist, Pentecostal, non-denominational" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="field-label">City</label>
              <input className="input-field" required value={org.city} onChange={(e) => setOrgField('city', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Country</label>
              <input className="input-field" required value={org.country} onChange={(e) => setOrgField('country', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="field-label">Your name</label>
              <input className="input-field" required value={org.contactName} onChange={(e) => setOrgField('contactName', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Your role</label>
              <input className="input-field" value={org.contactRole} onChange={(e) => setOrgField('contactRole', e.target.value)} placeholder="e.g. Senior Pastor" />
            </div>
          </div>
        </>
      ) : (
        <div>
          <label className="field-label">Name</label>
          <input className="input-field" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      )}
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
      {role !== 'church' && (
        <div>
          <label className="field-label">Date of birth</label>
          <DateOfBirthField required value={dob} onChange={setDob} />
        </div>
      )}
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
      <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, textAlign: 'center', margin: 0 }}>
        By creating an account you agree to our{' '}
        <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Terms of Service</a>
        {' '}and{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Privacy Policy</a>.
      </p>
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
