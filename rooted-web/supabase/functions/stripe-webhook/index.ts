import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

// Stripe calls this directly — there's no Supabase user session involved,
// so this function must be deployed with verify_jwt = false. The ONLY
// thing that proves a request genuinely came from Stripe is the signature
// check below; never trust this payload otherwise.
//
// Handles two event types:
//   - checkout.session.completed: writes the real offering_purchases row
//     (the client never inserts this for a paid purchase — see
//     create-checkout-session and the add_stripe_connect_and_checkout
//     migration's tightened RLS policy).
//   - account.updated: keeps profiles.stripe_payouts_enabled in sync with
//     whether a creator has actually finished Stripe's onboarding.

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed.", { status: 405 });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    console.error("Stripe secrets are not set.");
    return new Response("Not configured.", { status: 500 });
  }
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (e) {
    console.error("Webhook signature verification failed:", e);
    return new Response("Invalid signature.", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const offeringId = session.metadata?.offering_id;
    const buyerAuthId = session.metadata?.buyer_auth_id;
    if (!offeringId || !buyerAuthId) {
      console.error("checkout.session.completed missing metadata", session.id);
      return new Response("ok", { status: 200 });
    }

    const amountTotal = session.amount_total ?? 0;
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
    const applicationFeeAmount = paymentIntentId ? await fetchApplicationFee(stripe, paymentIntentId) : 0;

    // upsert on the unique stripe_checkout_session_id index — Stripe can
    // and does retry webhook delivery, so this must be safe to run twice
    // for the same session without creating a duplicate purchase.
    const { error } = await supabase.from("offering_purchases").upsert(
      {
        offering_id: offeringId,
        buyer_auth_id: buyerAuthId,
        price_paid_cents: amountTotal,
        platform_fee_cents: applicationFeeAmount,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
      },
      { onConflict: "stripe_checkout_session_id" },
    );
    if (error) console.error("Failed to record purchase from webhook:", error);
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const payoutsEnabled = !!(account.charges_enabled && account.payouts_enabled);
    const { error } = await supabase
      .from("profiles")
      .update({ stripe_payouts_enabled: payoutsEnabled })
      .eq("stripe_account_id", account.id);
    if (error) console.error("Failed to update stripe_payouts_enabled:", error);
  }

  return new Response("ok", { status: 200 });
});

async function fetchApplicationFee(stripe: Stripe, paymentIntentId: string): Promise<number> {
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    return typeof pi.application_fee_amount === "number" ? pi.application_fee_amount : 0;
  } catch (e) {
    console.error("Couldn't retrieve payment intent for fee lookup:", e);
    return 0;
  }
}
