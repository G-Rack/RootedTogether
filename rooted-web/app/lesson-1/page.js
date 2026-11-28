import { supabaseServer } from '@/lib/supabaseServer';
import FunnelLanding from '@/components/FunnelLanding';
import { FUNNELS } from '@/lib/funnels';

// rootedtogether.club/lesson-1: the page ads send to for Lesson 1 of Hearing God in the Quiet.
// The course is read here once (published only) so the picture and price are in the first HTML.
export const revalidate = 60;

export const metadata = {
  title: 'Watch Lesson 1 free | Hearing God in the Quiet',
  description: 'Lesson 1 of Hearing God in the Quiet, a seven-part course on prayer and stillness. Free, with your email.',
  alternates: { canonical: '/lesson-1' },
  robots: { index: false, follow: true },
};

export default async function Lesson1Page() {
  const cfg = FUNNELS['lesson-1'];
  const { data } = await supabaseServer
    .from('offerings')
    .select('id, title, type, price_cents, cover_path, status, is_free_for_family')
    .eq('id', cfg.offeringId)
    .eq('status', 'published')
    .maybeSingle();
  return <FunnelLanding funnel="lesson-1" offering={data || null} />;
}
