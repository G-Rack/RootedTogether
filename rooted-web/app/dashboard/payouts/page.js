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

// Referral program tiers — proposed milestones, pending feedback. Based on
// how many people a creator has personally onboarded who are still active
// on the marketplace. Each tier's rate applies to every purchase made
// anywhere by anyone that creator has referred, for as long as the
// referred person stays active.
const REFERRAL_TIERS = [
  { name: 'Seed', rate: 0.5, min: 100, max: 249 },
  { name: 'Sapling', rate: 1, min: 250, max: 499 },
  { name: 'Rooted', rate: 1.5, min: 500, max: 999 },
  { name: 'Flourishing', rate: 2, min: 1000, max: Infinity },
];

function tierForCount(count) {
  if (count < REFERRAL_TIERS[0].min) return null;
  return REFERRAL_TIERS.find((t) => count >= t.min && count <= t.max) || REFERRAL_TIERS[REFERRAL_TIERS.length - 1];
}

// Stand-in for real referral tracking, which doesn't exist yet — there's no
// referrals table, no signup attribution, and no commission ledger. This
// section is a design concept to react to before any of that gets built.
const SAMPLE_REFERRAL_DATA = {
  referredCount: 320,
  earningsCents: 1842,
  recent: [
    { referredName: 'Aisha K.', offeringTitle: 'Rooted Mornings', purchaseCents: 800, cutCents: 8, date: '2026-10-03' },
    { referredName: 'Marcus T.', offeringTitle: 'A Sacred Conversation', purchaseCents: 900, cutCents: 9, date: '2026-10-01' },
    { referredName: 'Priya S.', offeringTitle: 'Letters to My Spiritual Children', purchaseCents: 700, cutCents: 7, date: '2026-09-27' },
  ],
};

export default function PayoutsPage() {
  const { session, profile } = useSession();
  const [offerings, setOfferings] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const handleSlug = (profile?.full_name || 'you')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const referralLink = `https://rooted-together-website1.vercel.app/login?ref=${handleSlug}`;
  const currentTier = tierForCount(SAMPLE_REFERRAL_DATA.referredCount);
  const currentTierIndex = currentTier ? REFERRAL_TIERS.indexOf(currentTier) : -1;
  const nextTier = currentTierIndex >= 0 ? REFERRAL_TIERS[currentTierIndex + 1] : REFERRAL_TIERS[0];

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the link is still visible to select and copy by hand.
    }
  };

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

      {/* Referral Program — design concept, sample data only (see
          SAMPLE_REFERRAL_DATA / REFERRAL_TIERS above). Nothing here is wired
          to real tracking yet; it's here to react to before that's built. */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div className="serif" style={{ fontSize: 19, fontWeight: 700, color: 'var(--brown)' }}>
            Referral Program
          </div>
          <span className="badge" style={{ background: 'var(--cream-dark)' }}>Concept preview</span>
        </div>
        <div className="muted" style={{ fontSize: 13.5, marginBottom: 20, maxWidth: 640 }}>
          Bring new people onto Rooted Together — when someone you&rsquo;ve onboarded makes a purchase anywhere on the
          marketplace, you earn a cut. The more people you&rsquo;ve onboarded who stay active, the higher your rate.
          Everything below uses sample numbers so you can react to the design before we build the real tracking.
        </div>

        <div className="responsive-3col" style={{ '--col-a': '1.3fr', '--col-gap': '16px', marginBottom: 20 }}>
          <div style={{ background: 'var(--brown)', borderRadius: 16, padding: '20px 22px', color: 'var(--white)' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Referral earnings (test)
            </div>
            <div className="serif" style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>
              {formatPrice(SAMPLE_REFERRAL_DATA.earningsCents)}
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', marginTop: 10 }}>Sample data — not real.</div>
          </div>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div className="muted" style={{ fontSize: 12 }}>People you&rsquo;ve onboarded</div>
            <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)', marginTop: 6 }}>
              {SAMPLE_REFERRAL_DATA.referredCount}
            </div>
          </div>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div className="muted" style={{ fontSize: 12 }}>Current tier</div>
            <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)', marginTop: 6 }}>
              {currentTier ? `${currentTier.name} · ${currentTier.rate}%` : 'Not started'}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="field-label" style={{ marginBottom: 8 }}>Your referral link</div>
          <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, fontSize: 13, color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {referralLink}
            </div>
            <button type="button" onClick={copyReferralLink} className="btn btn-outline btn-small" style={{ flexShrink: 0 }}>
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div className="field-label" style={{ marginBottom: 8 }}>Tiers &amp; milestones</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 10 }}>
            {REFERRAL_TIERS.map((tier) => {
              const isCurrent = tier === currentTier;
              const isReached = currentTier && REFERRAL_TIERS.indexOf(tier) < currentTierIndex;
              return (
                <div
                  key={tier.name}
                  className="card"
                  style={{
                    padding: '14px 16px',
                    border: isCurrent ? '1.5px solid var(--brown)' : undefined,
                    background: isCurrent ? 'var(--cream-dark)' : undefined,
                  }}
                >
                  <div className="serif" style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--brown)' }}>{tier.name}</div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{tier.rate}%</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                    {tier.max === Infinity ? `${tier.min}+ onboarded` : `${tier.min}–${tier.max} onboarded`}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 8, color: isReached ? 'var(--success-text)' : isCurrent ? 'var(--brown)' : 'var(--text-soft)' }}>
                    {isReached ? '✓ Reached' : isCurrent ? 'You are here' : 'Locked'}
                  </div>
                </div>
              );
            })}
          </div>
          {nextTier && (
            <div className="muted" style={{ fontSize: 12.5 }}>
              {Math.max(nextTier.min - SAMPLE_REFERRAL_DATA.referredCount, 0)} more onboarded
              {' '}to reach {nextTier.name} ({nextTier.rate}%).
            </div>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 8 }}>
            Recent referral earnings
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {SAMPLE_REFERRAL_DATA.recent.map((r, i) => (
              <div
                key={`${r.referredName}-${r.date}`}
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
                    {r.referredName} bought {r.offeringTitle}
                  </div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>
                    {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {formatPrice(r.purchaseCents)} sale · {currentTier?.rate ?? 0}% cut
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brown)', flexShrink: 0, paddingLeft: 10 }}>
                  +{formatPrice(r.cutCents)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
