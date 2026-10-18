import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

// Pay-first checkout for paid service requests (daily prayer, guided
// meditation). The website form calls this; it saves the request as
// 'pending_payment' (invisible to the creator), then returns a Stripe
// Checkout URL. The stripe-webhook flips the request to 'new' once the
// payment really succeeds, which is the moment it reaches the creator.
//
// Prices live HERE, never in the browser, so a buyer can't change them.
// Keep them in step with the package cards in components/ServiceRequestForm.js.
const PACKAGES: Record<string, Record<string, { name: string; cents: number }>> = {
  prayer: {
    single: { name: "Single Prayer", cents: 500 },
    week: { name: "7 Days of Prayer", cents: 2500 },
    month: { name: "30 Days of Prayer", cents: 7500 },
  },
  meditation: {
    single: { name: "Single Guided Meditation", cents: 800 },
    week: { name: "7-Day Meditation Series", cents: 3000 },
    month: { name: "30-Day Meditation Journey", cents: 9000 },
  },
};

// Same platform cut as offerings (create-checkout-session).
const TAKE_RATE = 0.10;

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

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let p: any;
  try {
    p = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid request." }, 400);
  }

  const serviceType = clip(p?.serviceType, 20);
  const packageId = clip(p?.packageId, 20);
  const pkg = PACKAGES[serviceType]?.[packageId];
  if (!pkg) return jsonResponse({ error: "Please choose a package." }, 400);

  const creatorAuthId = clip(p?.creatorAuthId, 64);
  const requesterName = clip(p?.requesterName, 120);
  const requesterEmail = clip(p?.requesterEmail, 200);
  if (!creatorAuthId) return jsonResponse({ error: "Missing creator." }, 400);
  if (!requesterName || !requesterEmail || !requesterEmail.includes("@")) {
    return jsonResponse({ error: "Please fill in your name and email." }, 400);
  }

  const rawOrigin = typeof p?.origin === "string" ? p.origin : "";
  const origin = rawOrigin.startsWith("https://") ? rawOrigin.replace(/\/+$/, "") : "https://rootedtogether.club";

  // Optional sign-in: anonymous visitors can request too, so a missing or
  // anon-key token is simply treated as "not signed in".
  let requesterAuthId: string | null = null;
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    requesterAuthId = userData?.user?.id ?? null;
  }

  const { data: storefront } = await supabase
    .from("creator_storefronts")
    .select("handle")
    .eq("auth_user_id", creatorAuthId)
    .maybeSingle();
  if (!storefront?.handle) return jsonResponse({ error: "We couldn't find that creator." }, 404);

  const { data: creatorProfile } = await supabase
    .from("profiles")
    .select("stripe_account_id, stripe_payouts_enabled")
    .eq("id", creatorAuthId)
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

  const forWhom = p?.forWhom === "someone-else" ? "someone-else" : serviceType === "prayer" ? "myself" : null;
  const focusAreas = Array.isArray(p?.focusAreas)
    ? p.focusAreas.filter((x: unknown) => typeof x === "string").slice(0, 12).map((x: string) => x.slice(0, 60))
    : [];
  const amountCents = pkg.cents;
  const feeCents = Math.round(amountCents * TAKE_RATE);

  const { data: row, error: insertError } = await supabase
    .from("service_requests")
    .insert({
      creator_auth_id: creatorAuthId,
      requester_auth_id: requesterAuthId,
      requester_name: requesterName,
      requester_email: requesterEmail,
      service_type: serviceType,
      for_whom: forWhom,
      for_whom_name: forWhom === "someone-else" ? clip(p?.forWhomName, 120) || null : null,
      focus_areas: focusAreas.length > 0 ? focusAreas : null,
      package_id: packageId,
      message: clip(p?.message, 5000) || null,
      status: "pending_payment",
      amount_cents: amountCents,
      platform_fee_cents: feeCents,
    })
    .select("id")
    .single();
  if (insertError || !row) {
    console.error("Couldn't save service request:", insertError);
    return jsonResponse({ error: "Something went wrong — please try again." }, 500);
  }

  const returnBase = `${origin}/creator/${storefront.handle}/${serviceType}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: pkg.name },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: feeCents,
        transfer_data: { destination: creatorProfile.stripe_account_id },
      },
      customer_email: requesterEmail,
      metadata: { service_request_id: row.id },
      success_url: `${returnBase}?payment=success`,
      cancel_url: `${returnBase}?payment=cancelled`,
    });

    await supabase
      .from("service_requests")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", row.id);

    return jsonResponse({ url: session.url });
  } catch (e) {
    console.error("Service checkout session error:", e);
    await supabase.from("service_requests").delete().eq("id", row.id).eq("status", "pending_payment");
    return jsonResponse({ error: "Couldn't start checkout — please try again." }, 502);
  }
});
