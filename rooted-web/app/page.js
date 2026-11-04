'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { OFFERING_TYPE_KEYS } from '@/lib/offeringTypes';
import { useSession } from '@/components/SessionProvider';
import SignedInHome from '@/components/SignedInHome';
import SignedOutHome from '@/components/SignedOutHome';
import { fetchMarketStats } from '@/lib/reviews';
import { fetchProIds } from '@/lib/pro';

const TYPE_FILTERS = ['all', ...OFFERING_TYPE_KEYS];

function HomePageInner() {
  const searchParams = useSearchParams();
  const { session, loading: sessionLoading } = useSession();
  const [offerings, setOfferings] = useState([]);
  const [creators, setCreators] = useState([]);
  const [profileByAuthId, setProfileByAuthId] = useState({});
  const [marketStats, setMarketStats] = useState({});
  const [proIds, setProIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(TYPE_FILTERS.includes(searchParams.get('type')) ? searchParams.get('type') : 'all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [testimonials, setTestimonials] = useState([]);

  // Sidebar and pills both go through here so the address bar follows the filter.
  const selectType = (t) => {
    setFilter(t);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', t === 'all' ? '/' : `/?type=${t}`);
  };

  useEffect(() => {
    let active = true;
    supabase
      .from('testimonials')
      .select('quote, name, role_label')
      .eq('status', 'approved')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(9)
      .then(({ data }) => {
        if (!active || !data || data.length === 0) return;
        setTestimonials(data.map((t) => ({ quote: `\u201c${t.quote}\u201d`, name: t.name, who: t.role_label })));
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      const [{ data: offeringRows }, { data: storefronts }, stats, pro] = await Promise.all([
        supabase
          .from('offerings')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(48),
        supabase
          .from('creator_storefronts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(24),
        fetchMarketStats(),
        fetchProIds(),
      ]);

      if (!active) return;

      // Rooted Pro creators get priority placement, so make sure they are in the list
      // even if their storefront is older than the newest 24.
      let allStorefronts = storefronts || [];
      const missingPro = Array.from(pro).filter((id) => !allStorefronts.some((s) => s.auth_user_id === id));
      if (missingPro.length > 0) {
        const { data: extra } = await supabase.from('creator_storefronts').select('*').in('auth_user_id', missingPro);
        if (extra) allStorefronts = [...allStorefronts, ...extra];
      }
      if (!active) return;

      const authIds = new Set([
        ...(offeringRows || []).map((o) => o.creator_auth_id),
        ...allStorefronts.map((s) => s.auth_user_id),
      ]);

      let profileMap = {};
      if (authIds.size > 0) {
        const { data: profiles } = await supabase
          .from('creator_public_profiles')
          .select('*')
          .in('auth_user_id', Array.from(authIds));
        profileMap = Object.fromEntries((profiles || []).map((p) => [p.auth_user_id, p]));
      }

      if (!active) return;
      setOfferings(offeringRows || []);
      setCreators(allStorefronts.filter((s) => profileMap[s.auth_user_id]));
      setProIds(pro);
      setProfileByAuthId(profileMap);
      setMarketStats(stats);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const filteredOfferings = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = offerings.filter((o) => {
      if (filter !== 'all' && o.type !== filter) return false;
      if (!q) return true;
      const creatorName = profileByAuthId[o.creator_auth_id]?.name || '';
      return (
        o.title.toLowerCase().includes(q) ||
        (o.description || '').toLowerCase().includes(q) ||
        creatorName.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      if (sort === 'price-low') return a.price_cents - b.price_cents;
      if (sort === 'price-high') return b.price_cents - a.price_cents;
      if (sort === 'popular') return (marketStats[b.id]?.purchases_count || 0) - (marketStats[a.id]?.purchases_count || 0);
      if (sort === 'rating') return (marketStats[b.id]?.avg_rating || 0) - (marketStats[a.id]?.avg_rating || 0);
      // Default order: Rooted Pro creators first, then newest.
      const proDiff = (proIds.has(b.creator_auth_id) ? 1 : 0) - (proIds.has(a.creator_auth_id) ? 1 : 0);
      if (proDiff !== 0) return proDiff;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return list;
  }, [offerings, filter, query, sort, marketStats, profileByAuthId, proIds]);

  const orderedCreators = useMemo(
    () => [...creators].sort((a, b) => (proIds.has(b.auth_user_id) ? 1 : 0) - (proIds.has(a.auth_user_id) ? 1 : 0)),
    [creators, proIds],
  );

  // Wait for the session so a signed-in person never sees the visitor page flash by.
  if (sessionLoading) {
    return (
      <div className="container" style={{ paddingBlock: '48px' }}>
        <div className="skeleton" style={{ height: 240 }} />
      </div>
    );
  }

  // Signed in: the sidebar marketplace. Visitors keep the page below.
  if (session) {
    return (
      <SignedInHome
        loading={loading}
        filter={filter}
        onFilter={selectType}
        query={query}
        setQuery={setQuery}
        sort={sort}
        setSort={setSort}
        offerings={filteredOfferings}
        creators={creators}
        profileByAuthId={profileByAuthId}
        marketStats={marketStats}
        proIds={proIds}
      />
    );
  }

  return (
    <SignedOutHome
      loading={loading}
      filter={filter}
      onFilter={selectType}
      query={query}
      setQuery={setQuery}
      sort={sort}
      setSort={setSort}
      offerings={filteredOfferings}
      allOfferings={offerings}
      creators={orderedCreators}
      profileByAuthId={profileByAuthId}
      marketStats={marketStats}
      proIds={proIds}
      testimonials={testimonials}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageInner />
    </Suspense>
  );
}
