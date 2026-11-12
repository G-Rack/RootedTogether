import { NextResponse } from 'next/server';
import { FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/lib/config';
import { SLUG } from '@/lib/gifts';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const tidy = (v) => String(v || '').replace(/[^\w .+\-]/g, '').trim().slice(0, 100) || null;

// A free-gift sign-up. The gift-signup function saves the email, adds the Daily devotional contact and
// sends the gift email. The answer says `saved: true` only for a brand-new email, so the page fires its
// advert pixels only then (not for a repeat email, a failure, or a bot).
export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { /* handled below */ }
  if (body?.website) return NextResponse.json({ ok: true }); // hidden field: bots only
  const email = String(body?.email || '').trim().toLowerCase();
  if (email.length < 5 || email.length > 254 || !EMAIL.test(email)) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }
  const campaign = String(body?.campaign || '').trim().toLowerCase();
  if (!SLUG.test(campaign)) return NextResponse.json({ ok: false, error: 'This gift is not available.' }, { status: 404 });
  try {
    const res = await fetch(`${FUNCTIONS_URL}/gift-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ email, campaign, utm_source: tidy(body?.utm_source) }),
      cache: 'no-store',
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.ok) return NextResponse.json({ ok: true, saved: j.saved === true });
    return NextResponse.json({ ok: false, error: j.error || 'Something went wrong. Please try again.' }, { status: res.status === 404 ? 404 : 502 });
  } catch { /* fall through */ }
  return NextResponse.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 502 });
}
