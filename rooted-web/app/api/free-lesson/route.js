import { NextResponse } from 'next/server';
import { FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/lib/config';
import { sendLeadToMeta } from '@/lib/metaServer';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tidy = (v) => String(v || '').replace(/[^\w .+\-]/g, '').trim().slice(0, 100) || null;

// Unlocks Lesson 1 of a course for an email address. The free-lesson-signup function saves the email
// (so we can see who took the free lesson and whether they later bought), subscribes it to the daily
// devotional, and answers with the Lesson 1 video.
export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { /* handled below */ }
  if (body?.website) return NextResponse.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 400 }); // hidden field: bots only
  const email = String(body?.email || '').trim().toLowerCase();
  if (email.length < 5 || email.length > 254 || !EMAIL.test(email)) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }
  const offeringId = String(body?.offering_id || '');
  if (!UUID.test(offeringId)) return NextResponse.json({ ok: false, error: 'This lesson is not available.' }, { status: 404 });
  try {
    const res = await fetch(`${FUNCTIONS_URL}/free-lesson-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({
        email, offering_id: offeringId, returning: body?.returning === true,
        utm_source: tidy(body?.utm_source), utm_medium: tidy(body?.utm_medium),
        utm_campaign: tidy(body?.utm_campaign), utm_content: tidy(body?.utm_content),
      }),
      cache: 'no-store',
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.ok) {
      // A brand-new email for this course is a Lead: send Meta its server copy (same event_id as the browser's).
      if (j.saved === true) sendLeadToMeta(request, body, { source: 'free_lesson', contentName: tidy(body?.content_name) || '' });
      return NextResponse.json({ ok: true, saved: j.saved === true, lesson: j.lesson });
    }
    return NextResponse.json({ ok: false, error: j.error || 'Something went wrong. Please try again.' }, { status: res.status === 404 ? 404 : 502 });
  } catch { /* fall through */ }
  return NextResponse.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 502 });
}
