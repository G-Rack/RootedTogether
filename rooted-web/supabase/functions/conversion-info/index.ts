import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Tells the website how much a finished Stripe Payment Link purchase was worth, so the Google Ads
// "purchase" conversion can be sent with the right value. It returns only the amount and currency,
// and only for a completed, paid Payment Link checkout. Nothing about the buyer is returned.
//
//   { sessionId }  ->  { ok: true, value: 49, currency: "USD" }   or   { ok: false }

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SESSION_ID_RE = /^cs_(test|live)_[A-Za-z0-9]+$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false }, 400);
  }

  const sessionId = String(payload?.sessionId ?? "").trim();
  if (!SESSION_ID_RE.test(sessionId)) return json({ ok: false });

  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return json({ ok: false });

  try {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return json({ ok: false });
    const s = await res.json();
    if (s.status !== "complete" || s.payment_status !== "paid" || !s.payment_link) return json({ ok: false });
    const cents = Number(s.amount_total ?? 0);
    if (!Number.isFinite(cents) || cents <= 0) return json({ ok: false });
    return json({ ok: true, value: cents / 100, currency: String(s.currency || "usd").toUpperCase() });
  } catch {
    return json({ ok: false });
  }
});
