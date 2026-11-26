'use client';

import Link from 'next/link';
import { avatarUrl } from '@/lib/storage';
import { initialsFor } from '@/lib/roles';

// Small pieces of the offering page that only exist to help someone decide and buy:
// the "What you get" list, the trust lines under the buy button, the creator card and the
// phone-only sticky buy bar. Everything shown here comes from the offering's own data.

const CHECK = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B4226" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function lengthLabel(seconds) {
  const s = Number(seconds) || 0;
  if (s < 60) return '';
  const mins = Math.round(s / 60);
  if (mins < 60) return `About ${mins} minutes in total`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `About ${h} hr${m ? ` ${m} min` : ''} in total`;
}

// Build the "What you get" lines from the offering and, for courses and audiobooks, its lesson summary
// ({ lesson_count, video_count, pdf_count, audio_count, total_seconds }). Lines we cannot back with data are left out.
export function whatYouGetItems(offering, summary) {
  const items = [];
  const type = offering.type;
  const n = Number(summary?.lesson_count) || 0;
  if (type === 'course' || type === 'audio') {
    if (n > 0) {
      const parts = [];
      if (summary.video_count > 0) parts.push(plural(summary.video_count, 'video lesson'));
      if (summary.audio_count > 0) parts.push(plural(summary.audio_count, 'audio lesson'));
      if (summary.pdf_count > 0) parts.push(plural(summary.pdf_count, 'PDF'));
      items.push(parts.length ? parts.join(', ') : plural(n, 'lesson'));
    }
    const len = lengthLabel(summary?.total_seconds);
    if (len) items.push(len);
    if (n > 0) {
      const formats = [];
      if (summary.video_count > 0) formats.push('Video');
      if (summary.audio_count > 0 || type === 'audio') formats.push('Audio');
      if (summary.pdf_count > 0) formats.push('Text');
      if (formats.length) items.push(`Format: ${formats.join(' and ')}`);
    }
  } else if (type === 'ebook' || type === 'routine' || type === 'printable' || type === 'template') {
    items.push(`Format: ${type === 'ebook' ? 'Ebook' : type === 'routine' ? 'Daily routine, in text' : type === 'printable' ? 'Printable' : 'Template'}`);
  }
  items.push('Lifetime access, yours to keep');
  items.push('Works on your phone');
  return items;
}

export function WhatYouGet({ offering, summary }) {
  const items = whatYouGetItems(offering, summary);
  return (
    <div>
      <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
        What you get
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {items.map((text) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--text)' }}>
            {CHECK}
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}

const LOCK = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B4226" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 018 0v4" />
  </svg>
);

// Trust lines under a buy button. `guest` = the visitor is not signed in (guest checkout is on).
// The last line states the refund rule exactly as the Terms of Service (section 7) do.
export function TrustLines({ guest }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: 'var(--text-soft)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{LOCK}Secure checkout with Stripe</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {CHECK}
        {guest ? 'No account needed – we’ll email your access' : 'Instant access in your account'}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.45 }}>
        <span style={{ width: 14, flexShrink: 0 }} aria-hidden="true" />
        <span>
          All sales are final unless the law requires otherwise.{' '}
          <Link href="/terms" style={{ textDecoration: 'underline' }}>See the Terms</Link>
        </span>
      </div>
    </div>
  );
}

// A short creator card with photo and bio. Pure text and a picture: no links, so nobody leaves before buying.
export function CreatorMini({ name, storefront, isCall, story }) {
  if (!name) return null;
  const pic = avatarUrl(storefront?.avatar_path);
  const bio = String(storefront?.bio || story || storefront?.tagline || '').replace(/\s+/g, ' ').trim();
  const short = bio.length > 150 ? `${bio.slice(0, 147).replace(/\s+\S*$/, '')}…` : bio;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      {pic ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pic} alt="" width={44} height={44} loading="lazy" decoding="async" style={{ width: 44, height: 44, borderRadius: 999, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div className="avatar" style={{ width: 44, height: 44, fontSize: 15, flexShrink: 0 }}>{initialsFor(name)}</div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{isCall ? `With ${name}` : `Taught by ${name}`}</div>
        {short && <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 2 }}>{short}</div>}
      </div>
    </div>
  );
}

// The bar that slides up from the bottom of a phone screen once the main buy button has scrolled away.
export function StickyBuyBar({ visible, priceLabel, buttonLabel, busy, onBuy }) {
  return (
    <div className={`offer-sticky-bar${visible ? ' is-visible' : ''}`} role="region" aria-label="Buy this" aria-hidden={!visible}>
      <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)', whiteSpace: 'nowrap' }}>{priceLabel}</div>
      <button type="button" className="btn btn-primary" onClick={onBuy} disabled={busy} tabIndex={visible ? 0 : -1} style={{ flex: 1, padding: '13px 18px', fontSize: 15 }}>
        {busy ? 'Opening secure checkout…' : buttonLabel}
      </button>
    </div>
  );
}
