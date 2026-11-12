import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config';

// A gift is one row in public.gifts (slug, title, subline, pdf_path, active). The next gift is a new
// row plus a PDF uploaded to the "gifts" storage bucket, with no code change.
export const SLUG = /^[a-z0-9][a-z0-9-]{1,39}$/;

export async function getGift(rawSlug) {
  const slug = String(rawSlug || '').trim().toLowerCase();
  if (!SLUG.test(slug)) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gifts?slug=eq.${encodeURIComponent(slug)}&active=eq.true&select=slug,title,subline,pdf_path&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] || null;
  } catch {
    return null;
  }
}
