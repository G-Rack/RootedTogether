'use client';

import { useEffect, useState } from 'react';
import { GOOGLE_TAG_ID, readConsent, setConsent } from '@/lib/tracking';

// On the Privacy page: shows the current advert-measurement choice and lets the visitor change it.
export default function CookieChoices() {
  const [state, setState] = useState(null); // 'granted' | 'denied' | 'default'
  useEffect(() => {
    setState(readConsent() || 'default');
  }, []);
  if (!GOOGLE_TAG_ID || !state) return null;
  const choose = (granted) => {
    setConsent(granted);
    setState(granted ? 'granted' : 'denied');
  };
  const btn = (active) => ({
    padding: '9px 16px', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? '#6B4226' : '#fff', color: active ? '#fff' : '#6B4226', border: '1.5px solid #6B4226',
  });
  return (
    <div style={{ marginTop: 14, padding: 16, border: '1px solid #EADBC8', borderRadius: 14, background: '#FBF6EF' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#2E1B10' }}>Your choice on this device</div>
      <p style={{ margin: '6px 0 12px', fontSize: 13.5, lineHeight: 1.55, color: '#6F5846' }}>
        {state === 'granted' && 'Advert measurement is allowed.'}
        {state === 'denied' && 'Advert measurement is switched off.'}
        {state === 'default' && 'You have not chosen. In the EU, UK and Switzerland, and if your browser sends a Global Privacy Control signal, it stays off until you allow it.'}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => choose(true)} style={btn(state === 'granted')}>Allow</button>
        <button type="button" onClick={() => choose(false)} style={btn(state === 'denied')}>Decline</button>
      </div>
    </div>
  );
}
