'use client';

import Link from 'next/link';
import { coverUrl } from '@/lib/storage';
import { formatPrice, OFFERING_TYPE_LABELS } from '@/lib/roles';
import StarRating from '@/components/StarRating';

export default function OfferingCard({ offering, creatorName, stats }) {
  const cover = coverUrl(offering.cover_path);

  return (
    <Link
      href={`/offering/${offering.id}`}
      className="card"
      style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div
        style={{
          height: 150,
          background: cover ? `center / cover no-repeat url(${cover})` : 'linear-gradient(135deg, var(--brown-pale), var(--brown-light))',
        }}
      />
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="badge" style={{ alignSelf: 'flex-start' }}>
          {(OFFERING_TYPE_LABELS[offering.type] || offering.type).toUpperCase()}
        </span>
        <div className="serif" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
          {offering.title}
        </div>
        {creatorName && <div className="muted" style={{ fontSize: 13 }}>{creatorName}</div>}
        {stats && stats.review_count > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StarRating value={Number(stats.avg_rating)} size={12} />
            <span className="muted" style={{ fontSize: 11.5 }}>({stats.review_count})</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontWeight: 700, color: 'var(--brown)' }}>
            {offering.is_free_for_family ? 'Free for family' : formatPrice(offering.price_cents)}
          </span>
        </div>
      </div>
    </Link>
  );
}
