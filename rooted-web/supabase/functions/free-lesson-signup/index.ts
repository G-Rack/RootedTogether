import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Unlocks Lesson 1 of a course for an email address (called by the website's /api/free-lesson route).
//   1. checks the course has the free preview switched on and a ready Lesson 1 video;
//   2. saves the email in free_lesson_leads (one row per course + email), so we can see who took the
//      free lesson and, through the free_lesson_funnel view, whether they later bought the course;
//   3. saves the email on the waitlist with the devotional consent, and adds it to the "Daily devotional"
//      audience (never re-adds someone who unsubscribed);
//   4. answers with Lesson 1's video id. The video id is NOT readable any other way (get_free_preview is
//      locked to the service role).
// { returning: true } is the same device coming back: it only checks the email already unlocked this
// course and answers with the video, nothing is saved or subscribed again.
// Answer: saved = true only for an email that was new to this course.

const FN_BASE = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const tidy = (v: unknown) => String(v ?? "").replace(/[^\w .+\-]/g, "").trim().slice(0, 100) || null;

async function callFn(name: string, body: unknown) {
  const res = await fetch(`${FN_BASE}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-secret": Deno.env.get("WEBHOOK_SECRET") || "" },
    body: JSON.stringify(body),
  });
  return await res.json().catch(() => ({ ok: false }));
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);
  let p: any;
  try { p = await req.json(); } catch { return json({ ok: false, error: "Invalid request." }, 400); }

  const email = String(p?.email || "").trim().toLowerCase();
  if (email.length < 5 || email.length > 254 || !EMAIL.test(email)) {
    return json({ ok: false, error: "Please enter a valid email address." }, 400);
  }
  const offeringId = String(p?.offering_id || "");
  if (!UUID.test(offeringId)) return json({ ok: false, error: "This lesson is not available." }, 404);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: lessons } = await admin.rpc("get_free_preview", { p_offering: offeringId });
  const lesson = Array.isArray(lessons) && lessons.length > 0 ? lessons[0] : null;
  if (!lesson?.mux_playback_id) return json({ ok: false, error: "This lesson is not available." }, 404);

  const now = new Date().toISOString();

  if (p?.returning === true) {
    const { data: lead } = await admin.from("free_lesson_leads").select("id")
      .eq("offering_id", offeringId).ilike("email", email).maybeSingle();
    if (!lead) return json({ ok: false, error: "not_found" }, 404);
    await admin.from("free_lesson_leads").update({ last_viewed_at: now }).eq("id", lead.id);
    return json({ ok: true, saved: false, lesson });
  }

  const utmSource = tidy(p?.utm_source);
  const utmMedium = tidy(p?.utm_medium);
  const utmCampaign = tidy(p?.utm_campaign) || "free_lesson";
  const utmContent = tidy(p?.utm_content);

  let saved = false;
  const ins = await admin.from("free_lesson_leads").insert({
    offering_id: offeringId, email, utm_source: utmSource, utm_medium: utmMedium, utm_campaign: utmCampaign,
    utm_content: utmContent, devotional_consent: true, last_viewed_at: now,
  });
  const insErr = ins.error as { code?: string } | null;
  if (!insErr) saved = true;
  else if (insErr.code === "23505") {
    await admin.from("free_lesson_leads").update({ last_viewed_at: now })
      .eq("offering_id", offeringId).ilike("email", email);
  } else {
    console.error("free-lesson lead insert failed:", insErr);
    return json({ ok: false, error: "Something went wrong. Please try again." }, 502);
  }

  // Waitlist row with the devotional consent (an existing row keeps everything it has; a tick never removes one).
  const wl = await admin.from("waitlist_signups").insert({
    email, source: utmSource || "free_lesson", utm_source: utmSource, utm_campaign: utmCampaign,
    signup_page: "free_lesson", devotional_consent: true, devotional_consent_at: now,
  });
  const wlErr = wl.error as { code?: string } | null;
  if (wlErr?.code === "23505") {
    const { data: row } = await admin.from("waitlist_signups").select("id, devotional_consent").ilike("email", email).maybeSingle();
    if (row && !row.devotional_consent) {
      await admin.from("waitlist_signups").update({ devotional_consent: true, devotional_consent_at: now }).eq("id", row.id);
    }
  } else if (wlErr) {
    console.error("free-lesson waitlist insert failed:", wlErr);
  }

  try { await callFn("sync-email-contact", { email, devotional: true }); } catch (e) { console.error("free-lesson sync failed:", e); }

  return json({ ok: true, saved, lesson });
});
