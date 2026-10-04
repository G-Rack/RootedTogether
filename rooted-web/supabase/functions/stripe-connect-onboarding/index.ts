import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

// Creates (if needed) a Stripe Express connected account for the signed-in
// creator and returns a one-time onboarding link. Called from the
// dashboard's Payouts page "Connect with Stripe" button. The creator does
// everything else — identity, bank details — on Stripe's own hosted page;
// this function never sees or stores any of that, only the resulting
// account id.
//
// The account id + whether payouts are actually enabled live on `profiles`
// (stripe_account_id / stripe_payouts_enabled) rather than
// creator_storefronts, because every signed-up user already has exactly
// one profiles row — creator_storefronts only gets created once a creator
// picks a public handle, and `handle` is NOT NULL there, so it can't be
// used as a landing spot for Stripe state that should exist independent of
// whether branding has been set up yet.

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

  // verify_jwt is on for this function, so Supabase has already checked the
  // token is valid before we get here — this just resolves WHICH user it
  // belongs to.
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return jsonResponse({ error: "Not signed in." }, 401);
  }
  const userId = userData.user.id;

  const { data: isCreator } = await supabase.rpc("is_valid_creator", { check_auth_id: userId });
  if (!isCreator) {
    return jsonResponse({ error: "Only approved creators can set up payouts." }, 403);
  }

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    // no body is fine — origin is optional, falls back below
  }
  const origin = typeof payload?.origin === "string" && payload.origin.startsWith("https://")
    ? payload.origin
    : "https://rootedtogether.club";

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    console.error("STRIPE_SECRET_KEY is not set.");
    return jsonResponse({ error: "Payments aren't configured yet. Please try again later." }, 500);
  }
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("stripe_account_id, full_name")
    .eq("id", userId)
    .maybeSingle();

  let accountId = profileRow?.stripe_account_id || null;

  if (!accountId) {
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    try {
      const account = await stripe.accounts.create({
        type: "express",
        email: authUser?.user?.email || undefined,
        business_type: "individual",
        capabilities: { transfers: { requested: true } },
        metadata: { rooted_together_auth_user_id: userId, full_name: profileRow?.full_name || "" },
      });
      accountId = account.id;
    } catch (e) {
      console.error("Stripe account creation error:", e);
      return jsonResponse({ error: "Couldn't start Stripe onboarding — please try again." }, 502);
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ stripe_account_id: accountId })
      .eq("id", userId);
    if (updateError) console.error("Storing stripe_account_id failed:", updateError);
  }

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/payouts?stripe=refresh`,
      return_url: `${origin}/dashboard/payouts?stripe=complete`,
      type: "account_onboarding",
    });
    return jsonResponse({ url: accountLink.url });
  } catch (e) {
    console.error("Account link creation error:", e);
    return jsonResponse({ error: "Couldn't start Stripe onboarding — please try again." }, 502);
  }
});
