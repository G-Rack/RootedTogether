'use client';

import { useState } from 'react';
import { SOCIAL_LOGIN } from '@/lib/config';
import { signInWithProvider } from '@/lib/buyerAccount';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

const BASE = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', minHeight: 50,
  borderRadius: 999, fontSize: 15.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};

// "Continue with Google / Apple" plus an "or" divider. Shows nothing until a
// provider is switched on in lib/config.js (SOCIAL_LOGIN).
export default function SocialAuthButtons({ next, referralCode }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  if (!SOCIAL_LOGIN.google && !SOCIAL_LOGIN.apple) return null;

  const go = async (provider) => {
    setError('');
    setBusy(provider);
    const result = await signInWithProvider(provider, { next, referralCode });
    // On success the browser is already leaving for the provider.
    if (result.error) {
      setBusy('');
      setError("Couldn't start that sign-in. Please try again, or use your email.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {SOCIAL_LOGIN.apple && (
        <button type="button" disabled={!!busy} onClick={() => go('apple')} style={{ ...BASE, background: '#000', color: '#fff', border: '1.5px solid #000' }}>
          <AppleMark />
          {busy === 'apple' ? 'Opening Apple…' : 'Continue with Apple'}
        </button>
      )}
      {SOCIAL_LOGIN.google && (
        <button type="button" disabled={!!busy} onClick={() => go('google')} style={{ ...BASE, background: '#fff', color: '#2E1B10', border: '1.5px solid #E8CDA8' }}>
          <GoogleMark />
          {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, color: '#6F5846', fontSize: 13 }} aria-hidden="true">
        <span style={{ flex: 1, height: 1, background: '#EADBC8' }} />
        or with your email
        <span style={{ flex: 1, height: 1, background: '#EADBC8' }} />
      </div>
    </div>
  );
}
