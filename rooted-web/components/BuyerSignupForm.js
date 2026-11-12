'use client';

import { useState } from 'react';
import PasswordField from '@/components/PasswordField';
import DateOfBirthField from '@/components/DateOfBirthField';
import { createBuyerAccount } from '@/lib/buyerAccount';
import SocialAuthButtons from '@/components/SocialAuthButtons';
import DevotionalOptIn from '@/components/DevotionalOptIn';

// The short, free sign-up for people who are here to buy. Used on the sign-up
// page and inside the "Almost there" window on an offering. Calls onDone(true)
// when the account exists and the person is signed in.
export default function BuyerSignupForm({ onDone, referralCode = '', submitLabel = 'Create account', next = '' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [devotional, setDevotional] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      setError('Please choose your full date of birth.');
      return;
    }
    setBusy(true);
    const result = await createBuyerAccount({ name, email, dob, password, referralCode, devotional });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!result.signedIn) {
      setError(result.error);
      return;
    }
    onDone(true);
  };

  return (
    <>
    <SocialAuthButtons next={next} referralCode={referralCode} />
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div>
        <label className="field-label" htmlFor="buyer-name">Your name</label>
        <input id="buyer-name" className="input-field" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="buyer-email">Email</label>
        <input id="buyer-email" className="input-field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="field-label">Date of birth</label>
        <DateOfBirthField required value={dob} onChange={setDob} />
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
      <DevotionalOptIn checked={devotional} onChange={setDevotional} />
      <button type="submit" disabled={busy} className="btn btn-primary" style={{ marginTop: 4 }}>
        {busy ? 'Creating account…' : submitLabel}
      </button>
      <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, textAlign: 'center', margin: 0 }}>
        By creating an account you agree to our{' '}
        <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Terms of Service</a>
        {' '}and{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Privacy Policy</a>.
      </p>
    </form>
    </>
  );
}
