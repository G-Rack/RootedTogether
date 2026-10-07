import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Creates (if needed) a Stripe connected account for the signed-in creator
// and returns a one-time onboarding link, OR (action: "status") re-checks
// whether that creator has actually finished onboarding, OR (action:
// "dashboard") returns a one-time login link into the creator's Stripe
// Express Dashboard, OR (action: "balance") returns the creator's available /
// pending Stripe balance, OR (action: "payout") pays the creator's available
// balance out to their bank. Called from the dashboard's Payouts page.
//
// Payouts are MANUAL: each connected account's payout schedule is set to
// "manual" (Balance Settings API), so earnings sit in the creator's Stripe
// balance until they press "Request payout" on the Payouts page. Stripe
// requires manual-payout funds to be paid out within 2 years (US).
//
// Uses Stripe's Accounts v2 API (POST /v2/core/accounts) — Stripe no longer
// allows creating new Accounts v1 connected accounts for new Connect
// integrations. The account is an Express-dashboard "recipient" account
// that can receive transfers from the platform (what destination charges in
// create-checkout-session need). The creator does everything else —
// identity, bank details — on Stripe's own hosted page; this function never
// sees or stores any of that, only the resulting account id.
//
// v2 API calls go out as plain fetch() requests rather than through the
// Stripe SDK, so this function doesn't depend on an SDK version that
// supports the v2 preview API.
//
// The account id + whether payouts are actually enabled live on `profiles`
// (stripe_account_id / stripe_payouts_enabled) rather than
// creator_storefronts, because every signed-up user already has exactly
// one profiles row — creator_storefronts only gets created once a creator
// picks a public handle, and `handle` is NOT NULL there.
//
// stripe_payouts_enabled is refreshed by the "status" action (the Payouts
// page calls it when the creator returns from Stripe) rather than only by
// webhook, since v2 accounts don't send the v1 account.updated event.

const STRIPE_API = "https://api.stripe.com";
const STRIPE_V2_VERSION = "2026-09-30.preview";

// Smallest balance a creator can pay out. Payouts cost the platform a fee
// (we're the fees_collector), so tiny ones aren't worth it. Change freely.
const MIN_PAYOUT_CENTS = 1000;

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

async function stripeV2(stripeKey: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Stripe-Version": STRIPE_V2_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    // fall through — handled below via res.ok
  }
  if (!res.ok) {
    const message = data?.error?.message || `Stripe returned ${res.status}`;
    throw new Error(message);
  }
  return data;
}

// Plain v1 REST call (form-encoded), optionally on behalf of a connected account.
async function stripeV1(
  stripeKey: string,
  method: string,
  path: string,
  opts: { account?: string; form?: Record<string, string>; idempotencyKey?: string } = {},
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${stripeKey}`,
    "Stripe-Version": STRIPE_V2_VERSION,
  };
  if (opts.account) headers["Stripe-Account"] = opts.account;
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  if (opts.form) headers["Content-Type"] = "application/x-www-form-urlencoded";
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers,
    body: opts.form ? new URLSearchParams(opts.form).toString() : undefined,
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Stripe returned ${res.status}`);
  return data;
}

// Idempotent: makes sure this connected account's payouts are manual.
async function ensureManualPayouts(stripeKey: string, accountId: string) {
  try {
    await stripeV1(stripeKey, "POST", "/v1/balance_settings", {
      account: accountId,
      form: { "payments[payouts][schedule][interval]": "manual" },
    });
  } catch (e) {
    console.error("Setting manual payout schedule failed:", e);
  }
}

// USD available + pending amounts (in cents) on the connected account.
async function usdBalance(stripeKey: string, accountId: string) {
  const bal = await stripeV1(stripeKey, "GET", "/v1/balance", { account: accountId });
  const pick = (list: any[]) => (list || []).find((b: any) => b.currency === "usd")?.amount ?? 0;
  return { availableCents: pick(bal.available), pendingCents: pick(bal.pending) };
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
  const action = ["status", "dashboard", "balance", "payout"].includes(payload?.action)
    ? payload.action as "status" | "dashboard" | "balance" | "payout"
    : "onboard";
  const origin = typeof payload?.origin === "string" && payload.origin.startsWith("https://")
    ? payload.origin
    : "https://rootedtogether.club";

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    console.error("STRIPE_SECRET_KEY is not set.");
    return jsonResponse({ error: "Payments aren't configured yet. Please try again later." }, 500);
  }
  // Diagnostic: the first 25 characters of a Stripe secret key are only the
  // key type + the owning account's id (not secret) — logged so we can tell
  // which Stripe account / sandbox this key belongs to.
  console.log("Stripe key in use belongs to:", stripeKey.slice(0, 25));

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("stripe_account_id, full_name, stripe_payouts_enabled")
    .eq("id", userId)
    .maybeSingle();

  let accountId = profileRow?.stripe_account_id || null;

  // --- Status check: has this creator finished Stripe's onboarding? -------
  if (action === "status") {
    if (!accountId) return jsonResponse({ payoutsEnabled: false, hasAccount: false });
    try {
      const account = await stripeV2(
        stripeKey,
        "GET",
        `/v2/core/accounts/${accountId}?include=configuration.recipient`,
      );
      const transfersStatus =
        account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
      const payoutsEnabled = transfersStatus === "active";
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ stripe_payouts_enabled: payoutsEnabled })
        .eq("id", userId);
      if (updateError) console.error("Updating stripe_payouts_enabled failed:", updateError);
      if (payoutsEnabled) await ensureManualPayouts(stripeKey, accountId);
      return jsonResponse({ payoutsEnabled, hasAccount: true, transfersStatus: transfersStatus || null });
    } catch (e) {
      console.error("Stripe account status error:", e);
      return jsonResponse({ error: "Couldn't check your Stripe status — please try again." }, 502);
    }
  }

  // --- Balance: what the creator could pay out right now ------------------
  if (action === "balance") {
    if (!accountId || !profileRow?.stripe_payouts_enabled) {
      return jsonResponse({ error: "Connect your Stripe account first." }, 400);
    }
    try {
      await ensureManualPayouts(stripeKey, accountId);
      const { availableCents, pendingCents } = await usdBalance(stripeKey, accountId);
      return jsonResponse({ availableCents, pendingCents, minPayoutCents: MIN_PAYOUT_CENTS, currency: "usd" });
    } catch (e) {
      console.error("Balance lookup error:", e);
      return jsonResponse({ error: "Couldn't load your balance — please try again." }, 502);
    }
  }

  // --- Payout: pay the creator's whole available balance to their bank ----
  if (action === "payout") {
    if (!accountId || !profileRow?.stripe_payouts_enabled) {
      return jsonResponse({ error: "Connect your Stripe account first." }, 400);
    }
    try {
      await ensureManualPayouts(stripeKey, accountId);
      const { availableCents } = await usdBalance(stripeKey, accountId);
      if (availableCents < MIN_PAYOUT_CENTS) {
        return jsonResponse({
          error: `You need at least $${(MIN_PAYOUT_CENTS / 100).toFixed(2)} available to request a payout.`,
          availableCents,
          minPayoutCents: MIN_PAYOUT_CENTS,
        }, 400);
      }
      // Idempotency key: a double-click within the same minute for the same
      // balance returns the first payout instead of creating a second one.
      const payout = await stripeV1(stripeKey, "POST", "/v1/payouts", {
        account: accountId,
        form: {
          amount: String(availableCents),
          currency: "usd",
          "metadata[rooted_together_auth_user_id]": userId,
        },
        idempotencyKey: `rt-payout-${accountId}-${availableCents}-${Math.floor(Date.now() / 60000)}`,
      });
      console.log("Payout created:", payout.id, availableCents);
      return jsonResponse({
        payoutId: payout.id,
        amountCents: payout.amount,
        status: payout.status,
        arrivalDate: payout.arrival_date || null,
      });
    } catch (e) {
      console.error("Payout error:", e);
      return jsonResponse({ error: "Couldn't create your payout — please try again." }, 502);
    }
  }

  // --- Dashboard: one-time login link into the creator's Express Dashboard
  // (balance, upcoming payouts, bank details). The link is single-use and
  // only ever returned to the signed-in creator who owns this account.
  if (action === "dashboard") {
    if (!accountId) {
      return jsonResponse({ error: "Connect your Stripe account first." }, 400);
    }
    try {
      const res = await fetch(`${STRIPE_API}/v1/accounts/${accountId}/login_links`, {
        method: "POST",
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error?.message || `Stripe returned ${res.status}`);
      }
      return jsonResponse({ url: data.url });
    } catch (e) {
      console.error("Login link creation error:", e);
      return jsonResponse({ error: "Couldn't open your Stripe dashboard — please try again." }, 502);
    }
  }

  // --- Onboard: create the account if needed, then a hosted onboarding link
  if (!accountId) {
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    try {
      const account = await stripeV2(stripeKey, "POST", "/v2/core/accounts", {
        contact_email: authUser?.user?.email || undefined,
        display_name: profileRow?.full_name || authUser?.user?.email || "Rooted Together creator",
        dashboard: "express",
        defaults: {
          responsibilities: {
            fees_collector: "application",
            losses_collector: "application",
          },
        },
        identity: { country: "us" },
        configuration: {
          recipient: {
            capabilities: { stripe_balance: { stripe_transfers: { requested: true } } },
          },
        },
        metadata: { rooted_together_auth_user_id: userId },
        include: ["configuration.recipient", "identity", "requirements"],
      });
      accountId = account.id;
      console.log("Created connected account:", accountId, JSON.stringify(account?.configuration?.recipient?.capabilities || {}));
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
    const accountLink = await stripeV2(stripeKey, "POST", "/v2/core/account_links", {
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          refresh_url: `${origin}/dashboard/payouts?stripe=refresh`,
          return_url: `${origin}/dashboard/payouts?stripe=complete`,
        },
      },
    });
    return jsonResponse({ url: accountLink.url });
  } catch (e) {
    console.error("Account link creation error:", e);
    return jsonResponse({ error: "Couldn't start Stripe onboarding — please try again." }, 502);
  }
});
