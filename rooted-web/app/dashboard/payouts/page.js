'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { formatPrice, OFFERING_TYPE_LABELS } from '@/lib/roles';

const TYPE_DOT = {
  course: 'var(--brown)',
  ebook: 'var(--brown-light)',
  routine: 'var(--brown-pale)',
  call: 'var(--text-soft)',
};

export default function PayoutsPage() {
  const { session } = useSession();
  const [offerings, setOfferings] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let active = true;

    async function load() {
      const { data: offeringRows } = await supabase
        .from('offerings')
        .select('id, title, type')
        .eq('creator_auth_id', session.user.id);
      const ids = (offeringRows || []).map((o) => o.id);
      let purchaseRows = [];
      if (ids.length > 0) {
        const { data } = await supabase
          .from('offering_purchases')
          .select('*')
          .in('offering_id', ids)
          .order('purchased_at', { ascending: false });
        purchaseRows = data || [];
      }
      if (!active) return;
      setOfferings(offeringRows || []);
      setPurchases(purchaseRows);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [session]);

  const offeringById = useMemo(() => Object.fromEntries(offerings.map((o) => [o.id, o])), [offerings]);

  const total = purchases.reduce((sum, p) => sum + (p.price_paid_cents || 0), 0);
  const now = new Date();
  const thisMonth = purchases
    .filter((p) => {
      const d = new Date(p.purchased_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + (p.price_paid_cents || 0), 0);

  const breakdown = useMemo(() => {
    const byType = {};
    purchases.forEach((p) => {
      const t = offeringById[p.offering_id]?.type || 'other';
      byType[t] = (byType[t] || 0) + (p.price_paid_cents || 0);
    });
    return Object.entries(byType)
      .filter(([, cents]) => cents > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [purchases, offeringById]);

  if (loading) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', marginBottom: 6 }}>
        Payouts &amp; Sales
      </div>
      <div className="muted" style={{ fontSize: 13.5, marginBottom: 22 }}>
        Every sale below is a real record from a real buyer — but checkout is still in test mode, so no money has
        actually moved and there&rsquo;s no real payout method connected yet.
      </div>

      <div className="responsive-3col" style={{ '--col-a': '1.3fr', '--col-gap': '16px', marginBottom: 24 }}>
        <div style={{ background: 'var(--brown)', borderRadius: 16, padding: '20px 22px', color: 'var(--white)' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Total (test) earnings
          </div>
          <div className="serif" style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>{formatPrice(total)}</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', marginTop: 10 }}>No real charges have occurred.</div>
        </div>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="muted" style={{ fontSize: 12 }}>This month</div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)', marginTop: 6 }}>{formatPrice(thisMonth)}</div>
        </div>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="muted" style={{ fontSize: 12 }}>All time</div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)', marginTop: 6 }}>{formatPrice(total)}</div>
        </div>
      </div>

      <div className="responsive-2col" style={{ '--col-gap': '20px' }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 8 }}>
            Earnings breakdown
          </div>
          {breakdown.length === 0 && (
            <div className="card" style={{ padding: 18 }}>
              <div className="muted" style={{ fontSize: 13 }}>No sales yet.</div>
            </div>
          )}
          {breakdown.length > 0 && (
            <div className="card" style={{ overflow: 'hidden' }}>
              {breakdown.map(([t, cents], i) => (
                <div
                  key={t}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '13px 16px',
                    borderTop: i === 0 ? 'none' : '1px solid rgba(107,66,38,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 999, background: TYPE_DOT[t] || 'var(--text-soft)' }} />
                    <span style={{ fontSize: 13.5 }}>{OFFERING_TYPE_LABELS[t] || 'Other'}</span>
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{formatPrice(cents)}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', margin: '20px 0 8px' }}>
            Payout method
          </div>
          <div className="card" style={{ padding: '13px 16px' }}>
            <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>
              Not connected yet — this is where a real bank or Stripe payout account will go once checkout is live.
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 8 }}>
            Recent sales
          </div>
          {purchases.length === 0 && (
            <div className="card" style={{ padding: 18 }}>
              <div className="muted" style={{ fontSize: 13 }}>No sales yet.</div>
            </div>
          )}
          {purchases.length > 0 && (
            <div className="card" style={{ overflow: 'hidden' }}>
              {purchases.slice(0, 8).map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderTop: i === 0 ? 'none' : '1px solid rgba(107,66,38,0.08)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {offeringById[p.offering_id]?.title || 'Offering'}
                    </div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>
                      {new Date(p.purchased_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brown)', flexShrink: 0, paddingLeft: 10 }}>
                    +{formatPrice(p.price_paid_cents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
