import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";
import { membershipEmail } from "./email.ts";

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
//     Sessions that come from a Payment Link (no offering metadata) are the
//     $49 creator membership: they are recorded in creator_memberships and
//     the buyer is emailed their one-time sign-up link (best effort).
//     Payment Links listed in MEMBERSHIP_PRO_PAYMENT_LINK_IDS ($88 Creator
//     Pro) are recorded as a membership AND as a Creator Pro purchase.
//     Payment Links listed in MEMBERSHIP_UPGRADE_PAYMENT_LINK_IDS ($39
//     upgrade for existing members) are recorded as a Creator Pro purchase
//     only. Pro is granted to the matching account by email right away, or
//     claimed later (sync_my_pro) if that person signs up afterwards.
//     Sessions with service_request_id metadata are paid prayer/meditation
//     requests: the request is flipped from pending_payment to new.
//     Both record Stripe's processing fee (stripe_fee_cents) so referral
//     cuts can be worked out on NET sales.
//   - checkout.session.expired: removes an unpaid pending service request.
//   - account.updated (v1 event): syncs profiles.stripe_payouts_enabled.
//   - v2.core.account* (thin v2 events, what Accounts v2 sends): looks the
//     account up and syncs profiles.stripe_payouts_enabled.

const STRIPE_API = "https://api.stripe.com";
const STRIPE_V2_VERSION = "2026-09-30.preview";
const MEMBERSHIP_MIN_CENTS = 4900;

function envList(name: string): string[] {
  return (Deno.env.get(name) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

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

    // Paid service request (daily prayer / guided meditation), pay-first flow.
    // create-service-checkout saved the request as 'pending_payment'; once the
    // payment really succeeds it becomes 'new' and shows up for the creator.
    // The status filter makes a Stripe redelivery a harmless no-op.
    const serviceRequestId = session.metadata?.service_request_id;
    if (serviceRequestId) {
      if (session.payment_status !== "paid") {
        console.log("Service request session not paid yet, ignoring:", session.id, session.payment_status);
        return new Response("ok", { status: 200 });
      }
      const servicePaymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
      const serviceFees = servicePaymentIntentId
        ? await fetchFees(stripe, servicePaymentIntentId)
        : { applicationFee: 0, stripeFee: 0 };
      const { error: serviceError } = await supabase
        .from("service_requests")
        .update({
          status: "new",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: servicePaymentIntentId,
          amount_cents: session.amount_total ?? undefined,
          platform_fee_cents: serviceFees.applicationFee,
          stripe_fee_cents: serviceFees.stripeFee,
        })
        .eq("id", serviceRequestId)
        .eq("status", "pending_payment");
      if (serviceError) {
        console.error("Failed to mark service request paid:", serviceError);
        // Non-2xx so Stripe retries delivery instead of silently dropping a paid request.
        return new Response("Failed to record service request.", { status: 500 });
      }
      console.log("Service request paid:", serviceRequestId);
      return new Response("ok", { status: 200 });
    }

    // Payment Link purchase (no marketplace metadata) = creator membership,
    // annual Creator Pro ($39 a year, $88 the first year with the membership), or the Pro upgrade ($39 a year) for existing members.
    if (session.payment_link && !session.metadata?.offering_id) {
      const linkId = typeof session.payment_link === "string" ? session.payment_link : session.payment_link?.id;
      const isUpgrade = !!linkId && envList("MEMBERSHIP_UPGRADE_PAYMENT_LINK_IDS").includes(linkId);
      const isProFull = !!linkId && envList("MEMBERSHIP_PRO_PAYMENT_LINK_IDS").includes(linkId);

      let result: "ok" | "retry";
      if (isUpgrade) {
        result = await recordProPurchase(supabase, session, "upgrade");
      } else if (isProFull) {
        result = await recordMembership(supabase, session, true);
        if (result === "ok") result = await recordProPurchase(supabase, session, "full");
      } else {
        result = await recordMembership(supabase, session, false);
      }
      if (result === "retry") {
        // Non-2xx so Stripe retries delivery instead of silently dropping a paid membership.
        return new Response("Failed to record membership.", { status: 500 });
      }
      return new Response("ok", { status: 200 });
    }

    const offeringId = session.metadata?.offering_id;
    const buyerAuthId = session.metadata?.buyer_auth_id;
    if (!offeringId || !buyerAuthId) {
      console.error("checkout.session.completed missing metadata", session.id);
      return new Response("ok", { status: 200 });
    }

    const amountTotal = session.amount_total ?? 0;
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
    const fees = paymentIntentId
      ? await fetchFees(stripe, paymentIntentId)
      : { applicationFee: 0, stripeFee: 0 };

    // Stripe can and does retry webhook delivery, so this must be safe to
    // run twice for the same session without creating a duplicate purchase.
    // (A plain upsert with onConflict doesn't work here: the unique index on
    // stripe_checkout_session_id is partial — WHERE ... IS NOT NULL — and
    // Postgres can't infer a partial index for ON CONFLICT, error 42P10.)
    // So: look for an existing row first, then insert; a concurrent retry
    // that slips between the two hits the unique index (23505) and is ignored.
    const { data: existing, error: lookupError } = await supabase
      .from("offering_purchases")
      .select("id")
      .eq("stripe_checkout_session_id", session.id)
      .maybeSingle();
    if (lookupError) console.error("Purchase lookup failed:", lookupError);

    if (existing) {
      console.log("Purchase already recorded for session", session.id);
    } else {
      const { error } = await supabase.from("offering_purchases").insert({
        offering_id: offeringId,
        buyer_auth_id: buyerAuthId,
        price_paid_cents: amountTotal,
        platform_fee_cents: fees.applicationFee,
        stripe_fee_cents: fees.stripeFee,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
      });
      if (error && error.code === "23505") {
        console.log("Purchase already recorded (duplicate ignored) for session", session.id, error.message);
      } else if (error) {
        console.error("Failed to record purchase from webhook:", error);
        // Non-2xx so Stripe retries delivery instead of silently dropping a paid purchase.
        return new Response("Failed to record purchase.", { status: 500 });
      } else {
        console.log("Purchase recorded for session", session.id);
      }
    }
  }

  // An abandoned prayer/meditation checkout: drop the unpaid pending request.
  if (event.type === "checkout.session.expired") {
    const expired = event.data.object as Stripe.Checkout.Session;
    const expiredRequestId = expired.metadata?.service_request_id;
    if (expiredRequestId) {
      await supabase
        .from("service_requests")
        .delete()
        .eq("id", expiredRequestId)
        .eq("status", "pending_payment");
    }
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

  // Annual Creator Pro: when the subscription ends (cancelled, or a renewal never got paid),
  // take Creator Pro away. Renewals that succeed need nothing: Pro just carries on. Pro that
  // came from an invitation or was granted by hand is never touched.
  if (
    event.type === "customer.subscription.deleted" ||
    (event.type === "customer.subscription.updated" &&
      ["canceled", "unpaid", "incomplete_expired"].includes((event.data.object as any)?.status))
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const { error: endError } = await supabase.rpc("end_pro_subscription", { p_subscription_id: subscription.id });
    if (endError) {
      console.error("Failed to end Creator Pro for subscription:", subscription.id, endError);
      // Non-2xx so Stripe retries instead of leaving Pro on for a cancelled member.
      return new Response("Failed to end Creator Pro.", { status: 500 });
    }
    console.log("Creator Pro subscription ended:", subscription.id);
  }

  return new Response("ok", { status: 200 });
});

// The platform's cut (application fee) and Stripe's own processing fee for a
// payment. Both default to 0 if Stripe can't be reached, so a lookup problem
// never blocks recording a paid purchase.
async function fetchFees(
  stripe: Stripe,
  paymentIntentId: string,
): Promise<{ applicationFee: number; stripeFee: number }> {
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge.balance_transaction"],
    });
    const applicationFee = typeof pi.application_fee_amount === "number" ? pi.application_fee_amount : 0;
    let stripeFee = 0;
    const charge = pi.latest_charge as Stripe.Charge | null;
    const bt = charge && typeof charge !== "string" ? charge.balance_transaction : null;
    if (bt && typeof bt !== "string") {
      const processing = (bt.fee_details || []).filter((d) => d.type === "stripe_fee");
      stripeFee = processing.length > 0
        ? processing.reduce((sum, d) => sum + d.amount, 0)
        : 0;
    }
    return { applicationFee, stripeFee };
  } catch (e) {
    console.error("Couldn't retrieve payment intent for fee lookup:", e);
    return { applicationFee: 0, stripeFee: 0 };
  }
}

// Records a Creator Pro purchase ($88 full, or $39 upgrade) and grants Pro to
// the account with that email if it exists. If it doesn't exist yet, the purchase
// stays unclaimed and the buyer is granted Pro the first time they sign in
// (sync_my_pro). Safe to run twice for the same session.
async function recordProPurchase(
  supabase: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
  kind: "full" | "upgrade",
): Promise<"ok" | "retry"> {
  if (session.payment_status !== "paid") {
    console.log("Pro session not paid yet, ignoring:", session.id, session.payment_status);
    return "ok";
  }
  if (String(session.currency).toLowerCase() !== "usd" || (session.amount_total ?? 0) <= 0) {
    console.log("Pro purchase has unexpected amount/currency, ignoring:", session.id, session.amount_total);
    return "ok";
  }
  const email = (session.customer_details?.email || session.customer_email || "").trim();
  if (!email) {
    console.error("Pro payment has no email, cannot record:", session.id);
    return "ok";
  }
  const linkId = typeof session.payment_link === "string" ? session.payment_link : session.payment_link?.id;

  const { error } = await supabase.from("creator_pro_purchases").insert({
    stripe_session_id: session.id,
    email,
    kind,
    amount_total: session.amount_total ?? null,
    currency: String(session.currency ?? "usd").toLowerCase(),
    payment_link_id: linkId ?? null,
    // Annual Creator Pro is a subscription; remember it so we can end Pro when it ends.
    stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
    stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
  });
  if (error && error.code === "23505") {
    console.log("Pro purchase already recorded for session", session.id);
  } else if (error) {
    console.error("Failed to record Pro purchase:", error);
    return "retry";
  } else {
    console.log("Pro purchase recorded:", kind, session.id);
  }

  // Grant now if the account exists. Failure here is retried by Stripe.
  const { data: granted, error: grantError } = await supabase.rpc("grant_pro_by_email", { p_email: email });
  if (grantError) {
    console.error("grant_pro_by_email failed:", grantError);
    return "retry";
  }
  console.log(granted ? "Pro granted to existing account for session" : "No account yet; Pro will be claimed on sign-up", session.id);
  return "ok";
}

// Records a paid creator-membership Payment Link purchase. Returns "ok" (recorded or already
// there, or deliberately ignored) or "retry" (database failure, ask Stripe to redeliver).
// skipLinkCheck is true for links already identified as the Pro link by the caller.
async function recordMembership(
  supabase: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
  skipLinkCheck: boolean,
): Promise<"ok" | "retry"> {
  if (session.payment_status !== "paid") {
    console.log("Membership session not paid yet, ignoring:", session.id, session.payment_status);
    return "ok";
  }
  const linkId = typeof session.payment_link === "string" ? session.payment_link : session.payment_link?.id;
  const allowed = envList("MEMBERSHIP_PAYMENT_LINK_IDS");
  if (!skipLinkCheck && allowed.length && (!linkId || !allowed.includes(linkId))) {
    console.log("Payment link is not a membership link, ignoring:", linkId);
    return "ok";
  }
  if ((session.amount_total ?? 0) < MEMBERSHIP_MIN_CENTS || String(session.currency).toLowerCase() !== "usd") {
    console.log("Payment link purchase is not a $49+ membership, ignoring:", session.id, session.amount_total);
    return "ok";
  }
  const email = (session.customer_details?.email || session.customer_email || "").trim();
  if (!email) {
    console.error("Membership payment has no email, cannot record:", session.id);
    return "ok";
  }

  const { error } = await supabase.from("creator_memberships").insert({
    stripe_session_id: session.id,
    stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
    payment_link_id: linkId ?? null,
    email,
    amount_total: session.amount_total ?? null,
    currency: String(session.currency ?? "usd").toLowerCase(),
    client_reference_id: session.client_reference_id ?? null,
  });
  if (error && error.code === "23505") {
    console.log("Membership already recorded for session", session.id);
    return "ok";
  }
  if (error) {
    console.error("Failed to record membership:", error);
    return "retry";
  }
  console.log("Membership recorded for session", session.id);

  // Best effort: email the one-time sign-up link as a backup to the redirect, in case the
  // buyer closes the tab after paying. Never fails the webhook.
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey) {
    try {
      const site = Deno.env.get("SIGNUP_SITE_URL") ?? "https://rootedtogether.club";
      const link = `${site}/login?tab=signup&session_id=${encodeURIComponent(session.id)}`;
      const { subject, text, html } = membershipEmail(link);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Rooted Together <admin@rootedtogether.club>",
          to: [email],
          subject,
          text,
          html,
        }),
      });
      if (!res.ok) console.error("Membership email failed:", res.status, await res.text());
      else {
        await supabase.from("creator_memberships")
          .update({ last_emailed_at: new Date().toISOString() })
          .eq("stripe_session_id", session.id);
      }
    } catch (e) {
      console.error("Membership email error:", e);
    }
  } else {
    console.log("RESEND_API_KEY not set - skipping membership email.");
  }
  return "ok";
}
