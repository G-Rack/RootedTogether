'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

// The creator's setup checklist on the dashboard overview. It reads the live state of the
// three setup tasks from the database (founding_pledge_status).
//   - Creators who joined through an invitation see "Your founding pledge" and, once all
//     three are done, can ask for first access to the app (request_app_access).
//   - Creators who joined with the $49 membership see "Get your storefront ready": the same
//     three tasks, without the app-access step, and the card disappears once all are done.
// Both functions are checked on the server, so nothing here can be faked from the browser.

const svg = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' };

function Tick() {
  return (
    <span style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--success-text)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" {...svg} strokeWidth="3"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </span>
  );
}

function Open() {
  return <span style={{ width: 30, height: 30, borderRadius: 999, border: '2px solid var(--brown-pale, #D9C7B3)', flexShrink: 0 }} />;
}

export default function FoundingPledgeCard() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('founding_pledge_status');
    setStatus(data || null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!status) return null;
  const invited = !!status.invited;

  const offeringsCount = Number(status.offerings_count || 0);
  const tasks = [
    {
      key: 'profile',
      done: !!status.profile_done,
      title: 'Set up your profile',
      detail: 'Add a photo, a banner and the story of your calling.',
      href: '/dashboard/branding',
      cta: 'Go to Branding',
    },
    {
      key: 'offerings',
      done: offeringsCount >= 2,
      title: 'Publish at least 2 offerings',
      detail: `${Math.min(offeringsCount, 2)} of 2 published. A course, ebook, routine or 1:1 calls, paid or free.`,
      href: '/dashboard/upload',
      cta: 'Upload an offering',
    },
    {
      key: 'stripe',
      done: !!status.stripe_done,
      title: 'Connect payouts with Stripe',
      detail: 'So what your community pays reaches your bank.',
      href: '/dashboard/payouts',
      cta: 'Go to Payouts & Sales',
    },
  ];
  const doneCount = tasks.filter((t) => t.done).length;
  const allDone = doneCount === tasks.length;
  // Paid-membership creators have nothing left to unlock once the checklist is complete.
  if (!invited && allDone) return null;
  const requested = !!status.request_status;
  const approved = status.request_status === 'approved';

  const requestAccess = async () => {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.rpc('request_app_access');
    if (err) {
      setError('Something went wrong sending your request. Please try again in a moment.');
    } else {
      await load();
    }
    setBusy(false);
  };

  return (
    <div className="card" style={{ marginBottom: 28, overflow: 'hidden', border: '1px solid var(--success-border)' }}>
      <div style={{ padding: '18px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--brown)' }}>{invited ? 'Your founding pledge' : 'Get your storefront ready'}</span>
          <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{doneCount} of {tasks.length} complete</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: 'var(--cream-dark)', marginTop: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(doneCount / tasks.length) * 100}%`, background: 'var(--success-text)', borderRadius: 999, transition: 'width .3s' }} />
        </div>
        {!invited && (
          <div className="muted" style={{ fontSize: 12.5, marginTop: 10, lineHeight: 1.45 }}>
            Three quick steps so people can find you and you can get paid.
          </div>
        )}
      </div>

      {tasks.map((t) => (
        <div
          key={t.key}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderTop: '1px solid rgba(107,66,38,0.08)' }}
        >
          {t.done ? <Tick /> : <Open />}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.done ? 'var(--text-soft)' : 'var(--text)', textDecoration: t.done ? 'line-through' : 'none', textDecorationColor: 'rgba(107,66,38,0.35)' }}>
              {t.title}
            </div>
            {!t.done && <div className="muted" style={{ fontSize: 12.5, marginTop: 2, lineHeight: 1.45 }}>{t.detail}</div>}
          </div>
          {t.done ? (
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success-text)', flexShrink: 0 }}>Done</span>
          ) : (
            <Link
              href={t.href}
              aria-label={t.cta}
              title={t.cta}
              style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--brown)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" {...svg}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          )}
        </div>
      ))}

      {invited && (
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(107,66,38,0.08)', background: 'var(--cream-dark)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ width: 38, height: 38, borderRadius: 12, background: allDone ? 'var(--brown)' : 'rgba(107,66,38,0.15)', color: allDone ? '#fff' : 'var(--text-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" {...svg}><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--brown)' }}>First access to the Rooted Together app</div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2, lineHeight: 1.45 }}>
            {approved
              ? 'Your access has been approved. Welcome in.'
              : requested
                ? 'Request received. We will be in touch with your access soon.'
                : allDone
                  ? 'Your pledge is complete. Request your place and we will open the app for you.'
                  : 'Complete all three tasks above to unlock this.'}
          </div>
          {error && <div style={{ fontSize: 12.5, marginTop: 4, color: 'var(--error-text, #9B2C2C)' }}>{error}</div>}
        </div>
        {!requested && (
          <button type="button" onClick={requestAccess} disabled={!allDone || busy} className="btn btn-primary btn-small" style={{ opacity: allDone ? 1 : 0.45, cursor: allDone ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
            {busy ? 'Sending…' : 'Request access'}
          </button>
        )}
        {requested && (
          <span className="badge" style={{ flexShrink: 0 }}>{approved ? 'Approved' : 'Requested'}</span>
        )}
      </div>
      )}
    </div>
  );
}
