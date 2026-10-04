'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/components/SessionProvider';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice, OFFERING_TYPE_LABELS } from '@/lib/roles';

const TYPE_DOT = {
  course: 'var(--brown)',
  ebook: 'var(--brown-light)',
  routine: 'var(--brown-pale)',
  call: 'var(--text-soft)',
};

export default function PurchasesPage() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);

  useEffect(() => {
    let active = true;
    if (!session?.user?.id) return undefined;

    async function load() {
      setLoading(true);
      const { data: rows } = await supabase
        .from('offering_purchases')
        .select('id, price_paid_cents, purchased_at, offering_id, offerings(id, title, type, creator_auth_id)')
        .eq('buyer_auth_id', session.user.id)
        .order('purchased_at', { ascending: false });

      const creatorIds = [...new Set((rows || []).map((r) => r.offerings?.creator_auth_id).filter(Boolean))];
      let creatorNames = {};
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase.from('profiles').select('id, full_name').in('id', creatorIds);
        creatorNames = Object.fromEntries((creators || []).map((c) => [c.id, c.full_name]));
      }

      if (!active) return;
      setPurchases(
        (rows || []).map((r) => ({
          ...r,
          creatorName: creatorNames[r.offerings?.creator_auth_id] || 'Rooted Together Creator',
        }))
      );
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  if (loading) {
    return <div className="skeleton" style={{ height: 240 }} />;
  }

  const totalSpent = purchases.reduce((sum, p) => sum + (p.price_paid_cents || 0), 0);

  return (
    <div style={{ maxWidth: 780, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)' }}>Purchases</div>

      {purchases.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <div className="muted" style={{ fontSize: 12 }}>Total spent</div>
            <div className="serif" style={{ fontSize: 21, fontWeight: 700, color: 'var(--brown)', marginTop: 4 }}>{formatPrice(totalSpent)}</div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div className="muted" style={{ fontSize: 12 }}>Items purchased</div>
            <div className="serif" style={{ fontSize: 21, fontWeight: 700, color: 'var(--brown)', marginTop: 4 }}>{purchases.length}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {purchases.length === 0 && (
          <div style={{ padding: '36px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 999, background: 'var(--cream-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brown)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 7h12l1 13H5L6 7z" /><path d="M9 10V6a3 3 0 016 0v4" />
              </svg>
            </div>
            <div className="serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--brown)' }}>Nothing purchased yet</div>
            <div className="muted" style={{ fontSize: 13, maxWidth: 320 }}>
              Courses, ebooks, routines, and calls you buy from the marketplace will show up here.
            </div>
            <Link href="/" className="btn btn-primary btn-small">Browse Marketplace</Link>
          </div>
        )}

        {purchases.map((p, i) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 18px',
              borderTop: i === 0 ? 'none' : '1px solid rgba(107,66,38,0.08)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_DOT[p.offerings?.type] || 'var(--text-soft)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{p.offerings?.title || 'Offering no longer available'}</div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                {OFFERING_TYPE_LABELS[p.offerings?.type] || 'Item'} · {p.creatorName} ·{' '}
                {new Date(p.purchased_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brown)', whiteSpace: 'nowrap' }}>
              {formatPrice(p.price_paid_cents)}
            </span>
            {p.offerings?.id && (
              <Link href={`/offering/${p.offerings.id}`} className="btn btn-outline btn-small">
                {p.offerings?.type === 'call' ? 'View booking' : 'Open'}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
