import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";
import { ensureGuestBuyer } from "../_shared/guest.ts";

// Called by the offering page when a guest comes back from Stripe Checkout
// (?purchase=success&guest=1&session_id=cs_...). It:
//   1. asks Stripe whether that session is a real, paid guest checkout for this offering
//      (never trusts the page), less than 24 hours old;
//   2. makes sure the buyer's account and purchase exist (the webhook may not have run yet;
//      both are safe to run twice);
//   3. for a BRAND-NEW account only, and only once per payment, returns a one-time sign-in
//      token so the buyer is signed in on this device straight away. An email that already had
//      an account is never signed in here: the page asks them to log in instead.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]{10,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  let p: any;
  try { p = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const sessionId = String(p?.session_id || "").trim();
  const offeringId = String(p?.offering_id || "").trim();
  if (!SESSION_RE.test(sessionId) || !UUID_RE.test(offeringId)) return json({ error: "Invalid request." }, 400);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return json({ error: "Payments aren't configured." }, 500);
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return json({ error: "We couldn't find that payment." }, 404);
  }
  if (session.metadata?.guest !== "1" || session.metadata?.offering_id !== offeringId) {
    return json({ error: "We couldn't find that payment." }, 404);
  }
  if (session.status !== "complete" || session.payment_status !== "paid") {
    return json({ ok: true, paid: false });
  }
  if (Date.now() / 1000 - (session.created || 0) > 24 * 60 * 60) {
    return json({ ok: true, paid: true, signin: false, expired: true });
  }

  const email = (session.customer_details?.email || session.customer_email || "").trim().toLowerCase();
  let buyer;
  try {
    buyer = await ensureGuestBuyer(admin, session.id, email, session.customer_details?.name ?? null);
  } catch (e) {
    console.error("guest-checkout-claim: account step failed", session.id, e);
    return json({ error: "Your payment went through, but we couldn't open it yet. Check your email, or try again in a minute." }, 502);
  }

  // Same purchase row the webhook writes. Safe if the webhook already wrote it.
  const { data: existing } = await admin.from("offering_purchases").select("id")
    .eq("stripe_checkout_session_id", session.id).maybeSingle();
  if (!existing) {
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
    let applicationFee = 0;
    let stripeFee = 0;
    if (paymentIntentId) {
      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge.balance_transaction"] });
        applicationFee = typeof pi.application_fee_amount === "number" ? pi.application_fee_amount : 0;
        const charge = pi.latest_charge as Stripe.Charge | null;
        const bt = charge && typeof charge !== "string" ? charge.balance_transaction : null;
        if (bt && typeof bt !== "string") {
          stripeFee = (bt.fee_details || []).filter((d) => d.type === "stripe_fee").reduce((sum, d) => sum + d.amount, 0);
        }
      } catch (e) {
        console.error("guest-checkout-claim: fee lookup failed", e);
      }
    }
    const { error } = await admin.from("offering_purchases").insert({
      offering_id: offeringId,
      buyer_auth_id: buyer.userId,
      price_paid_cents: session.amount_total ?? 0,
      platform_fee_cents: applicationFee,
      stripe_fee_cents: stripeFee,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
    });
    if (error && (error as { code?: string }).code !== "23505") {
      console.error("guest-checkout-claim: purchase insert failed", error);
      return json({ error: "Your payment went through, but we couldn't open it yet. Check your email, or try again in a minute." }, 502);
    }
  }

  if (!buyer.createdNew) return json({ ok: true, paid: true, signin: false, existing: true });

  // One sign-in per payment: claim it atomically.
  const { data: claimed } = await admin.from("guest_checkouts")
    .update({ signin_issued_at: new Date().toISOString() })
    .eq("stripe_session_id", session.id)
    .is("signin_issued_at", null)
    .select("stripe_session_id")
    .maybeSingle();
  if (!claimed) return json({ ok: true, paid: true, signin: false, used: true });

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    console.error("guest-checkout-claim: generateLink failed", linkError);
    await admin.from("guest_checkouts").update({ signin_issued_at: null }).eq("stripe_session_id", session.id);
    return json({ ok: true, paid: true, signin: false });
  }
  return json({ ok: true, paid: true, signin: true, token_hash: tokenHash });
});
