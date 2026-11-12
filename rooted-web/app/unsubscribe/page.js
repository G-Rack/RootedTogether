'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SUPABASE_URL } from '@/lib/config';

// Where the Unsubscribe link in marketing emails lands. The person taps one button and is taken off
// our marketing emails for good. The link carries a signed code, so nobody can unsubscribe someone else.
function UnsubscribeInner() {
  const params = useSearchParams();
  const email = params.get('e') || '';
  const code = params.get('t') || '';
  const invalid = params.get('invalid') === '1' || !email || !code;
  const [state, setState] = useState('idle'); // idle | working | done | error

  async function unsubscribe() {
    setState('working');
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/email-unsubscribe?e=${encodeURIComponent(email)}&t=${encodeURIComponent(code)}`,
        { method: 'POST' },
      );
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  let title = 'Unsubscribe';
  let message = `Stop marketing emails to ${email}? You will still get emails about your account and purchases.`;
  if (invalid) {
    title = 'Link not valid';
    message = 'This unsubscribe link is not valid. Please use the link in the most recent email, or reply to it and we will remove you.';
  } else if (state === 'done') {
    title = 'You are unsubscribed';
    message = 'You will not get any more marketing emails from Rooted Together.';
  } else if (state === 'error') {
    message = 'Something went wrong. Please try again, or reply to the email and we will remove you.';
  }

  return (
    <div className="container" style={{ paddingBlock: '72px 88px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', background: '#fff', border: '1px solid #EADBC8', borderRadius: 28, padding: 'clamp(28px, 5vw, 44px)' }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 'clamp(28px, 4vw, 36px)', lineHeight: 1.1, fontWeight: 700 }}>{title}</h1>
        <p className="muted" style={{ margin: '12px 0 24px', fontSize: 15.5, lineHeight: 1.6 }}>{message}</p>
        {!invalid && state !== 'done' && (
          <button type="button" className="btn btn-primary" onClick={unsubscribe} disabled={state === 'working'}>
            {state === 'working' ? 'Working...' : 'Unsubscribe'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeInner />
    </Suspense>
  );
}
