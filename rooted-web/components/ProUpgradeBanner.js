'use client';

import { PRO_UPGRADE_URL } from '@/lib/config';

// Shown to creators who are not on Creator Pro yet, wherever a Pro feature is previewed.
export default function ProUpgradeBanner({ title = 'This is part of Creator Pro', compact = false }) {
  return (
    <div
      className="card"
      style={{
        padding: compact ? '16px 18px' : '20px 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        background: 'var(--cream-dark)',
        borderColor: '#C8923F',
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 280px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 3 }}>
          Upgrade for $39, the difference from your membership, and you get 0% Rooted Together fee on every sale, the Rooted Pro badge with priority placement, the Creator Academy and the private Pro community.
        </div>
      </div>
      {PRO_UPGRADE_URL ? (
        <a href={PRO_UPGRADE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-small">Upgrade for $39</a>
      ) : (
        <span className="btn btn-outline btn-small" style={{ opacity: 0.6, cursor: 'default' }}>Upgrade coming soon</span>
      )}
    </div>
  );
}
