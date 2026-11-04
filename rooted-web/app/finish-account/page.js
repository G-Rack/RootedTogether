'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/SessionProvider';
import DateOfBirthField from '@/components/DateOfBirthField';
import { safeNext } from '@/lib/buyerAccount';
import { FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/lib/config';

// Where Google and Apple sign-in land. Someone who already has an account goes
// straight on. A new person confirms their name and date of birth, which makes
// their free buyer account complete.
function FinishAccountInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { session, profile, isCreator, loading } = useSession();
  const next = safeNext(params.get('next'));
  const referralCode = params.get('ref') || '';
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const metaName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || '';

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (profile) router.replace(next || (isCreator ? '/dashboard' : '/'));
  }, [loading, session, profile, isCreator, next, router]);

  if (loading || !session || profile) {
    return (
      <div className="container" style={{ paddingBlock: 48 }}>
        <div className="skeleton" style={{ height: 240, maxWidth: 520, margin: '0 auto' }} />
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      setError('Please choose your full date of birth.');
      return;
    }
    setBusy(true);
    let body = {};
    let ok = false;
    try {
      const res = await fetch(`${FUNCTIONS_URL}/finish-social-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ name: (name || metaName).trim(), dob, referralCode }),
      });
      body = await res.json().catch(() => ({}));
      ok = res.ok && body.ok;
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setBusy(false);
      return;
    }
    if (!ok) {
      setBusy(false);
      setError(body.error || "Couldn't finish your account right now.");
      return;
    }
    // A full load so the whole site picks up the new account straight away.
    window.location.assign(next || '/');
  };

  return (
    <div className="container" style={{ paddingBlock: '56px 72px' }}>
      <div style={{ width: '100%', maxWidth: 520, margin: '0 auto', background: '#fff', border: '1px solid #EADBC8', borderRadius: 28, padding: 'clamp(24px, 5vw, 40px)' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brown)' }}>One last step</div>
        <h1 className="serif" style={{ margin: '10px 0 0', fontSize: 'clamp(28px, 4vw, 36px)', lineHeight: 1.1, fontWeight: 700 }}>Finish your free account</h1>
        <p className="muted" style={{ margin: '10px 0 22px', fontSize: 15.5, lineHeight: 1.55 }}>
          You are signed in as {session.user.email}. Confirm two details and you are ready to browse and buy.
        </p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div className="error-banner" role="alert">{error}</div>}
          <div>
            <label className="field-label" htmlFor="fin-name">Your name</label>
            <input id="fin-name" className="input-field" required autoComplete="name" value={name || metaName} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Date of birth</label>
            <DateOfBirthField required value={dob} onChange={setDob} />
          </div>
          <button type="submit" disabled={busy} className="btn btn-primary" style={{ marginTop: 4 }}>
            {busy ? 'Finishing…' : 'Finish account'}
          </button>
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, textAlign: 'center', margin: 0 }}>
            By continuing you agree to our{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Privacy Policy</a>.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function FinishAccountPage() {
  return (
    <Suspense fallback={null}>
      <FinishAccountInner />
    </Suspense>
  );
}
