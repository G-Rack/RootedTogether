import { supabase } from './supabaseClient';

// Paid items can only be published once the creator has connected Stripe
// (otherwise a buyer's checkout is refused: "hasn't finished setting up payouts").

export async function fetchPayoutsEnabled(userId) {
  const { data } = await supabase.from('profiles').select('stripe_payouts_enabled').eq('id', userId).maybeSingle();
  return !!data?.stripe_payouts_enabled;
}

export function isPaidOffering(offering) {
  return !offering.is_free_for_family && (offering.price_cents || 0) > 0;
}

// When a creator tries to publish a paid item before connecting Stripe, we save it as a
// draft, send them to set up payouts, and remember which item to publish when they're done
// (Stripe's setup happens in another tab/page, so this is kept in the browser).
const KEY = 'rt-pending-publish';

export function setPendingPublish(offering) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ id: offering.id, title: offering.title }));
  } catch { /* storage unavailable: the creator can still publish from My Offerings */ }
}

export function getPendingPublish() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingPublish() {
  try {
    localStorage.removeItem(KEY);
  } catch { /* nothing to clear */ }
}
