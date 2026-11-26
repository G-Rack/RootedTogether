import { cache } from 'react';
import { supabaseServer } from '@/lib/supabaseServer';
import { coverUrl } from '@/lib/storage';
import { OFFERING_TYPE_LABELS, formatPrice } from '@/lib/roles';
import { SITE_URL, clip, jsonLdString } from '@/lib/seo';
import OfferingDetailClient from './OfferingDetailClient';
import AdvisorAttribution from '@/components/AdvisorAttribution';
import GuestCheckoutReturn from '@/components/GuestCheckoutReturn';

// One database read per page view, shared by the search-engine title, description and structured data.
const getOffering = cache(async (id) => {
  const { data: offering } = await supabaseServer.from('offerings').select('*').eq('id', id).maybeSingle();
  if (!offering) return null;
  const [{ data: profile }, { data: storefront }] = await Promise.all([
    supabaseServer
      .from('creator_public_profiles')
      .select('*')
      .eq('auth_user_id', offering.creator_auth_id)
      .maybeSingle(),
    supabaseServer
      .from('creator_storefronts')
      .select('handle, avatar_path, bio, tagline')
      .eq('auth_user_id', offering.creator_auth_id)
      .maybeSingle(),
  ]);
  return { offering, creatorName: profile?.name || '', profile: profile || null, storefront: storefront || null };
});

export async function generateMetadata({ params }) {
  const { id } = await params;
  const found = await getOffering(id);

  if (!found) {
    return { title: 'Offering — Rooted Together', robots: { index: false, follow: false } };
  }
  const { offering, creatorName } = found;
  const typeLabel = OFFERING_TYPE_LABELS[offering.type] || offering.type;
  const by = creatorName || 'Rooted Together';

  // A title that is unique to this offering and fits a search result (about 60-70 characters).
  const base = `${offering.title} — ${typeLabel} by ${by}`;
  const withBrand = `${base} | Rooted Together`;
  const title = withBrand.length <= 70 ? withBrand : clip(base, 70);

  // A description built from this offering's own text, with a short closing line when it is brief.
  const own = clip(offering.description, 200);
  const closing = offering.free_preview ? ' Watch Lesson 1 free.' : ` ${formatPrice(offering.price_cents)} on Rooted Together.`;
  const description = own
    ? clip(own.length < 110 ? `${own}${closing}` : own, 158)
    : clip(`${typeLabel} "${offering.title}" by ${by} on Rooted Together.${closing}`, 158);
  const image = coverUrl(offering.cover_path);

  return {
    title,
    description,
    alternates: { canonical: `/offering/${offering.id}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/offering/${offering.id}`,
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

// Structured data: a Course for courses, a Product for everything else (ebooks, routines, calls, ...).
function structuredData(offering, creatorName) {
  const url = `${SITE_URL}/offering/${offering.id}`;
  const image = coverUrl(offering.cover_path);
  const price = ((offering.price_cents || 0) / 100).toFixed(2);
  const description = clip(offering.description, 1000)
    || `${OFFERING_TYPE_LABELS[offering.type] || 'Offering'} from Rooted Together.`;
  const provider = { '@type': 'Organization', name: 'Rooted Together', url: SITE_URL };
  const offers = {
    '@type': 'Offer',
    url,
    price,
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    category: Number(price) > 0 ? 'Paid' : 'Free',
  };
  const common = {
    '@context': 'https://schema.org',
    name: offering.title,
    description,
    url,
    ...(image ? { image } : {}),
    inLanguage: 'en',
    offers,
  };
  if (offering.type === 'course') {
    return {
      ...common,
      '@type': 'Course',
      provider,
      ...(!offering.is_original && creatorName ? { creator: { '@type': 'Person', name: creatorName } } : {}),
      hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: 'Self-paced' },
    };
  }
  return {
    ...common,
    '@type': 'Product',
    brand: { '@type': 'Brand', name: 'Rooted Together' },
    ...(!offering.is_original && creatorName ? { creator: { '@type': 'Person', name: creatorName } } : {}),
  };
}

export default async function OfferingDetailPage({ params }) {
  const { id } = await params;
  const found = await getOffering(id);
  return (
    <>
      {found && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(structuredData(found.offering, found.creatorName)) }}
        />
      )}
      <GuestCheckoutReturn />
      {/* The published offering is read here once and handed to the page, so the title, price and Buy button are
          in the first HTML a phone receives instead of appearing after a second round of requests. Anything that
          is not published (a creator's draft) is not handed over; the page then loads it itself, as before. */}
      <OfferingDetailClient
        initialOffering={found && found.offering.status === 'published' ? found.offering : null}
        initialCreator={found && found.offering.status === 'published' ? found.profile : null}
        initialStorefront={found && found.offering.status === 'published' ? found.storefront : null}
      />
      <AdvisorAttribution />
    </>
  );
}
