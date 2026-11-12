import { NextResponse } from 'next/server';
import { SOCIAL_LINKS } from '@/lib/config';
import { comingSoonHtml } from '@/lib/comingSoonHtml';
import { getGift } from '@/lib/gifts';

// rootedtogether.club/gift?campaign=<slug>: the free-gift page, same design as the home page.
// It is a plain page (not part of the locked site), so it works before and after launch.
export async function GET(request) {
  const gift = await getGift(request.nextUrl.searchParams.get('campaign'));
  if (!gift) return NextResponse.redirect(new URL('/', request.url), 302);
  const html = comingSoonHtml({ blurb: '', social: SOCIAL_LINKS, privacyHref: '/privacy', variant: 'gift', gift });
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}
