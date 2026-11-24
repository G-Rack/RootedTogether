// Guest checkout: buying without signing in first.
//
// create-checkout-session starts a Stripe Checkout with metadata guest = "1" and no buyer. Stripe
// asks for the buyer's email. After payment, whichever runs first (stripe-webhook, or the page the
// buyer returns to calling guest-checkout-claim) calls ensureGuestBuyer(), which:
//   - uses the account that already has that email, if there is one (created_new = false), or
//   - creates a new login for that email with no password (created_new = true).
// public.guest_checkouts keeps one row per Stripe session, so both callers always agree on the
// account. Only a brand-new account is ever signed in automatically (see guest-checkout-claim):
// an email that already had an account must log in as usual, so nobody can pay with someone
// else's email and be signed in as them.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Admin = ReturnType<typeof createClient>;
export type GuestBuyer = { userId: string; createdNew: boolean };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function rowFor(admin: Admin, sessionId: string) {
  const { data } = await admin
    .from("guest_checkouts")
    .select("auth_user_id, created_new")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  return data?.auth_user_id ? { userId: data.auth_user_id as string, createdNew: data.created_new === true } : null;
}

async function userIdByEmail(admin: Admin, email: string): Promise<string | null> {
  const { data, error } = await admin.rpc("auth_user_id_by_email", { p_email: email });
  if (error) {
    console.error("auth_user_id_by_email failed:", error);
    throw new Error("lookup-failed");
  }
  return (data as string | null) || null;
}

export async function ensureGuestBuyer(
  admin: Admin,
  sessionId: string,
  rawEmail: string,
  name: string | null,
): Promise<GuestBuyer> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) throw new Error("no-email");

  const known = await rowFor(admin, sessionId);
  if (known) return known;

  let userId = await userIdByEmail(admin, email);
  let createdNew = false;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { ...(name ? { full_name: name } : {}), source: "guest_checkout" },
    });
    if (data?.user) {
      userId = data.user.id;
      createdNew = true;
    } else {
      // Most likely the other caller created it a moment ago for this same payment.
      console.log("Guest createUser did not create (probably a race):", error?.message);
      await sleep(700);
      const again = await rowFor(admin, sessionId);
      if (again) return again;
      userId = await userIdByEmail(admin, email);
    }
  }
  if (!userId) throw new Error("no-account");

  const { error: insErr } = await admin.from("guest_checkouts").insert({
    stripe_session_id: sessionId,
    email,
    auth_user_id: userId,
    created_new: createdNew,
  });
  if (insErr) {
    if ((insErr as { code?: string }).code === "23505") {
      const canonical = await rowFor(admin, sessionId);
      if (canonical) return canonical;
    }
    console.error("guest_checkouts insert failed:", insErr);
    throw new Error("record-failed");
  }
  return { userId, createdNew };
}

// For a brand-new guest account: one email with a link back to what they bought. The link opens
// the offering page with ?access=1, where they can get a sign-in link by email. No sign-in token
// is put in this email. Sent at most once per payment. Follows email_settings.test_mode.
export async function sendGuestAccessEmail(admin: Admin, sessionId: string, email: string, offeringId: string, title: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return;
  const { data: claimed } = await admin
    .from("guest_checkouts")
    .update({ access_emailed_at: new Date().toISOString() })
    .eq("stripe_session_id", sessionId)
    .eq("created_new", true)
    .is("access_emailed_at", null)
    .select("stripe_session_id")
    .maybeSingle();
  if (!claimed) return;

  const { data: settings } = await admin.from("email_settings").select("test_mode, test_recipient").eq("id", 1).maybeSingle();
  const testMode = settings ? settings.test_mode !== false : true;
  const to = testMode ? (settings?.test_recipient || "admin@rootedtogether.club") : email;
  const link = `https://rootedtogether.club/offering/${offeringId}?access=1`;
  const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  const subject = `${testMode ? `[TEST for ${email}] ` : ""}How to open ${title}`;
  const text = [
    "Hi there,",
    "",
    `Thank you for buying ${title}. We made a free Rooted Together account for you with this email, so you can open it any time.`,
    "",
    `Open it here: ${link}`,
    "",
    "On that page, tap \"Email me a sign-in link\". You can also set a password later from the log-in page with \"Forgot password\".",
    "",
    "With you,",
    "Rooted Together",
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#FBF6EF;font-family:Georgia,'Times New Roman',serif;color:#2E1B10;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="font-size:20px;font-weight:700;color:#6B4226;padding:0 4px 16px;">Rooted Together</td></tr>
<tr><td style="background:#ffffff;border:1px solid #EADBC8;border-radius:14px;padding:28px;font-size:16px;line-height:1.65;">
<p style="margin:0 0 16px;">Hi there,</p>
<p style="margin:0 0 16px;">Thank you for buying <b>${esc(title)}</b>. We made a free Rooted Together account for you with this email, so you can open it any time.</p>
<p style="margin:8px 0 22px;"><a href="${link}" style="display:inline-block;background:#6B4226;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-family:Arial,sans-serif;font-weight:600;font-size:15px;">Open your purchase</a></p>
<p style="margin:0 0 16px;">On that page, tap &ldquo;Email me a sign-in link&rdquo;. You can also set a password later from the log-in page with &ldquo;Forgot password&rdquo;.</p>
<p style="margin:0;">With you,<br>Rooted Together</p>
</td></tr>
<tr><td style="padding:16px 6px;font-size:12px;line-height:1.6;color:#6F5846;font-family:Arial,sans-serif;">Rooted Together, Inc.</td></tr>
</table></td></tr></table></body></html>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": `guest-access-${sessionId}` },
      body: JSON.stringify({ from: "Rooted Together <admin@rootedtogether.club>", to: [to], reply_to: "admin@rootedtogether.club", subject, text, html }),
    });
    if (!res.ok) console.error("Guest access email failed:", res.status, await res.text());
  } catch (e) {
    console.error("Guest access email error:", e);
  }
}
