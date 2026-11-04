'use client';

import { ONBOARDING_URL } from '@/lib/config';

function Tick({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', marginTop: 3 }}>
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}

// The first thing someone sees on Sign Up: are you here to buy, or to sell?
// Buyer is free and quick. Creator goes on to the existing creator flow.
export default function SignupChooser({ onBuyer, onCreator }) {
  const buyerPoints = [
    'Buy courses, audiobooks, printables, templates and more',
    'Book 1:1 calls with Spiritual Mothers, Pastors and Leaders',
    'Everything you get stays in your library',
    'Follow creators and join their Spiritual Family',
  ];
  const creatorPoints = [
    'Your own storefront, on the web and in the app',
    'Sell courses, ebooks, audiobooks, printables, templates, routines, bundles and calls',
    'Paid to your bank through Stripe',
    'Churches and ministries welcome',
  ];
  return (
    <div style={{ width: '100%', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brown)' }}>Sign up</div>
        <h1 className="serif" style={{ margin: '14px 0 0', fontSize: 'clamp(32px, 4.6vw, 48px)', lineHeight: 1.08, letterSpacing: '-0.02em', fontWeight: 700, textWrap: 'balance' }}>
          How will you use Rooted Together?
        </h1>
        <p style={{ margin: '14px 0 0', fontSize: 17, lineHeight: 1.6, color: '#6F5846' }}>
          Choose the one that fits today. It is the same login either way, and a creator can always shop too.
        </p>
      </div>

      <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 22, alignItems: 'stretch' }}>
        <section aria-labelledby="buyer-h" style={{ display: 'flex', flexDirection: 'column', padding: 'clamp(22px, 3vw, 36px)', borderRadius: 28, background: '#fff', border: '2px solid var(--brown)' }}>
          <span style={{ alignSelf: 'flex-start', padding: '5px 14px', borderRadius: 999, background: 'var(--brown)', color: '#FBF6EF', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>MOST PEOPLE</span>
          <h2 id="buyer-h" className="serif" style={{ margin: '18px 0 0', fontSize: 28, lineHeight: 1.15, fontWeight: 700 }}>I’m here to learn and buy</h2>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <b className="serif" style={{ fontSize: 44, lineHeight: 1, color: 'var(--brown)' }}>Free</b>
            <span style={{ fontSize: 15, color: '#6F5846' }}>no membership fee</span>
          </div>
          <ul style={{ margin: '20px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11, fontSize: 15.5, lineHeight: 1.5 }}>
            {buyerPoints.map((t) => (
              <li key={t} style={{ display: 'flex', gap: 12 }}><Tick color="#6B4226" />{t}</li>
            ))}
          </ul>
          <div style={{ flex: 1, minHeight: 24 }} />
          <button type="button" className="btn btn-primary" onClick={onBuyer} style={{ minHeight: 52, fontSize: 16 }}>Create a free account</button>
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 13, color: '#6F5846' }}>Just your name, email, date of birth and a password.</div>
        </section>

        <section aria-labelledby="creator-h" style={{ display: 'flex', flexDirection: 'column', padding: 'clamp(22px, 3vw, 36px)', borderRadius: 28, background: '#2E1B10', color: '#FBF6EF' }}>
          <span style={{ alignSelf: 'flex-start', padding: '5px 14px', borderRadius: 999, background: '#C8923F', color: '#2E1B10', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>FOR CREATORS</span>
          <h2 id="creator-h" className="serif" style={{ margin: '18px 0 0', fontSize: 28, lineHeight: 1.15, fontWeight: 700 }}>I want to sell what I teach</h2>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <b className="serif" style={{ fontSize: 44, lineHeight: 1, color: '#C8923F' }}>$49</b>
            <span style={{ fontSize: 15, color: '#E8CDA8' }}>one-time membership</span>
          </div>
          <ul style={{ margin: '20px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11, fontSize: 15.5, lineHeight: 1.5 }}>
            {creatorPoints.map((t) => (
              <li key={t} style={{ display: 'flex', gap: 12 }}><Tick color="#C8923F" />{t}</li>
            ))}
          </ul>
          <div style={{ flex: 1, minHeight: 24 }} />
          <button type="button" onClick={onCreator} style={{ minHeight: 52, border: 0, borderRadius: 999, background: '#C8923F', color: '#2E1B10', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Join as a creator</button>
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 13, color: '#E8CDA8' }}>
            Creator Pro, $88 for your first year, is there too.{' '}
            <a href={ONBOARDING_URL} style={{ textDecoration: 'underline', color: '#FBF6EF' }}>Learn more</a>
          </div>
        </section>
      </div>
    </div>
  );
}
