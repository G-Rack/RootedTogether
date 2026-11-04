import { NextResponse } from 'next/server';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Saves an email from the coming-soon page. The waitlist_signups table only lets the public add
// rows, never read them, so the list stays private and you read it in the Supabase dashboard.
export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { /* handled below */ }
  // Hidden field that real people leave empty: if it is filled in, quietly pretend it worked.
  if (body?.website) return NextResponse.json({ ok: true });
  const email = String(body?.email || '').trim().toLowerCase();
  if (email.length < 5 || email.length > 254 || !EMAIL.test(email)) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }
  const source = request.headers.get('host') || 'unknown';
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist_signups`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ email, source: source.slice(0, 60) }),
    });
    // 409 means this email is already on the list, which is fine.
    if (res.ok || res.status === 409) return NextResponse.json({ ok: true });
  } catch { /* fall through to the error below */ }
  return NextResponse.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 502 });
}
