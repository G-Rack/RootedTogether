'use client';

import { useState } from 'react';
import Link from 'next/link';
import ShareButtons from '@/components/ShareButtons';

// The creator's storefront link, front and centre on the dashboard overview, so
// it is one tap to copy and put in an Instagram bio, a WhatsApp message or an email.
export default function StorefrontLinkCard({ handle, name }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://rootedtogether.club';
  const url = `${origin}/creator/${handle}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard can be unavailable; the link is shown so it can be selected by hand.
    }
  };

  return (
    <div className="card" style={{ padding: 'clamp(18px, 3vw, 24px)', marginBottom: 20, border: '1.5px solid #C8923F', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8923F' }}>Your storefront link</div>
          <div className="serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--brown)', marginTop: 4 }}>Share this and people can shop your offerings</div>
        </div>
        <Link href={`/creator/${handle}`} className="btn btn-outline btn-small">Preview storefront</Link>
      </div>
      <p className="muted" style={{ margin: '8px 0 14px', fontSize: 13.5, lineHeight: 1.55 }}>
        Put it in your Instagram bio, WhatsApp status and emails. Anyone who opens it can browse and buy everything you sell.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div
          style={{ flex: '1 1 260px', minWidth: 0, padding: '12px 16px', borderRadius: 14, background: 'var(--cream)', border: '1px solid #EADBC8', fontSize: 14.5, fontWeight: 600, color: 'var(--text)', overflowWrap: 'anywhere', userSelect: 'all' }}
        >
          {url}
        </div>
        <button type="button" className="btn btn-primary" onClick={copy} style={{ minHeight: 48 }}>
          {copied ? 'Copied ✓' : 'Copy link'}
        </button>
      </div>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span className="muted" style={{ fontSize: 12.5 }}>Share on</span>
        <ShareButtons url={url} title={name ? `Shop ${name} on Rooted Together` : 'Shop on Rooted Together'} />
      </div>
    </div>
  );
}
