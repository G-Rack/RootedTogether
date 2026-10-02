'use client';

import Link from 'next/link';
import { initialsFor, ROLE_LABELS } from '@/lib/roles';
import { avatarUrl, bannerUrl } from '@/lib/storage';

export default function CreatorCard({ creator, handle, avatarPath, bannerPath }) {
  const avatar = avatarUrl(avatarPath);
  const banner = bannerUrl(bannerPath);

  return (
    <Link href={`/creator/${handle}`} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 64,
          background: banner ? `center 70% / cover no-repeat url(${banner})` : 'linear-gradient(160deg, var(--brown) 0%, var(--brown-light) 100%)',
        }}
      />
      <div style={{ padding: '0 22px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {avatar ? (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 999,
              flexShrink: 0,
              border: '3px solid var(--white)',
              marginTop: -26,
              background: `center / cover no-repeat url(${avatar})`,
            }}
          />
        ) : (
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 18, border: '3px solid var(--white)', marginTop: -26 }}>
            {initialsFor(creator.name)}
          </div>
        )}
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text)' }}>{creator.name}</div>
          <div className="muted" style={{ fontSize: 12.5 }}>{ROLE_LABELS[creator.role] || creator.role}</div>
        </div>
        {creator.story && (
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {creator.story}
          </div>
        )}
      </div>
    </Link>
  );
}
