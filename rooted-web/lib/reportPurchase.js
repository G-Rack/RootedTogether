import { FUNCTIONS_URL, SUPABASE_ANON_KEY } from './config';
import { trackPurchase } from './tracking';

// After a Stripe Payment Link purchase (the $49 membership, the $88 Creator Pro first year, the
// $39 Creator Pro upgrade), asks the conversion-info function what the payment was really worth
// and reports it to Google Ads. The Stripe session id is the transaction id, so a refresh or a
// second visit to the same page is never counted twice. Never throws and never blocks the page.
export async function reportPaymentLinkPurchase(sessionId, kind) {
  try {
    const res = await fetch(`${FUNCTIONS_URL}/conversion-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ sessionId }),
    });
    const info = await res.json().catch(() => ({}));
    if (!info.ok) return;
    // $49 is the plain membership; $88 (49 + 39) is the Creator Pro first year.
    const resolved = kind || (info.value >= 80 ? 'pro' : 'membership');
    trackPurchase({ value: info.value, currency: info.currency, transactionId: sessionId, kind: resolved });
  } catch {
    /* tracking must never get in the way of the person's payment or sign-up */
  }
}
