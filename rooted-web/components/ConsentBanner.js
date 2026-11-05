'use client';

import { useEffect, useState } from 'react';
import { GOOGLE_TAG_ID, setConsent } from '@/lib/tracking';

// A small bar at the bottom of the page, shown only to visitors who must be asked first
// (EU/EEA, UK, Switzerland). Everyone else is not interrupted. The choice is remembered on this
// device, and can be changed any time from the Privacy page.
export default function ConsentBanner({ privacyHref = '/privacy' }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (GOOGLE_TAG_ID && window.__rtAskConsent) setShow(true);
  }, []);

  if (!show) return null;
  const choose = (granted) => {
    setConsent(granted);
    setShow(false);
  };
  const btn = { padding: '10px 18px', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };

  return (
    <div
      role="dialog"
      aria-label="Cookie choices"
      style={{
        position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 9999, maxWidth: 720, margin: '0 auto',
        background: '#FBF6EF', color: '#2E1B10', border: '1px solid #EADBC8', borderRadius: 18,
        boxShadow: '0 12px 36px rgba(46,27,16,0.22)', padding: '16px 18px',
        display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between',
      }}
    >
      <p style={{ margin: 0, flex: '1 1 320px', fontSize: 14, lineHeight: 1.55, color: '#6F5846' }}>
        We use cookies to measure how our adverts perform. You can say no and everything still works.{' '}
        <a href={privacyHref} style={{ color: '#6B4226', textDecoration: 'underline' }}>Privacy Policy</a>
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => choose(false)} style={{ ...btn, background: '#fff', color: '#6B4226', border: '1.5px solid #EADBC8' }}>Decline</button>
        <button type="button" onClick={() => choose(true)} style={{ ...btn, background: '#6B4226', color: '#fff', border: '1.5px solid #6B4226' }}>Allow</button>
      </div>
    </div>
  );
}
