'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { reportPaymentLinkPurchase } from '@/lib/reportPurchase';

// Where Stripe sends someone after the $39 Creator Pro upgrade Payment Link (set the link's
// "after payment" redirect to https://rootedtogether.club/thanks?session_id={CHECKOUT_SESSION_ID}).
// Pro itself is switched on by the Stripe webhook; this page thanks them and reports the sale.
function ThanksInner() {
  const params = useSearchParams();
  const sessionId = params.get('session_id') || '';
  useEffect(() => {
    if (sessionId) reportPaymentLinkPurchase(sessionId, 'pro');
  }, [sessionId]);

  return (
    <div className="container" style={{ paddingBlock: '72px 88px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', background: '#fff', border: '1px solid #EADBC8', borderRadius: 28, padding: 'clamp(28px, 5vw, 44px)' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brown)' }}>Payment received</div>
        <h1 className="serif" style={{ margin: '10px 0 0', fontSize: 'clamp(28px, 4vw, 36px)', lineHeight: 1.1, fontWeight: 700 }}>Thank you</h1>
        <p className="muted" style={{ margin: '12px 0 24px', fontSize: 15.5, lineHeight: 1.6 }}>
          Your Creator Pro upgrade is on its way. It can take a minute to switch on, and then it is ready in your dashboard.
        </p>
        <Link href="/dashboard" className="btn btn-primary">Go to my dashboard</Link>
      </div>
    </div>
  );
}

export default function ThanksPage() {
  return (
    <Suspense fallback={null}>
      <ThanksInner />
    </Suspense>
  );
}
