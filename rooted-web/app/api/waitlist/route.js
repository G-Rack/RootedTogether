import { NextResponse } from 'next/server';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Keeps an advert tag short and plain before it is stored.
const tidy = (v) => String(v || '').replace(/[^\w .+\-]/g, '').trim().slice(0, 100) || null;

// Saves an email from the coming-soon page. The waitlist_signups table only lets the public add
// rows, never read them, so the list stays private and you read it in the Supabase dashboard.
// The answer says `saved: true` only for a brand-new row, so the page fires its advert pixels for
// real new sign-ups only (not for a repeat email, a failure, or a bot).
export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { /* handled below */ }
  // Hidden field that real people leave empty: if it is filled in, quietly pretend it worked.
  if (body?.website) return NextResponse.json({ ok: true });
  const email = String(body?.email || '').trim().toLowerCase();
  if (email.length < 5 || email.length > 254 || !EMAIL.test(email)) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }
  const host = (request.headers.get('host') || 'unknown').slice(0, 60);
  // Which advert brought them (?utm_source= and ?utm_campaign= on the link).
  const utmSource = tidy(body?.utm_source);
  const utmCampaign = tidy(body?.utm_campaign);
  // Only an explicit yes counts as consent to the daily devotional. The time is stored with it.
  const devotional = body?.devotional === true;
  const consent = { devotional_consent: devotional, devotional_consent_at: devotional ? new Date().toISOString() : null };
  const save = (row) => fetch(`${SUPABASE_URL}/rest/v1/waitlist_signups`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  try {
    // source holds the advert (utm_source) when there is one, otherwise the site address;
    // signup_page always holds the site address, so we know which page they used.
    const source = utmSource || host;
    let res = await save({ email, source, utm_source: utmSource, utm_campaign: utmCampaign, signup_page: host, ...consent });
    // If the newest columns are not in the database yet, still save the email with what exists.
    if (res.status === 400) res = await save({ email, source, utm_source: utmSource, ...consent });
    if (res.status === 400) res = await save({ email, source });
    if (res.ok) return NextResponse.json({ ok: true, saved: true });
    // 409 means this email is already on the list, which is fine (but not a new sign-up).
    if (res.status === 409) return NextResponse.json({ ok: true, duplicate: true });
  } catch { /* fall through to the error below */ }
  return NextResponse.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 502 });
}
