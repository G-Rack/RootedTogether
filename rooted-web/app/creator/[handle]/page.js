import { supabaseServer } from '@/lib/supabaseServer';
import { bannerUrl, avatarUrl } from '@/lib/storage';
import { ROLE_LABELS } from '@/lib/roles';
import CreatorStorefrontClient from './CreatorStorefrontClient';

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const { data: storefront } = await supabaseServer.from('creator_storefronts').select('*').eq('handle', handle).maybeSingle();

  if (!storefront) {
    return { title: 'Storefront — Rooted Together' };
  }

  const { data: profile } = await supabaseServer
    .from('creator_public_profiles')
    .select('*')
    .eq('auth_user_id', storefront.auth_user_id)
    .maybeSingle();

  const name = profile?.name || 'Creator';
  const roleLabel = ROLE_LABELS[profile?.role] || 'Creator';
  const title = `${name} — ${roleLabel} on Rooted Together`;
  const description = storefront.tagline || storefront.bio?.slice(0, 160) || `Courses, ebooks, routines, and 1:1 calls from ${name} on Rooted Together.`;
  const image = avatarUrl(storefront.avatar_path) || bannerUrl(storefront.banner_path);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
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

export default function CreatorStorefrontPage() {
  return <CreatorStorefrontClient />;
}
