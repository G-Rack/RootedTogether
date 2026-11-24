import { supabaseServer } from '@/lib/supabaseServer';
import { SITE_URL } from '@/lib/seo';

// rootedtogether.club/sitemap.xml: every public page worth finding on Google. Rebuilt about once an hour.
export const revalidate = 3600;

export default async function sitemap() {
  const now = new Date();
  const pages = [
    { path: '', changeFrequency: 'daily', priority: 1 },
    { path: '/advisor', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/devotional', changeFrequency: 'daily', priority: 0.7 },
    { path: '/creators', changeFrequency: 'monthly', priority: 0.4 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.2 },
  ].map((p) => ({ url: `${SITE_URL}${p.path}`, lastModified: now, changeFrequency: p.changeFrequency, priority: p.priority }));

  const [{ data: offerings }, { data: devotionals }] = await Promise.all([
    supabaseServer.from('offerings').select('id, updated_at').eq('status', 'published').order('updated_at', { ascending: false }).limit(5000),
    supabaseServer.rpc('list_public_devotionals', { p_limit: 400 }),
  ]);

  const offeringPages = (offerings || []).map((o) => ({
    url: `${SITE_URL}/offering/${o.id}`,
    lastModified: o.updated_at ? new Date(o.updated_at) : now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
  const devotionalPages = (devotionals || []).map((d) => ({
    url: `${SITE_URL}/devotional/${d.devotional_date}`,
    lastModified: new Date(`${d.devotional_date}T00:00:00Z`),
    changeFrequency: 'yearly',
    priority: 0.5,
  }));

  return [...pages, ...offeringPages, ...devotionalPages];
}
