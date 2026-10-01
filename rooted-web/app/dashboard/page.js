'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { formatPrice, OFFERING_TYPE_LABELS } from '@/lib/roles';

const TYPE_DOT = {
  course: 'var(--brown)',
  ebook: 'var(--brown-light)',
  routine: 'var(--brown-pale)',
  call: 'var(--text-soft)',
};

export default function DashboardOverviewPage() {
  const { session, profile } = useSession();
  const [offerings, setOfferings] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [storefront, setStorefront] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let active = true;

    async function load() {
      const [{ data: offeringRows }, { data: sf }] = await Promise.all([
        supabase.from('offerings').select('*').eq('creator_auth_id', session.user.id).order('created_at', { ascending: false }),
        supabase.from('creator_storefronts').select('*').eq('auth_user_id', session.user.id).maybeSingle(),
      ]);
      if (!active) return;

      const ids = (offeringRows || []).map((o) => o.id);
      let purchaseRows = [];
      if (ids.length > 0) {
        const { data } = await supabase.from('offering_purchases').select('*').in('offering_id', ids);
        purchaseRows = data || [];
      }

      if (!active) return;
      setOfferings(offeringRows || []);
      setPurchases(purchaseRows);
      setStorefront(sf || null);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [session]);

  const offeringById = useMemo(() => Object.fromEntries(offerings.map((o) => [o.id, o])), [offerings]);

  const totalEarnings = purchases.reduce((sum, p) => sum + (p.price_paid_cents || 0), 0);
  const now = new Date();
  const thisMonthEarnings = purchases
    .filter((p) => {
      const d = new Date(p.purchased_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + (p.price_paid_cents || 0), 0);
  const activeStudents = new Set(purchases.map((p) => p.buyer_auth_id)).size;
  const callBookings = purchases.filter((p) => offeringById[p.offering_id]?.type === 'call');

  if (loading) {
    return <div className="skeleton" style={{ height: 300 }} />;
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)' }}>
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </div>
          <div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Here&rsquo;s how your storefront is doing.</div>
        </div>
        {storefront ? (
          <Link href={`/creator/${storefront.handle}`} className="btn btn-outline btn-small">View Storefront</Link>
        ) : (
          <Link href="/dashboard/branding" className="btn btn-outline btn-small">Set up your storefront</Link>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total earnings" value={formatPrice(totalEarnings)} />
        <StatCard label="This month" value={formatPrice(thisMonthEarnings)} />
        <StatCard label="Active students" value={activeStudents} />
        <StatCard label="Call bookings" value={callBookings.length} />
      </div>

      <div className="responsive-2col" style={{ '--col-a': '1.6fr', '--col-b': '1fr', '--col-gap': '20px' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(107,66,38,0.1)' }}>
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>My Offerings</span>
            <Link href="/dashboard/upload" className="btn btn-primary btn-small">+ Upload New</Link>
          </div>

          {offerings.length === 0 && <div className="muted" style={{ padding: 20, fontSize: 13.5 }}>Nothing yet — upload your first offering.</div>}

          {offerings.slice(0, 5).map((o, i) => {
            const sales = purchases.filter((p) => p.offering_id === o.id).length;
            const statusBadge = (
              <span
                style={{
                  color: o.status === 'published' ? 'var(--success-text)' : 'var(--text-soft)',
                  background: o.status === 'published' ? 'var(--success-bg)' : 'var(--cream-dark)',
                  border: o.status === 'published' ? '1px solid var(--success-border)' : 'none',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  width: 'fit-content',
                }}
              >
                {o.status === 'published' ? 'Published' : 'Draft'}
              </span>
            );
            return (
              <div key={o.id}>
                <div
                  className="desktop-only"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 0.8fr 0.9fr 0.6fr',
                    alignItems: 'center',
                    padding: '14px 20px',
                    borderTop: i === 0 ? 'none' : '1px solid rgba(107,66,38,0.08)',
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.title}</span>
                  <span className="muted">{OFFERING_TYPE_LABELS[o.type]}</span>
                  <span>{o.is_free_for_family ? 'Free' : formatPrice(o.price_cents)}</span>
                  {statusBadge}
                  <span>{sales || '—'}</span>
                </div>

                <div
                  className="mobile-only"
                  style={{
                    padding: '16px 20px',
                    borderTop: i === 0 ? 'none' : '1px solid rgba(107,66,38,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.35 }}>{o.title}</span>
                    <div style={{ flexShrink: 0 }}>{statusBadge}</div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: TYPE_DOT[o.type] || 'var(--text-soft)' }} />
                      <span className="muted">{OFFERING_TYPE_LABELS[o.type]}</span>
                    </span>
                    <span className="muted">·</span>
                    <span style={{ fontWeight: 700, color: 'var(--brown)' }}>{o.is_free_for_family ? 'Free' : formatPrice(o.price_cents)}</span>
                    <span className="muted">·</span>
                    <span className="muted">{sales || 0} sales</span>
                  </div>
                </div>
              </div>
            );
          })}

          {offerings.length > 0 && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(107,66,38,0.08)' }}>
              <Link href="/dashboard/offerings" style={{ fontSize: 12.5, fontWeight: 700 }}>See all offerings →</Link>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700 }}>Recent Call Bookings</span>
          {callBookings.length === 0 && <div className="muted" style={{ fontSize: 12.5 }}>No calls booked yet.</div>}
          {callBookings.slice(0, 5).map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(107,66,38,0.08)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{offeringById[p.offering_id]?.title}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  Booked {new Date(p.purchased_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          ))}
          {callBookings.length > 0 && (
            <div className="muted" style={{ fontSize: 11.5, paddingTop: 4 }}>
              The scheduled time for each call lives in your connected Calendly account.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)', marginTop: 6 }}>{value}</div>
    </div>
  );
}
