'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/lib/config';
import { track as trackSite } from '@/lib/analytics';

// On an offering page, for people who bought without an account (guest checkout).
//  - Back from Stripe (?purchase=success&guest=1&session_id=...): asks guest-checkout-claim to
//    confirm the payment. A brand-new account is signed in on this device straight away and can
//    choose a password. An email that already had an account is asked to log in.
//  - From the "How to open" email (?access=1): lets them get a sign-in link by email.

const box = { maxWidth: 760, margin: '20px auto 0', padding: '18px 20px', fontSize: 16, lineHeight: 1.6 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function GuestCheckoutReturn() {
  const { id } = useParams();
  const params = useSearchParams();
  const { session, loading } = useSession();
  const sessionId = params.get('purchase') === 'success' && params.get('guest') === '1' ? params.get('session_id') || '' : '';
  const wantsAccess = params.get('access') === '1';

  const [status, setStatus] = useState(''); // checking | signed_in | existing | waiting | error
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [pwDone, setPwDone] = useState(false);
  const [email, setEmail] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !sessionId || session) return undefined;
    let active = true;
    (async () => {
      await sleep(0);
      if (!active) return;
      setStatus('checking');
      for (let attempt = 0; attempt < 6 && active; attempt += 1) {
        let body = null;
        try {
          const res = await fetch(`${FUNCTIONS_URL}/guest-checkout-claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ session_id: sessionId, offering_id: id }),
          });
          body = await res.json().catch(() => null);
          if (!res.ok) {
            if (!active) return;
            setStatus('error');
            setMessage(body?.error || 'Your payment went through. Check your email for how to open your purchase.');
            return;
          }
        } catch {
          body = null;
        }
        if (!active) return;
        if (body?.paid === false || !body) { await sleep(2000); continue; }
        if (body.signin && body.token_hash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: body.token_hash, type: 'magiclink' });
          if (!active) return;
          if (error) { setStatus('error'); setMessage('Your payment went through. Check your email for how to open your purchase.'); return; }
          trackSite('guest_signed_in', { props: { offering_id: id } });
          setStatus('signed_in');
          return;
        }
        setStatus(body.existing ? 'existing' : 'error');
        if (!body.existing) setMessage('Your payment went through. Check your email for how to open your purchase.');
        return;
      }
      if (active) { setStatus('waiting'); setMessage('Your payment is still being confirmed. Refresh this page in a minute, or check your email.'); }
    })();
    return () => { active = false; };
  }, [loading, sessionId, session, id]);

  const savePassword = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setMessage('Please choose a password of at least 8 characters.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setMessage("Couldn't save that password. You can set one later with Forgot password on the log-in page."); return; }
    setMessage('');
    setPwDone(true);
  };

  const sendLink = async (e) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) { setMessage('Please enter a valid email address.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/offering/${id}` },
    });
    setBusy(false);
    // Same answer whether or not the email has an account, so nobody can test which emails exist.
    if (error && error.status === 429) { setMessage('Too many emails requested. Please wait a few minutes and try again.'); return; }
    setMessage('');
    setLinkSent(true);
  };

  if (sessionId && !session && (status === 'checking' || status === '')) {
    return <div className="container"><div className="card" style={box} role="status">Thank you. Confirming your payment and opening your purchase…</div></div>;
  }
  if (status === 'signed_in' && session) {
    return (
      <div className="container">
        <div className="card" style={box} role="status">
          <strong>Thank you, your purchase is open below.</strong> We made a free account for you with your checkout email.
          {pwDone ? (
            <div style={{ marginTop: 10 }}>Password saved. You can now log in on any device.</div>
          ) : (
            <form onSubmit={savePassword} style={{ marginTop: 12 }}>
              <label htmlFor="guest-pw" className="field-label" style={{ fontSize: 15 }}>Choose a password to open it on any device (optional)</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input id="guest-pw" className="input-field" style={{ flex: '1 1 220px', fontSize: 16 }} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="submit" className="btn btn-primary" disabled={busy} style={{ fontSize: 16 }}>{busy ? 'Please wait…' : 'Save password'}</button>
              </div>
            </form>
          )}
          {message && <div className="error-banner" role="alert" style={{ marginTop: 10, fontSize: 15 }}>{message}</div>}
        </div>
      </div>
    );
  }
  if (status === 'existing' && !session) {
    return (
      <div className="container">
        <div className="card" style={box} role="status">
          <strong>Thank you, your payment went through.</strong> That email already has a Rooted Together account, so we added it there.{' '}
          <Link href={`/login?next=${encodeURIComponent(`/offering/${id}`)}`} style={{ fontWeight: 700, textDecoration: 'underline' }}>Log in to open it</Link>.
        </div>
      </div>
    );
  }
  if ((status === 'error' || status === 'waiting') && !session) {
    return <div className="container"><div className="card" style={box} role="status">{message}</div></div>;
  }
  if (wantsAccess && !session && !loading) {
    return (
      <div className="container">
        <div className="card" style={box}>
          {linkSent ? (
            <div role="status">If that email has an account, a sign-in link is on its way. Open it on this device to come back here signed in.</div>
          ) : (
            <form onSubmit={sendLink}>
              <label htmlFor="guest-email" className="field-label" style={{ fontSize: 15 }}>Bought this already? Enter the email you paid with and we will email you a sign-in link.</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input id="guest-email" className="input-field" style={{ flex: '1 1 220px', fontSize: 16 }} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                <button type="submit" className="btn btn-primary" disabled={busy} style={{ fontSize: 16 }}>{busy ? 'Please wait…' : 'Email me a sign-in link'}</button>
              </div>
              {message && <div className="error-banner" role="alert" style={{ marginTop: 10, fontSize: 15 }}>{message}</div>}
            </form>
          )}
        </div>
      </div>
    );
  }
  return null;
}
