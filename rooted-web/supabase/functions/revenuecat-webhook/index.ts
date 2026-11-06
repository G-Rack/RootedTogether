// revenuecat-webhook: the ONLY thing that sets profiles.is_premium.
//
// RevenueCat calls this whenever someone buys, renews, cancels, gets
// refunded or lets their Premium subscription lapse. The person's Supabase
// auth id is the RevenueCat app user id (see src/billing.js in the app), so
// the event maps straight onto their profiles row.
//
// Security: verify_jwt is OFF (RevenueCat has no Supabase JWT). Instead the
// request must carry the shared secret in the Authorization header, set as
// the RC_WEBHOOK_SECRET secret here and as "Authorization header value" in
// RevenueCat -> Integrations -> Webhooks. A database trigger on profiles
// stops anyone else (any signed-in user) from changing is_premium.
//
// Rule: for any event about the `premium` entitlement, the person is Premium
// if the event's expiration time is in the future (or has none), else not.
// That covers purchase, renewal, cancel-with-time-left (still Premium until
// the paid period ends), refund (expiry in the past) and expiration.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENTITLEMENT = "premium";

function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function setPremium(authId: string, value: boolean): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/rest/v1/profiles?id=eq.${authId}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ is_premium: value }),
  });
  if (!res.ok) console.error("revenuecat-webhook: update failed", res.status, await res.text());
  return res.ok;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const secret = Deno.env.get("RC_WEBHOOK_SECRET") ?? "";
  const given = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !safeEqual(given, secret.replace(/^Bearer\s+/i, ""))) {
    return json({ error: "unauthorized" }, 401);
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const ev = payload?.event;
  if (!ev || typeof ev !== "object") return json({ error: "no event" }, 400);

  const type = String(ev.type ?? "");
  if (type === "TEST") return json({ ok: true, test: true });

  // Only the premium entitlement matters. If the event lists entitlements and
  // premium isn't one of them, ignore it.
  const ents: string[] | null = Array.isArray(ev.entitlement_ids)
    ? ev.entitlement_ids
    : ev.entitlement_id
    ? [ev.entitlement_id]
    : null;
  if (ents && !ents.includes(ENTITLEMENT)) return json({ ok: true, ignored: "other entitlement" });

  const now = Date.now();
  const expMs = typeof ev.expiration_at_ms === "number" ? ev.expiration_at_ms : null;
  const active = type === "EXPIRATION" ? false : expMs === null ? true : expMs > now;

  // A TRANSFER moves the subscription from some ids to others.
  if (type === "TRANSFER") {
    const from: string[] = Array.isArray(ev.transferred_from) ? ev.transferred_from : [];
    const to: string[] = Array.isArray(ev.transferred_to) ? ev.transferred_to : [];
    let ok = true;
    for (const id of from) if (UUID.test(id)) ok = (await setPremium(id, false)) && ok;
    for (const id of to) if (UUID.test(id)) ok = (await setPremium(id, true)) && ok;
    return ok ? json({ ok: true }) : json({ error: "update failed" }, 500);
  }

  const id = [ev.app_user_id, ev.original_app_user_id].find((v) => typeof v === "string" && UUID.test(v));
  if (!id) return json({ ok: true, ignored: "no account id" });

  const ok = await setPremium(id, active);
  return ok ? json({ ok: true }) : json({ error: "update failed" }, 500);
});
