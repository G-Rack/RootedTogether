'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { formatPrice, OFFERING_TYPE_LABELS } from '@/lib/roles';
import { FUNCTIONS_URL } from '@/lib/config';

const TYPE_DOT = {
  course: 'var(--brown)',
  ebook: 'var(--brown-light)',
  routine: 'var(--brown-pale)',
  call: 'var(--text-soft)',
  prayer: 'var(--brown-pale)',
  meditation: 'var(--brown-light)',
};

const SERVICE_SALE_LABELS = { prayer: 'Daily prayer', meditation: 'Guided meditation' };
const PACKAGE_SALE_LABELS = { single: 'Single', week: '7-day', month: '30-day' };

export default function PayoutsPage() {
  const { session, profile } = useSession();
  const searchParams = useSearchParams();
  const [offerings, setOfferings] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stripe Connect status, kept on `profiles` (every user has exactly one
  // row there — see stripe-connect-onboarding's own comment on why this
  // isn't on creator_storefronts instead).
  const [stripeAccountId, setStripeAccountId] = useState(null);
  const [stripePayoutsEnabled, setStripePayoutsEnabled] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  // Manual payouts: the creator's Stripe balance and the "Request payout" flow.
  const [payoutBalance, setPayoutBalance] = useState(null); // { availableCents, pendingCents, minPayoutCents }
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [payoutNotice, setPayoutNotice] = useState(null);
  const [payoutError, setPayoutError] = useState(null);
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

      // Paid prayer / meditation requests count as sales too. They're shaped
      // like offering purchases so the totals, breakdown and recent-sales
      // list below don't need to care where a sale came from.
      const { data: serviceRows } = await supabase
        .from('service_requests')
        .select('id, service_type, package_id, amount_cents, paid_at')
        .eq('creator_auth_id', session.user.id)
        .in('status', ['new', 'done'])
        .gt('amount_cents', 0);
      const serviceSales = (serviceRows || []).map((r) => ({
        id: `service-${r.id}`,
        offering_id: null,
        purchased_at: r.paid_at,
        price_paid_cents: r.amount_cents,
        _type: r.service_type,
        _title: `${SERVICE_SALE_LABELS[r.service_type] || 'Request'}${PACKAGE_SALE_LABELS[r.package_id] ? ` · ${PACKAGE_SALE_LABELS[r.package_id]}` : ''}`,
      }));
      purchaseRows = [...purchaseRows, ...serviceSales].sort(
        (a, b) => new Date(b.purchased_at) - new Date(a.purchased_at),
      );

      await Promise.all([
        loadStripeStatus(session.user.id),
      ]);

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

  // Returning from Stripe's hosted onboarding: ask the onboarding function
  // to re-check the account directly with Stripe and update
  // profiles.stripe_payouts_enabled, rather than waiting on a webhook.
  // A new account can take a few seconds to show as active, so retry briefly
  // rather than showing "not connected" right after the user just finished.
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    if (!session || !stripeParam) return;
    if (stripeParam === 'complete') {
      let cancelled = false;
      setCheckingStripeReturn(true);
      (async () => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          try {
            await fetch(`${FUNCTIONS_URL}/stripe-connect-onboarding`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ action: 'status' }),
            });
          } catch (err) {
            // fall through — loadStripeStatus below just reads what's stored
          }
          const data = await loadStripeStatus(session.user.id);
          if (cancelled) return;
          if (data?.stripe_payouts_enabled) break;
          await new Promise((resolve) => setTimeout(resolve, 2000));
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

  // Stripe now opens in its own tab, so when the creator comes back to this one, re-check
  // whether their payouts are switched on instead of leaving "Finish Stripe setup" showing.
  useEffect(() => {
    if (!session || !stripeAccountId || stripePayoutsEnabled) return undefined;
    const recheck = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        await fetch(`${FUNCTIONS_URL}/stripe-connect-onboarding`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'status' }),
        });
      } catch {
        // just read what is stored
      }
      await loadStripeStatus(session.user.id);
    };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [session, stripeAccountId, stripePayoutsEnabled]);

  async function handleConnectStripe() {
    if (!session) return;
    setConnecting(true);
    setConnectError(null);
    // Open the new tab right away, inside the click, so the browser's popup blocker allows
    // it — then point it at Stripe once the link is ready.
    const stripeTab = window.open('', '_blank');
    if (stripeTab) {
      stripeTab.opener = null;
      stripeTab.document.title = 'Opening Stripe…';
    }
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
      if (stripeTab) {
        stripeTab.location.href = data.url;
      } else {
        // Popup blocked entirely — fall back to this tab.
        window.location.href = data.url;
        return;
      }
      setConnecting(false);
    } catch (err) {
      if (stripeTab) stripeTab.close();
      setConnectError(err.message || "Couldn't start Stripe onboarding — please try again.");
      setConnecting(false);
    }
  }

  async function callStripeFunction(body) {
    const res = await fetch(`${FUNCTIONS_URL}/stripe-connect-onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  async function loadPayoutBalance() {
    if (!session) return;
    try {
      const { ok, data } = await callStripeFunction({ action: 'balance' });
      if (ok) setPayoutBalance(data);
    } catch {
      // Balance is a nicety — the page still works without it.
    }
  }

  useEffect(() => {
    if (session && stripePayoutsEnabled) loadPayoutBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, stripePayoutsEnabled]);

  async function handleRequestPayout() {
    if (!session || payoutBusy) return;
    setPayoutBusy(true);
    setPayoutError(null);
    setPayoutNotice(null);
    try {
      const { ok, data } = await callStripeFunction({ action: 'payout' });
      if (!ok) throw new Error(data?.error || "Couldn't create your payout.");
      const arrives = data.arrivalDate
        ? new Date(data.arrivalDate * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : null;
      setPayoutNotice(
        `Payout of ${formatPrice(data.amountCents)} requested${arrives ? ` — expected in your bank by ${arrives}` : ''}.`
      );
      await loadPayoutBalance();
    } catch (err) {
      setPayoutError(err.message || "Couldn't create your payout — please try again.");
    } finally {
      setPayoutBusy(false);
    }
  }

  // Sends a connected creator to their Stripe Express Dashboard (balance,
  // upcoming payouts, bank details). Stripe's login links are single-use,
  // so a fresh one is requested on every click.
  async function handleOpenStripeDashboard() {
    if (!session) return;
    setOpeningDashboard(true);
    setConnectError(null);
    // Open the new tab right away, inside the click, so the browser's popup
    // blocker allows it — then point it at Stripe once the link is ready.
    const stripeTab = window.open('', '_blank');
    if (stripeTab) {
      stripeTab.opener = null;
      stripeTab.document.title = 'Opening Stripe…';
    }
    try {
      const res = await fetch(`${FUNCTIONS_URL}/stripe-connect-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'dashboard' }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Couldn't open your Stripe dashboard.");
      }
      if (stripeTab) {
        stripeTab.location.href = data.url;
      } else {
        // Popup blocked entirely — fall back to this tab.
        window.location.href = data.url;
        return;
      }
      setOpeningDashboard(false);
    } catch (err) {
      if (stripeTab) stripeTab.close();
      setConnectError(err.message || "Couldn't open your Stripe dashboard — please try again.");
      setOpeningDashboard(false);
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
      const t = p._type || offeringById[p.offering_id]?.type || 'other';
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
        {stripePayoutsEnabled
          ? 'Every sale below is a real purchase. Your payout account is connected, so your earnings are paid out to you through Stripe.'
          : 'Every sale below is a real purchase. Connect a payout account to get your earnings paid out to you.'}
      </div>

      <div className="responsive-3col" style={{ '--col-a': '1.3fr', '--col-gap': '16px', marginBottom: 24 }}>
        <div style={{ background: 'var(--brown)', borderRadius: 16, padding: '20px 22px', color: 'var(--white)' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Total earnings
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
                    <span style={{ fontSize: 13.5 }}>{OFFERING_TYPE_LABELS[t] || SERVICE_SALE_LABELS[t] || 'Other'}</span>
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
            ) : null}
            {stripePayoutsEnabled ? (
              <div style={{ marginTop: 12 }}>
                {payoutBalance ? (
                  <div style={{ display: 'flex', gap: 24, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>Available to pay out</div>
                      <div className="serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--brown)' }}>
                        {formatPrice(payoutBalance.availableCents)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>Pending</div>
                      <div className="serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-soft)' }}>
                        {formatPrice(payoutBalance.pendingCents)}
                      </div>
                    </div>
                  </div>
                ) : null}
                <div style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 10 }}>
                  Your earnings build up in your Stripe balance. Request a payout whenever you&apos;d like to send
                  them to your bank
                  {payoutBalance ? ` (minimum ${formatPrice(payoutBalance.minPayoutCents)})` : ''}.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-small"
                    onClick={handleRequestPayout}
                    disabled={
                      payoutBusy ||
                      !payoutBalance ||
                      payoutBalance.availableCents < payoutBalance.minPayoutCents
                    }
                  >
                    {payoutBusy ? 'Requesting payout…' : 'Request payout'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-small"
                    onClick={handleOpenStripeDashboard}
                    disabled={openingDashboard}
                  >
                    {openingDashboard ? 'Opening Stripe…' : 'Open Stripe dashboard'}
                  </button>
                </div>
                {payoutNotice && (
                  <div className="success-banner" style={{ marginTop: 10, fontSize: 12.5 }}>
                    {payoutNotice}
                  </div>
                )}
                {payoutError && (
                  <div className="error-banner" style={{ marginTop: 10, fontSize: 12.5 }}>
                    {payoutError}
                  </div>
                )}
                {connectError && (
                  <div className="error-banner" style={{ marginTop: 10, fontSize: 12.5 }}>
                    {connectError}
                  </div>
                )}
              </div>
            ) : null}
            {!stripePayoutsEnabled && checkingStripeReturn ? (
              <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>Checking your Stripe status…</div>
            ) : !stripePayoutsEnabled ? (
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
                  {connecting ? 'Opening Stripe…' : stripeAccountId ? 'Finish Stripe setup' : 'Connect with Stripe'}
                </button>
                {connectError && (
                  <div className="error-banner" style={{ marginTop: 10, fontSize: 12.5 }}>
                    {connectError}
                  </div>
                )}
              </div>
            ) : null}
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
                      {p._title || offeringById[p.offering_id]?.title || 'Offering'}
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

      {/* Referrals now live on their own page (Dashboard > Referrals). */}
      <div className="card" style={{ marginTop: 40, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div className="serif" style={{ fontSize: 17, fontWeight: 700, color: 'var(--brown)' }}>Referral Program</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Share your link and earn when people you onboard buy on the marketplace.</div>
        </div>
        <Link href="/dashboard/referrals" className="btn btn-outline btn-small">Open referrals</Link>
      </div>
    </div>
  );
}
