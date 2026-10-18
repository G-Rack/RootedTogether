'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import StoreBadges from '@/components/StoreBadges';

// Where a member's referral link lands. The app is where referred people sign
// up, so this page just carries the code across: it shows it big, with a copy
// button, and tells them where to type it in the app's sign-up.
const CODE_RE = /^RT-?\d{1,8}$/i;

function JoinInner() {
  const searchParams = useSearchParams();
  const raw = (searchParams.get('ref') || '').trim();
  const code = CODE_RE.test(raw) ? raw.toUpperCase().replace(/^RT-?/, 'RT-') : '';
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable: the code is still on screen to copy by hand.
    }
  };

  return (
    <div style={{ background: 'var(--cream)' }}>
      <div className="container" style={{ maxWidth: 640, paddingBlock: '64px 96px', textAlign: 'center' }}>
        <div className="serif" style={{ fontSize: 34, fontWeight: 700, color: 'var(--brown)', lineHeight: 1.15, marginBottom: 12 }}>
          {code ? 'You’ve been invited to Rooted Together' : 'Join Rooted Together'}
        </div>
        <div className="muted" style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
          A home for people who need spiritual support, with mothers, pastors and leaders who walk with you.
        </div>

        {code && (
          <div className="card" style={{ padding: '22px 22px 20px', marginBottom: 28 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 8 }}>
              Your referral code
            </div>
            <div className="serif" style={{ fontSize: 34, fontWeight: 700, color: 'var(--brown)', letterSpacing: 1 }}>{code}</div>
            <button type="button" onClick={copy} className="btn btn-outline btn-small" style={{ marginTop: 14 }}>
              {copied ? 'Copied!' : 'Copy code'}
            </button>
          </div>
        )}

        <div className="card" style={{ padding: '20px 22px', textAlign: 'left', marginBottom: 32 }}>
          {[
            ['Get the app', 'Download Rooted Together for iPhone or Android.'],
            ['Create your account', 'It only takes an email and a password, then a few quick questions.'],
            code
              ? ['Enter your code', 'On the first screen tap “Have a referral code?” and paste the code above.']
              : ['Start exploring', 'Find mothers, pastors and communities that fit what you’re walking through.'],
          ].map(([title, body], i) => (
            <div key={title} style={{ display: 'flex', gap: 14, padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(107,66,38,0.08)' }}>
              <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown-light)', width: 22 }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
                <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: 2 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>

        <StoreBadges align="center" />
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinInner />
    </Suspense>
  );
}
