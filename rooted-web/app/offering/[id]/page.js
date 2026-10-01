import { supabaseServer } from '@/lib/supabaseServer';
import { coverUrl } from '@/lib/storage';
import { OFFERING_TYPE_LABELS } from '@/lib/roles';
import OfferingDetailClient from './OfferingDetailClient';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const { data: offering } = await supabaseServer.from('offerings').select('*').eq('id', id).maybeSingle();

  if (!offering) {
    return { title: 'Offering — Rooted Together' };
  }

  const { data: profile } = await supabaseServer
    .from('creator_public_profiles')
    .select('name')
    .eq('auth_user_id', offering.creator_auth_id)
    .maybeSingle();

  const typeLabel = OFFERING_TYPE_LABELS[offering.type] || offering.type;
  const title = `${offering.title} — ${typeLabel} by ${profile?.name || 'Rooted Together'}`;
  const description = offering.description
    ? offering.description.slice(0, 160)
    : `A ${typeLabel.toLowerCase()} from ${profile?.name || 'a Rooted Together creator'} on Rooted Together.`;
  const image = coverUrl(offering.cover_path);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default function OfferingDetailPage() {
  return <OfferingDetailClient />;
}
