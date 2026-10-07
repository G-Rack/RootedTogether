import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

// Stripe calls this directly — there's no Supabase user session involved,
// so this function must be deployed with verify_jwt = false. The ONLY
// thing that proves a request genuinely came from Stripe is the signature
// check below; never trust this payload otherwise.
//
// Stripe uses a SEPARATE endpoint (and a separate signing secret) for
// events on your own account vs. events on connected accounts, so this
// function accepts up to two secrets and tries each:
//   - STRIPE_WEBHOOK_SECRET          ("Your account" endpoint:
//                                     checkout.session.completed)
//   - STRIPE_CONNECT_WEBHOOK_SECRET  ("Connected accounts" endpoint:
//                                     account events; optional)
// Point both Stripe destinations at this same function URL.
//
// Handles:
//   - checkout.session.completed: writes the real offering_purchases row.
//   - account.updated (v1 event): syncs profiles.stripe_payouts_enabled.
//   - v2.core.account* (thin v2 events, what Accounts v2 sends): looks the
//     account up and syncs profiles.stripe_payouts_enabled.

const STRIPE_API = "https://api.stripe.com";
const STRIPE_V2_VERSION = "2026-09-30.preview";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed.", { status: 405 });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const secrets = [
    Deno.env.get("STRIPE_WEBHOOK_SECRET"),
    Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET"),
  ].filter((s): s is string => !!s);
  if (!stripeKey || secrets.length === 0) {
    console.error("Stripe secrets are not set (need STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET).");
    return new Response("Not configured.", { status: 500 });
  }
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: any = null;
  let lastError: unknown = null;
  for (const secret of secrets) {
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature!, secret);
      break;
    } catch (e) {
      lastError = e;
    }
  }
  if (!event) {
    console.error("Webhook signature verification failed:", lastError);
    return new Response("Invalid signature.", { status: 400 });
  }
  console.log("Stripe webhook received:", event.type, event.id);

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

  // Accounts v2 sends thin events with no account body — just the id of the
  // related object — so look the account up and re-derive the flag.
  if (typeof event.type === "string" && event.type.startsWith("v2.core.account")) {
    const accountId = event.related_object?.id;
    if (accountId) {
      try {
        const res = await fetch(
          `${STRIPE_API}/v2/core/accounts/${accountId}?include=configuration.recipient`,
          {
            headers: {
              Authorization: `Bearer ${stripeKey}`,
              "Stripe-Version": STRIPE_V2_VERSION,
            },
          },
        );
        const account = await res.json();
        if (!res.ok) throw new Error(account?.error?.message || `Stripe returned ${res.status}`);
        const status = account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
        const { error } = await supabase
          .from("profiles")
          .update({ stripe_payouts_enabled: status === "active" })
          .eq("stripe_account_id", accountId);
        if (error) console.error("Failed to update stripe_payouts_enabled (v2):", error);
      } catch (e) {
        console.error("v2 account lookup from webhook failed:", e);
      }
    }
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
