import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

// Creates a Stripe Checkout Session for a paid offering. Called from the
// "Buy Now" / "Reserve & Pay" button on the offering detail page — free
// offerings (price $0, or free-for-family unlocks) never reach this
// function; those still go through the direct client-side insert, which
// RLS only allows when price_paid_cents is actually 0 (see the
// add_stripe_connect_and_checkout migration).
//
// Fee schedule (US cents). Stripe charges us its card fee on every sale, so each
// creator tier adds an estimate of it on top of our own cut:
//   Creator            10% + Stripe's card fee
//   Creator Pro (paid)  5% + Stripe's card fee
//   Founding creator   10% + Stripe's card fee. Founding creators are the people who
//                      sign up through the private /chosen invitation page. They get
//                      Creator Pro free, but keep the standard 10% rate, not the Pro 5%.
// Never more than the price itself. To change a rate, edit it here and redeploy.
const STANDARD_RATE = 0.10;
const PRO_RATE = 0.05;

function stripeFeeEstimate(priceCents: number): number {
  return Math.round(priceCents * 0.029) + 30;
}

function platformFeeCents(priceCents: number, isPro: boolean, isFounding: boolean): number {
  const rate = isPro && !isFounding ? PRO_RATE : STANDARD_RATE;
  return Math.min(priceCents, Math.round(priceCents * rate) + stripeFeeEstimate(priceCents));
}

// True for creators who signed up through the /chosen invitation page (recorded in
// invitation_signups). If the lookup fails we answer "founding", which is the higher
// standard fee, never a discount.
async function isFoundingCreator(supabase: any, creatorAuthId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("invitation_signups")
      .select("auth_user_id")
      .eq("auth_user_id", creatorAuthId)
      .limit(1);
    if (error) {
      console.error("Founding lookup failed, using standard fee:", error);
      return true;
    }
    return Array.isArray(data) && data.length > 0;
  } catch (e) {
    console.error("Founding lookup failed, using standard fee:", e);
    return true;
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return jsonResponse({ error: "Not signed in." }, 401);
  }
  const buyerAuthId = userData.user.id;

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid request." }, 400);
  }
  const { offeringId, origin: rawOrigin } = payload || {};
  if (!offeringId) return jsonResponse({ error: "Missing offeringId." }, 400);
  const origin = typeof rawOrigin === "string" && rawOrigin.startsWith("https://") ? rawOrigin : "https://rootedtogether.club";

  const { data: offering, error: offeringError } = await supabase
    .from("offerings")
    .select("id, title, price_cents, status, is_free_for_family, creator_auth_id")
    .eq("id", offeringId)
    .maybeSingle();
  if (offeringError || !offering || offering.status !== "published") {
    return jsonResponse({ error: "This offering isn't available." }, 404);
  }

  const { data: existingPurchase } = await supabase
    .from("offering_purchases")
    .select("id")
    .eq("offering_id", offeringId)
    .eq("buyer_auth_id", buyerAuthId)
    .maybeSingle();
  if (existingPurchase) return jsonResponse({ error: "You already own this." }, 409);

  // Free-for-family unlocks never touch Stripe — same check the RLS policy
  // enforces for the direct-insert path the client still uses for these.
  if (offering.is_free_for_family) {
    const { data: isFamily } = await supabase.rpc("is_accepted_family_member_of_creator", {
      creator_id: offering.creator_auth_id,
    });
    if (isFamily) {
      return jsonResponse({ error: "This is free for you — no checkout needed." }, 400);
    }
  }

  if (!offering.price_cents || offering.price_cents <= 0) {
    return jsonResponse({ error: "This offering has no price set." }, 400);
  }

  const { data: creatorProfile } = await supabase
    .from("profiles")
    .select("stripe_account_id, stripe_payouts_enabled")
    .eq("id", offering.creator_auth_id)
    .maybeSingle();

  if (!creatorProfile?.stripe_account_id || !creatorProfile.stripe_payouts_enabled) {
    return jsonResponse(
      { error: "This creator hasn't finished setting up payouts yet — please check back soon." },
      400,
    );
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    console.error("STRIPE_SECRET_KEY is not set.");
    return jsonResponse({ error: "Payments aren't configured yet. Please try again later." }, 500);
  }
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

  // Creator 10% + Stripe's card fee; paid Creator Pro 5% + Stripe's card fee;
  // founding creators (invited via /chosen) 10% + card fee even though they have
  // Pro for free (see platformFeeCents above). If the Pro lookup itself fails we
  // fall back to the standard fee, never to a discount.
  let isPro = false;
  try {
    const { data: proRow } = await supabase
      .from("creator_pro")
      .select("auth_user_id")
      .eq("auth_user_id", offering.creator_auth_id)
      .maybeSingle();
    isPro = !!proRow;
  } catch (e) {
    console.error("Pro lookup failed, using standard fee:", e);
  }
  const isFounding = await isFoundingCreator(supabase, offering.creator_auth_id);
  const applicationFeeAmount = platformFeeCents(offering.price_cents, isPro, isFounding);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: offering.title },
            unit_amount: offering.price_cents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: creatorProfile.stripe_account_id },
      },
      customer_email: userData.user.email || undefined,
      metadata: { offering_id: offering.id, buyer_auth_id: buyerAuthId },
      success_url: `${origin}/offering/${offering.id}?purchase=success`,
      cancel_url: `${origin}/offering/${offering.id}?purchase=cancelled`,
    });
    return jsonResponse({ url: session.url });
  } catch (e) {
    console.error("Checkout session creation error:", e);
    return jsonResponse({ error: "Couldn't start checkout — please try again." }, 502);
  }
});
