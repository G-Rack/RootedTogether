'use client';

import Link from 'next/link';
import { coverUrl } from '@/lib/storage';
import CoverImage from '@/components/CoverImage';
import TypeIcon from '@/components/TypeIcon';
import { formatPrice, OFFERING_TYPE_LABELS } from '@/lib/roles';
import { OFFERING_TYPE_BY_KEY } from '@/lib/offeringTypes';
import StarRating from '@/components/StarRating';
import ProBadge from '@/components/ProBadge';

export default function OfferingCard({ offering, creatorName, stats, isPro = false }) {
  const cover = coverUrl(offering.cover_path);
  const meta = OFFERING_TYPE_BY_KEY[offering.type];

  return (
    <Link href={`/offering/${offering.id}`} className="rt-card">
      {cover ? (
        <CoverImage src={cover} alt={offering.title} />
      ) : (
        // No cover picture yet: a calm tile in the type's colours, with its icon.
        <div
          aria-hidden="true"
          style={{
            aspectRatio: '16 / 9',
            display: 'grid',
            placeItems: 'center',
            background: meta?.tint || '#F1E4D3',
            color: meta?.ink || '#6B4226',
          }}
        >
          <TypeIcon name={offering.type} size={38} />
        </div>
      )}
      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="type-pill" style={{ alignSelf: 'flex-start' }}>
          {(OFFERING_TYPE_LABELS[offering.type] || offering.type).toUpperCase()}
        </span>
        <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
          {offering.title}
        </div>
        {creatorName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="muted" style={{ fontSize: 13.5 }}>{creatorName}</span>
            {isPro && <ProBadge small />}
          </div>
        )}
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
