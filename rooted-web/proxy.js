import { NextResponse } from 'next/server';
import { SITE_LAUNCHED, SOCIAL_LINKS } from './lib/config';
import { GATE_COOKIE, accessToken, safeEqual } from './lib/siteGate';
import { comingSoonHtml } from './lib/comingSoonHtml';

// While SITE_LAUNCHED is false (lib/config.js) everyone except the owner sees the coming-soon
// page. These few paths stay open: the code check, the email sign-up, and the picture files the
// coming-soon page itself uses.
const OPEN = [
  /^\/_next\//,
  /^\/api\/(gate|waitlist)$/,
  /^\/(icon|apple-icon)\.png$/,
  /^\/favicon\.ico$/,
  /^\/robots\.txt$/,
  /^\/\.well-known\//,
];

const BLURB = 'A faith-based mentorship community, with courses, ebooks, printables, audiobooks and calls from Mothers, Pastors and Spiritual Leaders.';

export async function proxy(request) {
  if (SITE_LAUNCHED) return NextResponse.next();
  const { pathname } = request.nextUrl;
  if (OPEN.some((re) => re.test(pathname))) return NextResponse.next();

  // The owner: has the cookie the secret code gave them.
  const secret = (process.env.SITE_ACCESS_CODE || '').trim();
  const cookie = request.cookies.get(GATE_COOKIE)?.value;
  if (secret && cookie && safeEqual(cookie, await accessToken(secret))) return NextResponse.next();

  const headers = {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Content-Type': 'text/html; charset=utf-8',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new NextResponse('Not available yet.', { status: 403, headers: { ...headers, 'Content-Type': 'text/plain' } });
  }
  return new NextResponse(comingSoonHtml({ blurb: BLURB, social: SOCIAL_LINKS }), { status: 200, headers });
}
