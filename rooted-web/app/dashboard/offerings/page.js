'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { formatPrice, OFFERING_TYPE_LABELS } from '@/lib/roles';

const COLUMNS = '1.7fr 0.8fr 0.65fr 0.8fr 0.5fr 2.6fr';

const TYPE_DOT = {
  course: 'var(--brown)',
  ebook: 'var(--brown-light)',
  routine: 'var(--brown-pale)',
  call: 'var(--text-soft)',
};

export default function MyOfferingsPage() {
  const { session } = useSession();
  const [offerings, setOfferings] = useState([]);
  const [sales, setSales] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let active = true;
    async function load() {
      const { data } = await supabase
        .from('offerings')
        .select('*')
        .eq('creator_auth_id', session.user.id)
        .order('created_at', { ascending: false });
      if (!active) return;
      setOfferings(data || []);
      const ids = (data || []).map((o) => o.id);
      if (ids.length > 0) {
        const { data: purchases } = await supabase.from('offering_purchases').select('offering_id').in('offering_id', ids);
        const counts = {};
        (purchases || []).forEach((p) => {
          counts[p.offering_id] = (counts[p.offering_id] || 0) + 1;
        });
        if (active) setSales(counts);
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [session]);

  const togglePublish = async (offering) => {
    const nextStatus = offering.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase.from('offerings').update({ status: nextStatus }).eq('id', offering.id);
    if (!error) {
      setOfferings((prev) => prev.map((o) => (o.id === offering.id ? { ...o, status: nextStatus } : o)));
    }
  };

  const deleteOffering = async (offering) => {
    if (!confirm(`Delete "${offering.title}"? This can't be undone.`)) return;
    const { error } = await supabase.from('offerings').delete().eq('id', offering.id);
    if (!error) {
      setOfferings((prev) => prev.filter((o) => o.id !== offering.id));
    }
  };

  if (loading) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)' }}>My Offerings</div>
        <Link href="/dashboard/upload" className="btn btn-primary btn-small">+ Upload New</Link>
      </div>

      {offerings.length === 0 && (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div className="muted" style={{ fontSize: 13.5, marginBottom: 14 }}>Nothing yet — upload your first offering.</div>
          <Link href="/dashboard/upload" className="btn btn-primary btn-small">+ Upload New</Link>
        </div>
      )}

      {offerings.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div
            className="desktop-only"
            style={{
              display: 'grid',
              gridTemplateColumns: COLUMNS,
              padding: '10px 20px',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-soft)',
              textTransform: 'uppercase',
              letterSpacing: 0.3,
              borderBottom: '1px solid rgba(107,66,38,0.08)',
            }}
          >
            <span>Title</span>
            <span>Type</span>
            <span>Price</span>
            <span>Status</span>
            <span>Sales</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {offerings.map((o, i) => {
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
            const actions = (
              <>
                <Link href={`/dashboard/upload?id=${o.id}`} className="btn btn-outline btn-xs">Edit</Link>
                <button onClick={() => togglePublish(o)} className="btn btn-outline btn-xs">
                  {o.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => deleteOffering(o)} className="btn btn-outline btn-xs">Delete</button>
              </>
            );
            return (
              <div key={o.id}>
                <div
                  className="desktop-only"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: COLUMNS,
                    alignItems: 'center',
                    padding: '14px 20px',
                    borderTop: i === 0 ? 'none' : '1px solid rgba(107,66,38,0.08)',
                    fontSize: 13,
                    gap: 8,
                  }}
                >
                  <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>
                    {o.title}
                  </span>
                  <span className="muted">{OFFERING_TYPE_LABELS[o.type]}</span>
                  <span>{o.is_free_for_family ? 'Free' : formatPrice(o.price_cents)}</span>
                  {statusBadge}
                  <span>{sales[o.id] || '—'}</span>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                    {actions}
                  </div>
                </div>

                <div
                  className="mobile-only"
                  style={{
                    padding: '16px 20px',
                    borderTop: i === 0 ? 'none' : '1px solid rgba(107,66,38,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
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
                    <span className="muted">{sales[o.id] || 0} sales</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {actions}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
