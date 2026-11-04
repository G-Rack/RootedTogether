// Sample sales for recording Creator Academy videos.
//
// Shows example sales on the dashboard and Payouts screens for the sara-test
// account ONLY. Nothing is written to the database: no notifications, no
// referral commissions, no Stripe activity. Every screen that shows them also
// shows a "Sample data" label.
//
// To switch off after recording, set DEMO_SALES_ENABLED to false and ship.
export const DEMO_SALES_ENABLED = true;

const DEMO_ACCOUNT_ID = 'c69eae27-7162-4c6f-b2df-fb5f5cfd5c7a'; // sara-test
const DEMO_SALE_COUNT = 15;
// How many days ago each sample sale happened (most recent first).
const DAYS_AGO = [0, 1, 1, 2, 3, 5, 6, 8, 9, 11, 13, 15, 18, 21, 24];

export function isDemoSalesAccount(userId) {
  return DEMO_SALES_ENABLED && userId === DEMO_ACCOUNT_ID;
}

// Builds sample purchases shaped like rows from offering_purchases, spread
// across the account's paid offerings (or its first offering if none are paid).
export function buildDemoPurchases(offerings) {
  const list = offerings || [];
  const paid = list.filter((o) => (o.price_cents || 0) > 0);
  const pool = paid.length > 0 ? paid : list.slice(0, 1);
  if (pool.length === 0) return [];

  const now = Date.now();
  return Array.from({ length: DEMO_SALE_COUNT }, (_, i) => {
    const offering = pool[i % pool.length];
    const purchased = new Date(now - DAYS_AGO[i] * 86400000 - (i * 37 + 11) * 60000);
    return {
      id: `demo-sale-${i + 1}`,
      offering_id: offering.id,
      buyer_auth_id: `demo-buyer-${i + 1}`,
      price_paid_cents: offering.price_cents || 0,
      purchased_at: purchased.toISOString(),
      _demo: true,
    };
  });
}

export function SampleDataLabel({ style }) {
  return (
    <span
      title="Example sales shown for demonstration. Not real purchases."
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: 'var(--brown)',
        background: 'rgba(200,146,63,0.16)',
        border: '1px solid rgba(200,146,63,0.45)',
        borderRadius: 999,
        padding: '3px 10px',
        ...style,
      }}
    >
      Sample data
    </span>
  );
}
