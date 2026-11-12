import { NextResponse } from 'next/server';
import { SITE_LAUNCHED, SOCIAL_LINKS } from './lib/config';
import { GATE_COOKIE, accessToken, safeEqual } from './lib/siteGate';
import { comingSoonHtml } from './lib/comingSoonHtml';
import { CONSENT_COUNTRIES, REGION_COOKIE } from './lib/tracking';

// While SITE_LAUNCHED is false (lib/config.js) everyone except the owner sees the coming-soon
// page. These few paths stay open: the code check, the email sign-up, and the picture files the
// coming-soon page itself uses.
const OPEN = [
  /^\/_next\//,
  /^\/(privacy|terms)\/?$/,
  /^\/api\/(gate|waitlist)$/,
  /^\/unsubscribe\/?$/,
  /^\/(icon|apple-icon)\.png$/,
  /^\/favicon\.ico$/,
  /^\/robots\.txt$/,
  /^\/\.well-known\//,
];

const PRIVACY_HREF = '/privacy';
const BLURB = 'A faith-based mentorship community, with courses, ebooks, printables, audiobooks and calls from Mothers, Pastors and Spiritual Leaders.';

// Tells the page whether this visitor must be asked before ad cookies are used: the EU/EEA, UK and
// Switzerland, or a location we cannot tell (asking is the safe side). Vercel supplies the country.
function askFirst(request) {
  const country = (request.headers.get('x-vercel-ip-country') || '').toUpperCase();
  return !country || CONSENT_COUNTRIES.includes(country);
}

// Remembers that answer in a small cookie the page reads before the Google tag loads.
function withRegion(response, request) {
  const accept = request.headers.get('accept') || '';
  if (!accept.includes('text/html')) return response;
  const value = askFirst(request) ? '1' : '0';
  if (request.cookies.get(REGION_COOKIE)?.value !== value) {
    response.cookies.set(REGION_COOKIE, value, { path: '/', maxAge: 60 * 60 * 24, sameSite: 'lax' });
  }
  return response;
}

export async function proxy(request) {
  if (SITE_LAUNCHED) return withRegion(NextResponse.next(), request);
  const { pathname } = request.nextUrl;
  if (OPEN.some((re) => re.test(pathname))) return withRegion(NextResponse.next(), request);

  // The owner: has the cookie the secret code gave them.
  const secret = (process.env.SITE_ACCESS_CODE || '').trim();
  const cookie = request.cookies.get(GATE_COOKIE)?.value;
  if (secret && cookie && safeEqual(cookie, await accessToken(secret))) return withRegion(NextResponse.next(), request);

  const headers = {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Content-Type': 'text/html; charset=utf-8',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new NextResponse('Not available yet.', { status: 403, headers: { ...headers, 'Content-Type': 'text/plain' } });
  }
  return withRegion(new NextResponse(comingSoonHtml({ blurb: BLURB, social: SOCIAL_LINKS, privacyHref: PRIVACY_HREF, variant: 'seeker' }), { status: 200, headers }), request);
}
