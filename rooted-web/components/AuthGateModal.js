'use client';

import { useEffect, useRef, useState } from 'react';
import BuyerSignupForm from '@/components/BuyerSignupForm';
import PasswordField from '@/components/PasswordField';
import { signInWithEmail } from '@/lib/buyerAccount';

// "Almost there": shown when a signed-out visitor taps Buy or Download on an
// offering. They can make a free account, or log in, without leaving the page.
export default function AuthGateModal({ open, onClose, onSignedIn, offeringTitle, priceLabel }) {
  const [mode, setMode] = useState('signup'); // 'signup' | 'login'
  const dialogRef = useRef(null);
  // Keep the latest onClose without re-running the focus effect on every render.
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    const previous = document.activeElement;
    // Move focus into the window so keyboard and screen-reader users land in it.
    const timer = setTimeout(() => {
      dialogRef.current?.querySelector('input, button')?.focus();
    }, 30);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      if (previous && previous.focus) previous.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(46,27,16,0.58)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '5vh 16px',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-heading"
        style={{
          position: 'relative', width: '100%', maxWidth: 460, boxSizing: 'border-box', background: '#fff',
          borderRadius: 28, padding: 'clamp(24px, 5vw, 36px)', boxShadow: '0 30px 80px rgba(46,27,16,0.35)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', right: 10, top: 10, width: 44, height: 44, border: 0, borderRadius: 999,
            background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer', display: 'grid', placeItems: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        {offeringTitle && (
          <div style={{ marginRight: 36, padding: '10px 14px', borderRadius: 14, background: 'var(--cream)', border: '1px solid #EADBC8' }}>
            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{offeringTitle}</div>
            {priceLabel && <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{priceLabel}</div>}
          </div>
        )}

        <h2 id="gate-heading" className="serif" style={{ margin: '20px 0 0', fontSize: 28, lineHeight: 1.15, fontWeight: 700 }}>
          {mode === 'signup' ? 'Almost there' : 'Welcome back'}
        </h2>
        <p style={{ margin: '8px 0 18px', fontSize: 15, lineHeight: 1.55, color: '#6F5846' }}>
          {mode === 'signup'
            ? 'Create a free account so we can keep this in your library. There is no membership fee.'
            : 'Log in to carry on. Your Rooted Together app login works here too.'}
        </p>

        {mode === 'signup' ? (
          <BuyerSignupForm onDone={onSignedIn} />
        ) : (
          <LoginInline onDone={onSignedIn} />
        )}

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 14.5, color: '#6F5846' }}>
          {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
          <button
            type="button"
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            style={{ background: 'none', border: 0, padding: 0, font: 'inherit', fontWeight: 700, color: 'var(--brown)', textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}
          >
            {mode === 'signup' ? 'Log in' : 'Create a free account'}
          </button>
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #EADBC8', textAlign: 'center', fontSize: 12.5, color: '#6F5846' }}>
          Payment is taken securely by Stripe on the next step.
        </div>
      </div>
    </div>
  );
}

function LoginInline({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const result = await signInWithEmail({ email, password });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone(true);
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div>
        <label className="field-label" htmlFor="gate-login-email">Email</label>
        <input id="gate-login-email" className="input-field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="field-label">Password</label>
        <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </div>
      <button type="submit" disabled={busy} className="btn btn-primary" style={{ marginTop: 4 }}>
        {busy ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  );
}
