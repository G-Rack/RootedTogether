import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// One follow-up email, two days after someone signs up for "Hearing God in the Quiet" through a link
// tagged utm_campaign=deborah_course (the free Lesson 1 form, or any email form on a deborah_course link).
// Run every hour by pg_cron (public.call_email_function), protected by WEBHOOK_SECRET like the other
// email functions. Who gets it is decided by public.course_followup_due(): sign-ups at least 2 days old
// (and no older than 14 days, and after the launch date below), who have NOT bought the course, have not
// unsubscribed, and were not already sent this email. Every send is claimed in public.email_log first,
// so nobody can receive it twice. Test mode (email_settings.test_mode) works like the other emails.

const OFFERING_ID = "1be447fd-d6aa-49bb-a6b0-ecc057bf2180";
const CAMPAIGN = "deborah_course"; // who gets the email (their sign-up was tagged with this); do not change
const LINK_CAMPAIGN = "free_lesson_followup"; // the tag on the button link in the email
const TEMPLATE = "course_followup1";
const DELAY = "48 hours";
const MAX_AGE = "14 days";
const SINCE = "2026-11-25T00:00:00Z"; // never email anyone who signed up before this
const PER_RUN = 50;

const SITE = "https://www.rootedtogether.club";
const FN_BASE = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
const REPLY_TO = "admin@rootedtogether.club";
const FROM = "Rooted Together <admin@rootedtogether.club>";
const POSTAL_PLACEHOLDER = "[postal address to be confirmed]";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function sign(email: string) {
  const secret = Deno.env.get("UNSUBSCRIBE_SIGNING_KEY") || Deno.env.get("WEBHOOK_SECRET") || "";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email.toLowerCase()));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const money = (cents: number) => (!cents ? "Free" : `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`);

async function build(email: string, title: string, priceCents: number) {
  const address = Deno.env.get("MARKETING_POSTAL_ADDRESS") || POSTAL_PLACEHOLDER;
  const unsub = `${FN_BASE}/email-unsubscribe?e=${encodeURIComponent(email)}&t=${await sign(email)}`;
  const link = `${SITE}/offering/${OFFERING_ID}?utm_source=email&utm_medium=automated&utm_campaign=${LINK_CAMPAIGN}&utm_content=${OFFERING_ID}`;
  const cta = `Get the full course – ${money(priceCents)}`;
  const paras = [
    "Hi there,",
    `Thank you for stopping by ${title}, our seven-part course on prayer and stillness for women who feel too busy to pray.`,
    "If you have watched Lesson 1, the rest of the course carries you further: making space, quieting the noise inside, listening with Scripture, recognizing his voice, what to do when God feels silent, and living from the quiet. Every lesson ends with one simple practice to take into your day.",
    `You can unlock the full course for ${money(priceCents)}, and it stays in your account to come back to any time.`,
  ];
  const quote = "\"Be still, and know that I am God.\" Psalm 46:10";
  const closing = "With you,\nRooted Together";
  const subject = `Ready for the rest of ${title}?`;
  const footerHtml = `You're receiving this because you signed up for ${esc(title)} at rootedtogether.club. <a href="${esc(unsub)}" style="color:#6B4226;">Unsubscribe</a>. Rooted Together, Inc., ${esc(address)}.`;
  const footerText = `You're receiving this because you signed up for ${title} at rootedtogether.club. Unsubscribe: ${unsub}\nRooted Together, Inc., ${address}.`;
  const p = (t: string) => `<p style="margin:0 0 16px;">${esc(t).replace(/\n/g, "<br>")}</p>`;
  const html = `<!doctype html><html><body style="margin:0;background:#FBF6EF;font-family:Georgia,'Times New Roman',serif;color:#2E1B10;">
<span style="display:none;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">Lessons 2 to 7 are waiting for you.</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="font-size:20px;font-weight:700;color:#6B4226;padding:0 4px 16px;">Rooted Together</td></tr>
<tr><td style="background:#ffffff;border:1px solid #EADBC8;border-radius:14px;padding:28px;font-size:16px;line-height:1.65;">${paras.map(p).join("")}<p style="margin:8px 0 22px;"><a href="${esc(link)}" style="display:inline-block;background:#6B4226;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-family:Arial,sans-serif;font-weight:600;font-size:15px;">${esc(cta)}</a></p><p style="margin:0 0 16px;font-size:14px;color:#6F5846;">If the button doesn't work, copy this link into your browser:<br>${esc(link)}</p><p style="margin:0 0 16px;font-style:italic;color:#6B4226;">${esc(quote)}</p>${p(closing)}</td></tr>
<tr><td style="padding:16px 6px;font-size:12px;line-height:1.6;color:#6F5846;font-family:Arial,sans-serif;">${footerHtml}</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${paras.join("\n\n")}\n\n${cta}: ${link}\n\n${quote}\n\n${closing}\n\n--\n${footerText}`;
  return {
    subject, html, text,
    headers: { "List-Unsubscribe": `<${unsub}>, <mailto:${REPLY_TO}?subject=unsubscribe>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const expected = Deno.env.get("WEBHOOK_SECRET");
  if (!expected || req.headers.get("x-webhook-secret") !== expected) return json({ error: "Unauthorized." }, 401);

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return json({ ok: true, skipped: "resend-not-configured" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: settings } = await admin.from("email_settings").select("test_mode, test_recipient").eq("id", 1).maybeSingle();
  const testMode = settings ? settings.test_mode !== false : true; // default to the safe side
  const testTo = settings?.test_recipient || REPLY_TO;
  const address = Deno.env.get("MARKETING_POSTAL_ADDRESS") || POSTAL_PLACEHOLDER;
  if (!testMode && address === POSTAL_PLACEHOLDER) return json({ ok: true, skipped: "no-postal-address" });

  const { data: off } = await admin.from("offerings").select("title, price_cents, status").eq("id", OFFERING_ID).maybeSingle();
  if (!off || off.status !== "published") return json({ ok: true, skipped: "course-not-published" });

  const { data: due, error: dueErr } = await admin.rpc("course_followup_due", {
    p_offering: OFFERING_ID, p_campaign: CAMPAIGN, p_template: TEMPLATE,
    p_delay: DELAY, p_max_age: MAX_AGE, p_since: SINCE, p_limit: PER_RUN,
  });
  if (dueErr) { console.error("course_followup_due failed:", dueErr); return json({ ok: false, error: "query-failed" }); }

  let sent = 0, failed = 0, skipped = 0;
  for (const row of (due as { email: string }[]) || []) {
    const to = String(row.email || "").trim().toLowerCase();
    if (!to) continue;

    const { data: claim, error: claimErr } = await admin
      .from("email_log")
      .insert({ recipient: to, template: TEMPLATE, related_id: OFFERING_ID, test_mode: testMode, status: "pending" })
      .select("id").maybeSingle();
    if (claimErr) {
      if ((claimErr as { code?: string }).code === "23505") { skipped++; continue; }
      console.error("email_log insert failed:", claimErr); failed++; continue;
    }

    const m = await build(to, off.title, off.price_cents || 0);
    const actualTo = testMode ? testTo : to;
    const subject = testMode ? `[TEST for ${to}] ${m.subject}` : m.subject;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": String(claim!.id) },
        body: JSON.stringify({ from: FROM, to: [actualTo], reply_to: REPLY_TO, subject, html: m.html, text: m.text, headers: m.headers }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Resend send failed:", res.status, JSON.stringify(body));
        await admin.from("email_log").update({ status: "failed", error: `${res.status} ${JSON.stringify(body)}`.slice(0, 500) }).eq("id", claim!.id);
        failed++; continue;
      }
      await admin.from("email_log").update({ status: "sent", resend_message_id: body?.id ?? null }).eq("id", claim!.id);
      sent++;
    } catch (e) {
      console.error("Resend request error:", e);
      await admin.from("email_log").update({ status: "failed", error: String(e).slice(0, 500) }).eq("id", claim!.id);
      failed++;
    }
  }
  return json({ ok: true, sent, failed, skipped, testMode });
});
