import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { SITE_URL } from '@/lib/seo';

// Short, tidy links for bios and stories: rootedtogether.club/go/<name> sends the visitor on to the
// full page with its utm_source / utm_medium / utm_campaign / utm_content already attached. The links
// live in the short_links table in Supabase (add one with add_short_link(), see rooted-sql-to-run.sql).
// This is a plain redirect before any page loads, so the Meta Pixel and our analytics run on the page the
// visitor lands on, exactly as if they had clicked the long link. Anything else the visitor arrived with
// (for example Meta's fbclid) is passed along; the saved utm values always win.
export const dynamic = 'force-dynamic';

const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

export async function GET(request, { params }) {
  const { slug } = await params;
  let row = null;
  try {
    const { data } = await supabaseServer.rpc('go_resolve', { p_slug: String(slug || '') });
    row = Array.isArray(data) && data.length ? data[0] : null;
  } catch { /* an unknown or unreachable link just goes to the home page */ }

  const dest = new URL(row ? row.target_path : '/', SITE_URL);
  if (row) {
    const q = new URLSearchParams();
    UTM.forEach((k) => { if (row[k]) q.set(k, row[k]); });
    request.nextUrl.searchParams.forEach((v, k) => {
      if (!UTM.includes(k) && k.length <= 60 && v.length <= 300 && !q.has(k)) q.set(k, v);
    });
    dest.search = q.toString();
  }
  return NextResponse.redirect(dest, {
    status: 302,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}
