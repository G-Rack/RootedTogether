'use client';

import { useState } from 'react';
import Link from 'next/link';

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard can be unavailable; the link is on screen to select by hand.
    }
  };
  return (
    <button type="button" className="btn btn-primary" onClick={copy} style={{ minHeight: 48 }}>
      {copied ? 'Copied ✓' : label}
    </button>
  );
}

// The creator's storefront link on the dashboard overview. The two Promote
// buttons open the Creative hub, where the pictures and captions are made.
export default function StorefrontLinkCard({ storefront }) {
  const handle = storefront.handle;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://rootedtogether.club';
  const url = `${origin}/creator/${handle}`;

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
        Put it in your Instagram and TikTok bio. Anyone who opens it can browse and buy everything you sell.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0, padding: '12px 16px', borderRadius: 14, background: 'var(--cream)', border: '1px solid #EADBC8', fontSize: 14.5, fontWeight: 600, color: 'var(--text)', overflowWrap: 'anywhere', userSelect: 'all' }}>
          {url}
        </div>
        <CopyButton text={url} label="Copy link" />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid #EADBC8', alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: 13.5, marginRight: 2 }}>Make a post:</span>
        <Link href="/dashboard/promote/studio?platform=instagram" className="btn btn-outline btn-small">Promote on Instagram</Link>
        <Link href="/dashboard/promote/studio?platform=tiktok" className="btn btn-outline btn-small">Promote on TikTok</Link>
      </div>
    </div>
  );
}
