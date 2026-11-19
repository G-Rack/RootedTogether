import { NextResponse } from 'next/server';
import { SOCIAL_LINKS } from '@/lib/config';
import { comingSoonHtml } from '@/lib/comingSoonHtml';
import { getGift } from '@/lib/gifts';

// rootedtogether.club/gift?campaign=<slug>: the free-gift page, same design as the home page.
// It is a plain page (not part of the locked site), so it works before and after launch.
export async function GET(request) {
  const campaign = String(request.nextUrl.searchParams.get('campaign') || '').trim().toLowerCase();
  // ?campaign=devotional is the devotional-led version of the page: same form, Deborah's gift as the welcome bonus.
  const devotionalLanding = campaign === 'devotional';
  const gift = await getGift(devotionalLanding ? 'deborah' : campaign);
  if (!gift) return NextResponse.redirect(new URL('/', request.url), 302);
  const html = comingSoonHtml({ blurb: '', social: SOCIAL_LINKS, privacyHref: '/privacy', variant: 'gift', gift, devotionalLanding });
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}
