import { NextResponse } from 'next/server';
import { SUPABASE_URL } from '@/lib/config';
import { getGift } from '@/lib/gifts';

// rootedtogether.club/gift/pdf?campaign=<slug>: serves the gift PDF from our own domain. The file lives in
// the public "gifts" storage bucket; this route fetches it and streams it, so the link in the email
// never changes even if the file is replaced.
export async function GET(request) {
  const gift = await getGift(request.nextUrl.searchParams.get('campaign'));
  if (!gift || !gift.pdf_path) return new NextResponse('Not found.', { status: 404 });
  const path = String(gift.pdf_path).split('/').map(encodeURIComponent).join('/');
  const file = await fetch(`${SUPABASE_URL}/storage/v1/object/public/gifts/${path}`, { cache: 'no-store' });
  if (!file.ok || !file.body) return new NextResponse('Not found.', { status: 404 });
  return new NextResponse(file.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${gift.slug}.pdf"`,
      'Cache-Control': 'public, max-age=300',
      'X-Robots-Tag': 'noindex',
    },
  });
}
