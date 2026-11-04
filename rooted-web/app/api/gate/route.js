import { NextResponse } from 'next/server';
import { GATE_COOKIE, GATE_MAX_AGE, accessToken, safeEqual } from '@/lib/siteGate';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Checks the secret code typed on the coming-soon page and, if it is right, sets the access cookie.
export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { /* an empty or broken body counts as a wrong code */ }
  const secret = (process.env.SITE_ACCESS_CODE || '').trim();
  const given = String(body?.code || '').trim();
  const ok = !!secret && !!given && safeEqual(await accessToken(given), await accessToken(secret));
  if (!ok) {
    await sleep(900); // slows down guessing
    return NextResponse.json({ ok: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  res.cookies.set(GATE_COOKIE, await accessToken(secret), {
    httpOnly: true,
    secure: request.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: GATE_MAX_AGE,
  });
  return res;
}

// TEMPORARY check: says whether a code is set on this deployment and how long it is (never the code itself).
export async function GET() {
  const secret = (process.env.SITE_ACCESS_CODE || '').trim();
  return NextResponse.json({ configured: secret.length > 0, length: secret.length }, { headers: { 'Cache-Control': 'no-store' } });
}
