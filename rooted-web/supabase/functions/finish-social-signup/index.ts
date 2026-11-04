import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Finishes a free buyer account for someone who signed in with Google or Apple.
// Those logins create the Supabase Auth user on their own, but nothing else: no
// profiles row and no seekers row. This function adds both, for the person whose
// token is on the request, and only ever as a free "seeker". It cannot create a
// creator account: creators still go through submit-signup and its membership gate.
//
// Safe to call twice: if the person already has a profile it changes nothing.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

const REFERRAL_LOOKUP_TABLES = ["seekers", "assistants", "mothers", "pastors", "influencers", "churches"];

async function resolveReferralCode(supabase: ReturnType<typeof createClient>, code: unknown): Promise<string | null> {
  if (typeof code !== "string") return null;
  const match = code.trim().match(/^RT-?(\d+)$/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  if (!Number.isFinite(n)) return null;
  for (const table of REFERRAL_LOOKUP_TABLES) {
    const { data, error } = await supabase.from(table).select("auth_user_id").eq("referral_number", n).maybeSingle();
    if (!error && data?.auth_user_id) return data.auth_user_id as string;
  }
  return null;
}

function validDob(raw: unknown): string | null {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  if (age < 13 || age > 120) return null;
  return raw;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Please sign in first." }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json({ error: "Please sign in again." }, 401);

  // Already finished (or an existing app / creator account): nothing to do.
  const { data: existing } = await supabase.from("profiles").select("id, role").eq("id", user.id).maybeSingle();
  if (existing) return json({ ok: true, existing: true, role: existing.role });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const email = (user.email || "").trim();
  if (!email) {
    return json({ error: "Your sign-in didn't share an email address. Please create an account with email instead." }, 400);
  }

  const dob = validDob(payload?.dob);
  if (!dob) return json({ error: "Please enter your full date of birth. You need to be at least 13." }, 400);

  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const metaName = [meta.full_name, meta.name].find((v) => typeof v === "string" && v.trim()) as string | undefined;
  const name = String(payload?.name || metaName || email.split("@")[0]).trim().slice(0, 120);
  if (!name) return json({ error: "Please tell us your name." }, 400);

  const referrerAuthId = await resolveReferralCode(supabase, payload?.referralCode);

  const { data: inserted, error: seekerError } = await supabase
    .from("seekers")
    .insert({ name, email, date_of_birth: dob, auth_user_id: user.id })
    .select("id, referral_number")
    .single();
  if (seekerError) {
    console.error("Seeker insert error:", seekerError);
    return json({ error: "Couldn't finish your account right now. Please try again in a moment." }, 502);
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    role: "seeker",
    full_name: name,
    referred_by: referrerAuthId,
  });
  if (profileError) {
    console.error("Profile insert error:", profileError);
    await supabase.from("seekers").delete().eq("id", inserted.id);
    return json({ error: "Couldn't finish your account right now. Please try again in a moment." }, 502);
  }

  return json({ ok: true, role: "seeker" });
});
