'use client';

import { useState } from 'react';
import Link from 'next/link';

const POINTS = [
  { title: 'Sell what you teach', body: 'Courses, ebooks, audiobooks, daily routines, bundles and 1:1 calls, all in one storefront.' },
  { title: 'A community that came to grow', body: 'Rooted Together is a faith-based mentorship community. Your work sits next to Mothers, Pastors and Spiritual Leaders people already trust.' },
  { title: 'You set the price', body: 'Choose what each offering costs, offer a free preview of Lesson 1, and run a launch price when you are ready.' },
];

export default function CreatorsPage() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // hidden field: real people leave it empty
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website, list: 'creator_waitlist' }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) setDone(true);
      else setError(json?.error || 'Something went wrong. Please try again.');
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: 'var(--cream)' }}>
      <div className="container" style={{ maxWidth: 760, paddingBlock: '64px 96px' }}>
        <span className="badge">FOR CREATORS</span>
        <h1 className="serif" style={{ fontSize: 40, fontWeight: 700, color: 'var(--brown)', lineHeight: 1.15, margin: '14px 0 12px' }}>
          Sell on Rooted Together
        </h1>
        <p className="muted" style={{ fontSize: 16.5, lineHeight: 1.65, margin: '0 0 32px', maxWidth: 620 }}>
          Teach, mentor and share your gifts with a community that is looking for exactly that. Join the creator waitlist and we will email you when your spot opens.
        </p>

        <div className="card" style={{ padding: 24, marginBottom: 36 }}>
          {done ? (
            <div className="success-banner" role="status">
              You are on the list. We will email you when creator spots open.
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <label className="field-label" htmlFor="creator-email">Your email</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  id="creator-email"
                  className="input-field"
                  style={{ flex: '1 1 240px', minWidth: 0 }}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                />
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Please wait…' : 'Join the creator waitlist'}
                </button>
              </div>
              {error && <div className="error-banner" role="alert" style={{ marginTop: 12 }}>{error}</div>}
              <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                We only use your email to tell you about creator access. See our <Link href="/privacy" style={{ textDecoration: 'underline' }}>privacy policy</Link>.
              </div>
            </form>
          )}
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          {POINTS.map((p) => (
            <div key={p.title} className="card" style={{ padding: '18px 22px' }}>
              <div className="serif" style={{ fontSize: 19, fontWeight: 700, color: 'var(--brown)', marginBottom: 4 }}>{p.title}</div>
              <div className="muted" style={{ fontSize: 14.5, lineHeight: 1.6 }}>{p.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
