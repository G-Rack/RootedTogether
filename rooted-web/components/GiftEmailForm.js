'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getAttribution, sendMeta } from '@/lib/tracking';
import { track as trackSite } from '@/lib/analytics';

// The "Download" box for a free gift (an offering with a gift_slug, such as Deborah's Gift). Instead of
// asking people to sign in, it asks for their email. The gift is sent to that address and, with it, they
// are subscribed to the free daily devotional (the notice under the box says so). Uses the same /api/gift
// route as rootedtogether.club/gift, which saves the email, records the devotional consent and sends the email.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function GiftEmailForm({ offering }) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // hidden field: real people leave it empty
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const clean = email.trim().toLowerCase();
    if (!EMAIL.test(clean)) { setError('Please enter a valid email address.'); return; }
    setBusy(true);
    try {
      const attr = getAttribution();
      const res = await fetch('/api/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: clean,
          website,
          campaign: offering.gift_slug,
          send_gift: true,
          devotional: true,
          utm_source: attr.utm_source || 'offering_page',
          utm_campaign: attr.utm_campaign || '',
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) { setError(json?.error || 'Something went wrong. Please try again.'); return; }
      trackSite('gift_claimed', { props: { offering_id: offering.id, gift: offering.gift_slug } });
      if (json.saved) sendMeta('GiftClaimed', { content_name: offering.gift_slug }, '', true);
      setDone(true);
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="success-banner" role="status">
        Thank you. Your gift is on its way to your inbox. You are also now subscribed to our free daily devotional.
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 10 }}>
      <label className="field-label" htmlFor="gift-email" style={{ margin: 0 }}>Where should we send it?</label>
      <input
        id="gift-email"
        className="input-field"
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
      {error && <div className="error-banner" role="alert">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Please wait…' : 'Email me the gift'}
      </button>
      <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, margin: 0, textAlign: 'center' }}>
        We will email you the gift. You will also be subscribed to our free daily devotional (a verse, a short
        reflection and a prayer each morning). Unsubscribe any time.{' '}
        <Link href="/privacy" style={{ textDecoration: 'underline' }}>Privacy Policy</Link>
      </p>
    </form>
  );
}
