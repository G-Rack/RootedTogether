import { NextResponse } from 'next/server';
import { FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/lib/config';
import { sendLeadToMeta } from '@/lib/metaServer';
import { FUNNELS } from '@/lib/funnels';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tidy = (v) => String(v || '').replace(/[^\w .+\-]/g, '').trim().slice(0, 100) || null;

// The email box on /lesson-1 and /night-1. The funnel-signup function saves the email (with the ad tags),
// starts the email series, sends the first email and, for Lesson 1, hands back the video. A brand-new email
// is a Lead: Meta gets its server copy here, with the same event_id the browser used, so it is counted once.
// { returning: true, key } is the same person coming back (from the email link or the same device): it only
// checks the key we gave them and answers with the sample again, nothing is saved or sent.
export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { /* handled below */ }
  const cfg = FUNNELS[String(body?.funnel || '')];
  if (!cfg) return NextResponse.json({ ok: false, error: 'This page is not available.' }, { status: 404 });

  const returning = body?.returning === true;
  const key = String(body?.key || '');
  let email = '';
  if (returning) {
    if (!UUID.test(key)) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  } else {
    if (body?.website) return NextResponse.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 400 }); // hidden field: bots only
    email = String(body?.email || '').trim().toLowerCase();
    if (email.length < 5 || email.length > 254 || !EMAIL.test(email)) {
      return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
    }
  }
  try {
    const res = await fetch(`${FUNCTIONS_URL}/funnel-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({
        funnel: cfg.slug, email, returning, key,
        utm_source: tidy(body?.utm_source), utm_medium: tidy(body?.utm_medium),
        utm_campaign: tidy(body?.utm_campaign), utm_content: tidy(body?.utm_content),
      }),
      cache: 'no-store',
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.ok) {
      if (j.saved === true) sendLeadToMeta(request, body, { source: cfg.leadSource, contentName: tidy(body?.content_name) || cfg.slug });
      return NextResponse.json({ ok: true, saved: j.saved === true, key: j.key || null, lesson: j.lesson || null });
    }
    return NextResponse.json({ ok: false, error: j.error || 'Something went wrong. Please try again.' }, { status: res.status === 404 ? 404 : 502 });
  } catch { /* fall through */ }
  return NextResponse.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 502 });
}
