'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import OfferingCard from '@/components/OfferingCard';
import CreatorCard from '@/components/CreatorCard';
import { OFFERING_TYPE_LABELS } from '@/lib/roles';
import { fetchMarketStats } from '@/lib/reviews';

const TYPE_FILTERS = ['all', 'course', 'ebook', 'routine', 'call'];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
];

const CATEGORIES = [
  {
    type: 'course',
    title: 'Courses',
    body: 'Multi-part video and written teaching series from Leaders, Mothers, and Pastors.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6B4226" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
  },
  {
    type: 'ebook',
    title: 'Ebooks',
    body: 'Devotionals, testimonies, and study guides — read on your own time.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6B4226" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
  },
  {
    type: 'routine',
    title: 'Daily Routines',
    body: 'Prayer, journaling, and practice plans you can follow day to day.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6B4226" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    type: 'call',
    title: '1:1 Calls',
    body: 'Book real time with a Mother, Pastor, or Leader — scheduled by the minute.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6B4226" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 018 0v3" />
      </svg>
    ),
  },
];

const TESTIMONIALS = [
  { quote: '"Zee’s routine gave my mornings a shape they never had. I finally feel steady."', who: 'Seeker' },
  { quote: '"Booking a call with Pastor Grant took two minutes. The conversation changed my week."', who: 'Assistant' },
  { quote: '"I built my first course in an afternoon and it’s still reaching people I’ll never meet in person."', who: 'Spiritual Leader' },
];

function HomePageInner() {
  const searchParams = useSearchParams();
  const [offerings, setOfferings] = useState([]);
  const [creators, setCreators] = useState([]);
  const [profileByAuthId, setProfileByAuthId] = useState({});
  const [marketStats, setMarketStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(TYPE_FILTERS.includes(searchParams.get('type')) ? searchParams.get('type') : 'all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    let active = true;

    async function load() {
      const [{ data: offeringRows }, { data: storefronts }, stats] = await Promise.all([
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
      ]);

      if (!active) return;

      const authIds = new Set([
        ...(offeringRows || []).map((o) => o.creator_auth_id),
        ...(storefronts || []).map((s) => s.auth_user_id),
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
      setCreators((storefronts || []).filter((s) => profileMap[s.auth_user_id]));
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
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return list;
  }, [offerings, filter, query, sort, marketStats, profileByAuthId]);

  return (
    <main>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(160deg, var(--brown) 0%, var(--brown-light) 100%)', color: 'var(--white)' }}>
        <div className="container" style={{ paddingBlock: '72px 64px', display: 'grid', gridTemplateColumns: '1fr', gap: 22 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.14)', borderRadius: 999, padding: '7px 14px', alignSelf: 'flex-start' }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>ONE ACCOUNT, APP + WEB</span>
          </div>
          <div className="serif" style={{ fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 700, lineHeight: 1.18, maxWidth: 640 }}>
            Faith-filled mentorship, gathered in one marketplace
          </div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.88)', maxWidth: 560, lineHeight: 1.6 }}>
            Spiritual Mothers, Pastors, and Leaders share courses, ebooks, daily routines, and 1:1 guidance with the
            seekers and assistants walking alongside them — sold, gifted, and booked right here.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
            <a href="#offerings" className="btn" style={{ background: 'var(--white)', color: 'var(--brown)' }}>
              Explore the Marketplace
            </a>
            <Link href="/login?tab=signup" className="btn" style={{ border: '1px solid rgba(255,255,255,0.5)', color: 'var(--white)' }}>
              Become a Creator
            </Link>
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)' }}>
            Already on the Rooted Together app? Your login works here too.
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingBlock: '56px 0' }}>
        {/* Browse by offering */}
        <div className="serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--brown)', marginBottom: 28 }}>
          Browse by offering
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 60 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.type}
              onClick={() => setFilter(c.type)}
              className="card"
              style={{ padding: '26px 22px', display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', border: filter === c.type ? '1.5px solid var(--brown)' : undefined }}
            >
              {c.icon}
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{c.title}</div>
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{c.body}</div>
            </button>
          ))}
        </div>

        {/* Creators */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22 }}>
          <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)' }}>
            Meet the Mothers, Pastors &amp; Leaders
          </div>
        </div>

        {loading && <div className="skeleton" style={{ height: 140, marginBottom: 64 }} />}

        {!loading && creators.length === 0 && (
          <div className="muted" style={{ marginBottom: 64 }}>No storefronts yet — check back soon.</div>
        )}

        {!loading && creators.length > 0 && (
          <div className="grid-cards" style={{ marginBottom: 64 }}>
            {creators.map((s) => (
              <CreatorCard
                key={s.auth_user_id}
                creator={profileByAuthId[s.auth_user_id]}
                handle={s.handle}
                avatarPath={s.avatar_path}
                bannerPath={s.banner_path}
              />
            ))}
          </div>
        )}

        {/* Offerings */}
        <div id="offerings" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
          <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)' }}>
            Explore offerings
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={filter === t ? 'btn btn-primary btn-small' : 'btn btn-outline btn-small'}
            >
              {t === 'all' ? 'All' : OFFERING_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 26, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ width: 320, maxWidth: '100%' }}>
            <input
              className="input-field"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search offerings or creators…"
            />
          </div>
          <div style={{ width: 200, maxWidth: '100%' }}>
            <select
              className="input-field"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {query && (
            <span className="muted" style={{ fontSize: 12.5 }}>
              {filteredOfferings.length} {filteredOfferings.length === 1 ? 'result' : 'results'} for &ldquo;{query}&rdquo;
            </span>
          )}
        </div>

        {loading && (
          <div className="grid-cards" style={{ marginBottom: 60 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 240 }} />
            ))}
          </div>
        )}

        {!loading && filteredOfferings.length === 0 && (
          <div className="muted" style={{ marginBottom: 60 }}>
            {query ? 'Nothing matches your search.' : 'Nothing published in this category yet.'}
          </div>
        )}

        {!loading && filteredOfferings.length > 0 && (
          <div className="grid-cards" style={{ marginBottom: 60 }}>
            {filteredOfferings.map((o) => (
              <OfferingCard
                key={o.id}
                offering={o}
                creatorName={profileByAuthId[o.creator_auth_id]?.name}
                stats={marketStats[o.id]}
              />
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div id="how-it-works" className="section-x" style={{ paddingBlock: '56px', background: 'var(--cream-dark)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--brown)', marginBottom: 32, textAlign: 'center' }}>
            How Rooted Together works
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 48 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brown-light)', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                For Seekers &amp; Assistants
              </div>
              <Step n={1}>Browse Mothers, Pastors, and Leaders and discover their courses, ebooks, routines, and calls.</Step>
              <Step n={2}>Purchase or book with the same account you use on the Rooted Together app.</Step>
              <Step n={3}>Grow through what you buy — plus whatever your own Spiritual Family shares for free.</Step>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brown-light)', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                For Mothers, Pastors &amp; Leaders
              </div>
              <Step n={1}>Build your storefront — banner, photo, and the story of your ministry.</Step>
              <Step n={2}>Upload courses, ebooks, and routines, and open your calendar for 1:1 calls.</Step>
              <Step n={3}>Sell to the marketplace, and give anything free to your own Spiritual Family.</Step>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="container" style={{ paddingBlock: '56px' }}>
        <div className="serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--brown)', marginBottom: 28, textAlign: 'center' }}>
          What people are saying
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, fontStyle: 'italic' }}>{t.quote}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>— [Sample testimonial], {t.who}</div>
            </div>
          ))}
        </div>
        <div className="muted" style={{ textAlign: 'center', fontSize: 11.5, marginTop: 14 }}>
          Sample quotes for this draft — real stories go here at launch.
        </div>
      </div>

      {/* Final CTA */}
      <div className="section-x" style={{ background: 'var(--brown)', paddingBlock: '56px', textAlign: 'center' }}>
        <div className="serif" style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 700, color: 'var(--white)', marginBottom: 10 }}>
          Ready to grow — or to share what God&rsquo;s given you?
        </div>
        <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.85)', marginBottom: 26 }}>
          One account for the app and the marketplace. Free to join.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Link href="/login?tab=signup" className="btn" style={{ background: 'var(--white)', color: 'var(--brown)' }}>
            Sign Up as a Seeker
          </Link>
          <Link href="/login?tab=signup" className="btn" style={{ border: '1px solid rgba(255,255,255,0.5)', color: 'var(--white)' }}>
            Become a Creator
          </Link>
        </div>
      </div>
    </main>
  );
}

function Step({ n, children }) {
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          background: 'var(--brown)',
          color: 'var(--white)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {n}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5, paddingTop: 4 }}>{children}</div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageInner />
    </Suspense>
  );
}
