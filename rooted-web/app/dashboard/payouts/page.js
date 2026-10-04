'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { formatPrice, OFFERING_TYPE_LABELS } from '@/lib/roles';
import { FUNCTIONS_URL } from '@/lib/config';

const TYPE_DOT = {
  course: 'var(--brown)',
  ebook: 'var(--brown-light)',
  routine: 'var(--brown-pale)',
  call: 'var(--text-soft)',
};

// Tier lookup against the fetched `referral_tiers` rows (name, rate_percent,
// min_referrals, max_referrals, sort_order) — the DB is the source of truth,
// not a hardcoded table, so the thresholds and rates can change without a
// code deploy.
function tierForCount(tiers, count) {
  if (!tiers.length || count < tiers[0].min_referrals) return null;
  return (
    tiers.find((t) => count >= t.min_referrals && (t.max_referrals == null || count <= t.max_referrals)) ||
    tiers[tiers.length - 1]
  );
}

export default function PayoutsPage() {
  const { session, profile } = useSession();
  const searchParams = useSearchParams();
  const [offerings, setOfferings] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [referralCode, setReferralCode] = useState(null);
  const [referredCount, setReferredCount] = useState(0);
  const [referralEarningsCents, setReferralEarningsCents] = useState(0);
  const [recentReferrals, setRecentReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Stripe Connect status, kept on `profiles` (every user has exactly one
  // row there — see stripe-connect-onboarding's own comment on why this
  // isn't on creator_storefronts instead).
  const [stripeAccountId, setStripeAccountId] = useState(null);
  const [stripePayoutsEnabled, setStripePayoutsEnabled] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [checkingStripeReturn, setCheckingStripeReturn] = useState(false);

  async function loadStripeStatus(authId) {
    const { data } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_payouts_enabled')
      .eq('id', authId)
      .maybeSingle();
    setStripeAccountId(data?.stripe_account_id || null);
    setStripePayoutsEnabled(!!data?.stripe_payouts_enabled);
    return data;
  }

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

      const [tiersRes, codeRes, summaryRes, earningsRes] = await Promise.all([
        supabase.from('referral_tiers').select('*').order('sort_order', { ascending: true }),
        supabase.rpc('get_my_referral_code'),
        supabase.rpc('get_my_referral_summary'),
        supabase
          .from('referral_earnings')
          .select('*')
          .eq('referrer_auth_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(8),
        loadStripeStatus(session.user.id),
      ]);

      if (!active) return;
      setOfferings(offeringRows || []);
      setPurchases(purchaseRows);
      setTiers(tiersRes.data || []);
      setReferralCode(codeRes.data || null);
      const summary = Array.isArray(summaryRes.data) ? summaryRes.data[0] : summaryRes.data;
      setReferredCount(summary?.referred_count || 0);
      setReferralEarningsCents(summary?.earnings_cents || 0);
      setRecentReferrals(earningsRes.data || []);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [session]);

  // Returning from Stripe's hosted onboarding: account.updated usually
  // reaches the webhook within a second or two, but it's still a race —
  // poll briefly rather than showing "not connected" right after the user
  // just finished connecting.
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    if (!session || !stripeParam) return;
    if (stripeParam === 'complete') {
      let cancelled = false;
      setCheckingStripeReturn(true);
      (async () => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const data = await loadStripeStatus(session.user.id);
          if (cancelled) return;
          if (data?.stripe_payouts_enabled) break;
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        if (!cancelled) setCheckingStripeReturn(false);
      })();
      return () => {
        cancelled = true;
      };
    }
    if (stripeParam === 'refresh') {
      setConnectError('That Stripe setup link expired — click "Connect with Stripe" to get a fresh one.');
    }
  }, [session, searchParams]);

  async function handleConnectStripe() {
    if (!session) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch(`${FUNCTIONS_URL}/stripe-connect-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ origin: window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Couldn't start Stripe onboarding.");
      }
      window.location.href = data.url;
    } catch (err) {
      setConnectError(err.message || "Couldn't start Stripe onboarding — please try again.");
      setConnecting(false);
    }
  }

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

  // Built from the current origin rather than a hardcoded domain, so this
  // never goes stale again if the domain changes.
  const referralLink = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://rootedtogether.club'}/login?tab=signup&ref=${referralCode}`
    : null;
  const currentTier = tierForCount(tiers, referredCount);
  const currentTierIndex = currentTier ? tiers.indexOf(currentTier) : -1;
  const nextTier = currentTierIndex >= 0 ? tiers[currentTierIndex + 1] : tiers[0];

  const copyReferralLink = async () => {
    if (!referralLink) return;
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
        {stripePayoutsEnabled
          ? 'Checkout is still in Stripe test mode, so no real money has moved yet — but your payout account is connected and ready for when it goes live.'
          : 'Every sale below is a real record from a real buyer — but checkout is still in test mode, so no money has actually moved and there’s no real payout method connected yet.'}
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
            {stripePayoutsEnabled ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--success-text, #2e7d32)', flexShrink: 0 }} />
                <div style={{ fontSize: 13 }}>
                  <strong>Connected</strong> — Stripe payouts are enabled on this account.
                </div>
              </div>
            ) : checkingStripeReturn ? (
              <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>Checking your Stripe status…</div>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 10 }}>
                  {stripeAccountId
                    ? "You started Stripe onboarding but haven't finished it yet — pick up where you left off."
                    : 'Not connected yet — connect a Stripe account to receive payouts once checkout goes live.'}
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={handleConnectStripe}
                  disabled={connecting}
                >
                  {connecting ? 'Redirecting to Stripe…' : stripeAccountId ? 'Finish Stripe setup' : 'Connect with Stripe'}
                </button>
                {connectError && (
                  <div className="error-banner" style={{ marginTop: 10, fontSize: 12.5 }}>
                    {connectError}
                  </div>
                )}
              </div>
            )}
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

      {/* Referral Program — live. Backed by the referral_tiers table,
          get_my_referral_code()/get_my_referral_summary() RPCs, and the
          referral_earnings ledger (populated automatically whenever someone
          you referred completes a purchase). */}
      <div style={{ marginTop: 40 }}>
        <div className="serif" style={{ fontSize: 19, fontWeight: 700, color: 'var(--brown)', marginBottom: 6 }}>
          Referral Program
        </div>
        <div className="muted" style={{ fontSize: 13.5, marginBottom: 20, maxWidth: 640 }}>
          Bring new people onto Rooted Together — when someone you&rsquo;ve onboarded makes a purchase anywhere on the
          marketplace, you earn a cut. The more people you&rsquo;ve onboarded who stay active, the higher your rate.
        </div>

        <div className="responsive-3col" style={{ '--col-a': '1.3fr', '--col-gap': '16px', marginBottom: 20 }}>
          <div style={{ background: 'var(--brown)', borderRadius: 16, padding: '20px 22px', color: 'var(--white)' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Referral earnings (test)
            </div>
            <div className="serif" style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>
              {formatPrice(referralEarningsCents)}
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', marginTop: 10 }}>No real charges have occurred.</div>
          </div>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div className="muted" style={{ fontSize: 12 }}>People you&rsquo;ve onboarded</div>
            <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)', marginTop: 6 }}>
              {referredCount}
            </div>
          </div>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div className="muted" style={{ fontSize: 12 }}>Current tier</div>
            <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)', marginTop: 6 }}>
              {currentTier ? `${currentTier.name} · ${currentTier.rate_percent}%` : 'Not started'}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="field-label" style={{ marginBottom: 8 }}>Your referral link</div>
          <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, fontSize: 13, color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {referralLink || 'Your link is generated automatically — refresh if this is empty right after signing up.'}
            </div>
            <button
              type="button"
              onClick={copyReferralLink}
              className="btn btn-outline btn-small"
              style={{ flexShrink: 0 }}
              disabled={!referralLink}
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
          {referralCode && (
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Sharing in person, on a flyer, or over the phone? Give them your code directly:{' '}
              <strong style={{ color: 'var(--brown)' }}>{referralCode}</strong> — they can type it in at signup.
            </div>
          )}
        </div>

        <div style={{ marginBottom: 8 }}>
          <div className="field-label" style={{ marginBottom: 8 }}>Tiers &amp; milestones</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 10 }}>
            {tiers.map((tier) => {
              const isCurrent = tier === currentTier;
              const isReached = currentTier && tiers.indexOf(tier) < currentTierIndex;
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
                  <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{tier.rate_percent}%</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                    {tier.max_referrals == null ? `${tier.min_referrals}+ onboarded` : `${tier.min_referrals}–${tier.max_referrals} onboarded`}
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
              {Math.max(nextTier.min_referrals - referredCount, 0)} more onboarded
              {' '}to reach {nextTier.name} ({nextTier.rate_percent}%).
            </div>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 8 }}>
            Recent referral earnings
          </div>
          {recentReferrals.length === 0 && (
            <div className="card" style={{ padding: 18 }}>
              <div className="muted" style={{ fontSize: 13 }}>No referral earnings yet — share your link to get started.</div>
            </div>
          )}
          {recentReferrals.length > 0 && (
            <div className="card" style={{ overflow: 'hidden' }}>
              {recentReferrals.map((r, i) => (
                <div
                  key={r.id}
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
                      {r.referred_name} bought {r.offering_title}
                    </div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>
                      {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {formatPrice(r.sale_cents)} sale · {r.rate_percent}% cut
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brown)', flexShrink: 0, paddingLeft: 10 }}>
                    +{formatPrice(r.cut_cents)}
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
