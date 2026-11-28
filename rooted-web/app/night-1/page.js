import { supabaseServer } from '@/lib/supabaseServer';
import FunnelLanding from '@/components/FunnelLanding';
import { FUNNELS } from '@/lib/funnels';

// rootedtogether.club/night-1: the page ads send to for Night 1 of The Night Prayer Routine.
export const revalidate = 60;

export const metadata = {
  title: 'Try Night 1 free | The Night Prayer Routine',
  description: 'Night 1 of The Night Prayer Routine: a short verse, a written prayer and a simple checklist to end your day in peace. Free, with your email.',
  alternates: { canonical: '/night-1' },
  robots: { index: false, follow: true },
};

export default async function Night1Page() {
  const cfg = FUNNELS['night-1'];
  const { data } = await supabaseServer
    .from('offerings')
    .select('id, title, type, price_cents, cover_path, status, is_free_for_family')
    .eq('id', cfg.offeringId)
    .eq('status', 'published')
    .maybeSingle();
  return <FunnelLanding funnel="night-1" offering={data || null} />;
}
