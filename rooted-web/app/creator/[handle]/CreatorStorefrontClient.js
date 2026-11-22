'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { bannerUrl, avatarUrl, coverUrl } from '@/lib/storage';
import { initialsFor, ROLE_LABELS, OFFERING_TYPE_LABELS, formatPrice } from '@/lib/roles';
import CoverImage from '@/components/CoverImage';
import TypeIcon from '@/components/TypeIcon';
import StarRating from '@/components/StarRating';
import { activeSocials } from '@/lib/socials';
import { fetchCreatorReviewStats, fetchCreatorReviews, fetchMarketStats } from '@/lib/reviews';
import ProBadge from '@/components/ProBadge';
import SaleTag from '@/components/SaleTag';
import { OFFERING_TYPE_KEYS, OFFERING_TYPE_BY_KEY } from '@/lib/offeringTypes';

const TYPE_TABS = ['all', ...OFFERING_TYPE_KEYS];

const WRAP = { maxWidth: 1280, margin: '0 auto', boxSizing: 'border-box', padding: '0 clamp(20px, 4vw, 64px)' };
const H2 = { margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 'clamp(26px, 3vw, 32px)', letterSpacing: '-0.01em', color: 'var(--text)' };

// Each service links to its own dedicated request page
// (/creator/[handle]/prayer, /meditation, /request) where a visitor picks
// what they need and, for Prayer/Meditation, a package. Submitting there
// doesn't hit a backend yet — it confirms locally, the same way "Message
// in the app" does above — so the visitor finishes the conversation in
// the Rooted Together app.
const SERVICES = [
  {
    key: 'prayer',
    routeSuffix: 'prayer',
    title: 'Daily Prayers',
    description: 'Ask them to hold something specific in prayer each day this week — for you, or for someone you love.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M12 3v7" />
        <path d="M9 6.5c0 2-1.5 2.5-1.5 4.5S9 14 9 14" />
        <path d="M15 6.5c0 2 1.5 2.5 1.5 4.5S15 14 15 14" />
        <path d="M6 21c0-3.5 2.5-6 6-6s6 2.5 6 6" />
      </svg>
    ),
  },
  {
    key: 'meditation',
    routeSuffix: 'meditation',
    title: 'Meditation',
    description: 'A guided meditation for peace, love, or provision — whichever you need right now.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
        <path d="M4 20c1-4 4-6 8-6s7 2 8 6" />
      </svg>
    ),
  },
  {
    key: 'special',
    routeSuffix: 'request',
    title: 'Special Requests',
    description: "Something specific on your heart that doesn't fit the above? Send a private request.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M4 6l8 6 8-6" />
        <rect x="3" y="5" width="18" height="14" rx="2" />
      </svg>
    ),
  },
];

const TRUST = [
  { text: 'Secure card checkout with Stripe', icon: (<><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10.5h18M7 15h4" /></>) },
  { text: 'Instant access after you buy', icon: <path d="M13 2L4 14h7l-1 8 9-12h-7z" /> },
  { text: 'Everything you get stays in your library', icon: <path d="M4 5a2 2 0 012-2h12a2 2 0 012 2v16l-8-4-8 4z" /> },
];

function Icon({ children, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
      {children}
    </svg>
  );
}

function priceText(o) {
  return o.is_free_for_family ? 'Free for family' : formatPrice(o.price_cents);
}

function detailLine(o) {
  if (o.type === 'call' && o.call_duration_minutes) return `${o.call_duration_minutes} min video call`;
  return '';
}

export default function CreatorStorefrontClient() {
  const { handle } = useParams();
  const router = useRouter();
  const { session } = useSession();
  const [storefront, setStorefront] = useState(null);
  const [profile, setProfile] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [offeringStats, setOfferingStats] = useState({});
  const [isFamily, setIsFamily] = useState(false);
  const [stats, setStats] = useState({ offerings_count: 0, students_count: 0 });
  const [reviewStats, setReviewStats] = useState({ review_count: 0, avg_rating: 0 });
  const [reviews, setReviews] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [creatorIsPro, setCreatorIsPro] = useState(false);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: sf } = await supabase.from('creator_storefronts').select('*').eq('handle', handle).maybeSingle();
      if (!active) return;
      if (!sf) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setStorefront(sf);

      const isSelf = session?.user?.id === sf.auth_user_id;

      const [{ data: proRow }, { data: prof }, offeringsRes, familyRes, statsRes, followRes, reviewStatsRes, reviewsRes, marketStats] = await Promise.all([
        supabase.from('creator_pro').select('auth_user_id').eq('auth_user_id', sf.auth_user_id).maybeSingle(),
        supabase.from('creator_public_profiles').select('*').eq('auth_user_id', sf.auth_user_id).maybeSingle(),
        isSelf
          ? supabase.from('offerings').select('*').eq('creator_auth_id', sf.auth_user_id).order('sort_order')
          : supabase
              .from('offerings')
              .select('*')
              .eq('creator_auth_id', sf.auth_user_id)
              .eq('status', 'published')
              .order('sort_order'),
        session ? supabase.rpc('is_accepted_family_member_of_creator', { creator_id: sf.auth_user_id }) : Promise.resolve({ data: false }),
        supabase.rpc('creator_offering_stats', { creator_id: sf.auth_user_id }),
        session && !isSelf
          ? supabase.from('follows').select('id').eq('follower_auth_id', session.user.id).eq('followee_auth_id', sf.auth_user_id).maybeSingle()
          : Promise.resolve({ data: null }),
        fetchCreatorReviewStats(sf.auth_user_id),
        fetchCreatorReviews(sf.auth_user_id),
        fetchMarketStats(),
      ]);

      if (!active) return;
      setProfile(prof || null);
      setCreatorIsPro(!!proRow);
      setOfferings(offeringsRes.data || []);
      setOfferingStats(marketStats || {});
      setIsFamily(!!familyRes.data);
      setStats(statsRes.data?.[0] || { offerings_count: 0, students_count: 0 });
      setIsFollowing(!!followRes.data);
      setReviewStats(reviewStatsRes);
      setReviews(reviewsRes);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [handle, session]);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('popular');
  const [copied, setCopied] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const [activeSection, setActiveSection] = useState('shop');
  const [aboutOpen, setAboutOpen] = useState(false);
  const heroRef = useRef(null);
  const reviewsRef = useRef(null);

  const visibleOfferings = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bought = (o) => offeringStats[o.id]?.purchases_count || 0;
    const price = (o) => (o.is_free_for_family ? 0 : o.price_cents || 0);
    const when = (o) => new Date(o.created_at || 0).getTime();
    const list = offerings.filter(
      (o) =>
        (tab === 'all' || o.type === tab) &&
        (!q || (o.title || '').toLowerCase().includes(q) || (o.description || '').toLowerCase().includes(q)),
    );
    if (sort === 'popular') return [...list].sort((a, b) => bought(b) - bought(a));
    if (sort === 'newest') return [...list].sort((a, b) => when(b) - when(a));
    if (sort === 'low') return [...list].sort((a, b) => price(a) - price(b));
    if (sort === 'high') return [...list].sort((a, b) => price(b) - price(a));
    return list;
  }, [offerings, tab, query, sort, offeringStats]);
  const filtersActive = tab !== 'all' || query.trim() !== '';

  // The piece to lead with: the one most people have bought, else the first.
  const featured = useMemo(() => {
    const live = offerings.filter((o) => o.status === 'published');
    if (live.length < 2) return null;
    return [...live].sort((a, b) => (offeringStats[b.id]?.purchases_count || 0) - (offeringStats[a.id]?.purchases_count || 0))[0];
  }, [offerings, offeringStats]);

  const [now] = useState(() => Date.now());
  const yearsActive = useMemo(() => {
    if (!profile?.created_at) return null;
    const years = (now - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365);
    return years < 1 ? '<1' : Math.floor(years);
  }, [profile, now]);

  // Scroll effects: sections fade in as they arrive, the slim top bar appears once the
  // header has scrolled away, and the section links follow where the visitor is reading.
  useEffect(() => {
    if (loading || notFound) return undefined;
    const reveal = Array.from(document.querySelectorAll('.sf-reveal'));
    if (typeof IntersectionObserver === 'undefined') {
      reveal.forEach((el) => el.classList.add('in'));
      return undefined;
    }
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            revealObs.unobserve(en.target);
          }
        });
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.04 },
    );
    reveal.forEach((el) => revealObs.observe(el));

    const hero = heroRef.current;
    const heroObs = hero
      ? new IntersectionObserver(([en]) => setBarVisible(!en.isIntersecting), { threshold: 0, rootMargin: '-72px 0px 0px 0px' })
      : null;
    if (hero && heroObs) heroObs.observe(hero);

    const sections = ['shop', 'reviews', 'about', 'services'].map((id) => document.getElementById(id)).filter(Boolean);
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) setActiveSection(en.target.id);
        });
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    sections.forEach((s) => spy.observe(s));

    return () => {
      revealObs.disconnect();
      if (heroObs) heroObs.disconnect();
      spy.disconnect();
    };
  }, [loading, notFound, creatorIsPro, reviews.length, offerings.length]);

  const toggleFollow = async () => {
    if (!session) {
      router.push(`/login?tab=signup&path=buyer&next=${encodeURIComponent(`/creator/${handle}`)}`);
      return;
    }
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing); // show the change at once, put it back if it fails
    setFollowBusy(true);
    const result = wasFollowing
      ? await supabase.from('follows').delete().eq('follower_auth_id', session.user.id).eq('followee_auth_id', storefront.auth_user_id)
      : await supabase.from('follows').insert({ follower_auth_id: session.user.id, followee_auth_id: storefront.auth_user_id });
    if (result.error) setIsFollowing(wasFollowing);
    setFollowBusy(false);
  };

  const shareLink = async () => {
    const url = window.location.href.split('#')[0];
    try {
      if (navigator.share && /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent)) {
        await navigator.share({ title: profile?.name, text: storefront?.tagline || '', url });
        return;
      }
    } catch {
      return; // the visitor closed the share sheet
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard blocked: nothing else to do */
    }
  };

  const goTo = (id) => (e) => {
    e.preventDefault();
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
  };

  const slideReviews = (dir) => {
    const el = reviewsRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div style={{ ...WRAP, paddingBlock: 32 }}>
        <div className="skeleton" style={{ height: 'clamp(150px, 24vw, 270px)', borderRadius: 28 }} />
        <div className="skeleton" style={{ height: 150, marginTop: 20, borderRadius: 22 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20, marginTop: 28 }}>
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 300, borderRadius: 22 }} />)}
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="container" style={{ paddingBlock: '96px', textAlign: 'center' }}>
        <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)' }}>
          We couldn&rsquo;t find that storefront.
        </div>
      </div>
    );
  }

  const banner = bannerUrl(storefront.banner_path);
  const avatar = avatarUrl(storefront.avatar_path);
  const isSelf = session?.user?.id === storefront.auth_user_id;
  // "Mother Ruth" reads better whole than as just "Mother"; other names use the first word.
  const nameParts = profile.name.trim().split(/\s+/);
  const firstName = profile.role === 'church' || nameParts.length < 2
    ? profile.name
    : /^(mother|mama|pastor|father|dr\.?|rev\.?|reverend|bishop|apostle|elder|prophet|sister|brother|minister)$/i.test(nameParts[0])
      ? `${nameParts[0]} ${nameParts[1]}`
      : nameParts[0];
  const freeCount = offerings.filter((o) => o.is_free_for_family && o.status === 'published').length;
  const socials = activeSocials(storefront);
  const aboutText = storefront.bio || profile.story || '';
  const longAbout = aboutText.length > 520;
  const hasReviews = reviews.length > 0;
  const navLinks = [
    offerings.length > 0 && { id: 'shop', label: 'Shop' },
    hasReviews && { id: 'reviews', label: 'Reviews' },
    { id: 'about', label: 'About' },
    creatorIsPro && { id: 'services', label: 'Services' },
  ].filter(Boolean);

  const followButton = (small) =>
    isSelf ? (
      <Link href="/dashboard/branding" className={`btn btn-outline ${small ? 'btn-small' : ''}`}>
        Edit storefront
      </Link>
    ) : (
      <button
        type="button"
        onClick={toggleFollow}
        disabled={followBusy}
        aria-pressed={isFollowing}
        className={`btn sf-follow ${isFollowing ? 'is-on' : ''} ${small ? 'btn-small' : ''}`}
      >
        {isFollowing ? (
          <>
            <Icon size={15}><path d="M5 12.5l4.5 4.5L19 7.5" /></Icon>
            Following
          </>
        ) : (
          <>
            <Icon size={15}><path d="M12 5v14M5 12h14" /></Icon>
            Follow
          </>
        )}
      </button>
    );

  const statTiles = [
    { value: stats.offerings_count ?? 0, label: stats.offerings_count === 1 ? 'offering' : 'offerings' },
    (stats.students_count ?? 0) > 0 && { value: stats.students_count, label: stats.students_count === 1 ? 'student' : 'students' },
    reviewStats.review_count > 0 && {
      value: Number(reviewStats.avg_rating).toFixed(1),
      label: `${reviewStats.review_count} ${reviewStats.review_count === 1 ? 'review' : 'reviews'}`,
      stars: Number(reviewStats.avg_rating),
    },
    yearsActive !== null && { value: yearsActive, label: yearsActive === 1 ? 'year here' : 'years here' },
  ].filter(Boolean);

  return (
    <div style={{ background: 'var(--cream)' }}>
      {/* Hero */}
      <div style={{ ...WRAP, paddingTop: 24 }}>
        <section className="sf-hero" ref={heroRef}>
          <div
            className="sf-banner"
            style={{
              background: banner
                ? `center / cover no-repeat url("${banner}")`
                : 'radial-gradient(800px 280px at 88% -20%, rgba(200,146,63,0.4), transparent 62%), linear-gradient(160deg, #6B4226 0%, #8C6A4A 100%)',
            }}
          />
          <div className="sf-hero-body">
            <div className="sf-hero-top">
              {avatar ? (
                <div className="sf-avatar" style={{ background: `center / cover no-repeat url("${avatar}")` }} />
              ) : (
                <div className="avatar sf-avatar" style={{ fontSize: 34 }}>{initialsFor(profile.name)}</div>
              )}
              <div className="sf-actions">
                {offerings.length > 0 && (
                  <a href="#shop" onClick={goTo('shop')} className="btn btn-primary">
                    Shop now
                    <Icon size={15}><path d="M12 5v14M6 13l6 6 6-6" /></Icon>
                  </a>
                )}
                {followButton(false)}
                <button type="button" onClick={shareLink} className="sf-icon-btn" aria-label="Copy storefront link" title={copied ? 'Link copied' : 'Share this storefront'}>
                  {copied ? (
                    <Icon size={18}><path d="M5 12.5l4.5 4.5L19 7.5" /></Icon>
                  ) : (
                    <Icon size={18}><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13" /></Icon>
                  )}
                </button>
                <span className="sf-toast" role="status" aria-live="polite">{copied ? 'Link copied' : ''}</span>
              </div>
            </div>

            <div style={{ marginTop: 14, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 className="serif" style={{ margin: 0, fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1, fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--text)' }}>{profile.name}</h1>
                <span title="Approved creator" style={{ color: '#C8923F', display: 'flex' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="rgba(46,27,16,0.3)" strokeWidth="1">
                    <path d="M12 2l2.4 2.1 3.1-.6.9 3 2.6 1.7-1 3 1 3-2.6 1.7-.9 3-3.1-.6L12 22l-2.4-2.1-3.1.6-.9-3-2.6-1.7 1-3-1-3 2.6-1.7.9-3 3.1.6z" />
                  </svg>
                </span>
                {creatorIsPro && <ProBadge />}
              </div>
              <div className="sf-eyebrow" style={{ marginTop: 8 }}>{ROLE_LABELS[profile.role] || profile.role}</div>
              {storefront.tagline && (
                <p style={{ margin: '10px 0 0', maxWidth: 640, fontSize: 17, lineHeight: 1.55, color: 'var(--text-soft)' }}>{storefront.tagline}</p>
              )}
              {socials.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {socials.map((so) => (
                    <a key={so.key} href={so.href} target="_blank" rel="noreferrer" className="sf-social" aria-label={so.label} title={so.label}>
                      {so.icon}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="sf-stats">
              {statTiles.map((t) => (
                <div key={t.label} className="sf-stat">
                  <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {t.value}
                    {t.stars !== undefined && <StarRating value={t.stars} size={13} />}
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{t.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Slim bar: stays at the top while reading, with the section links */}
      <div className={`sf-bar ${barVisible ? 'stuck' : ''}`}>
        <div style={{ ...WRAP, display: 'flex', alignItems: 'center', gap: 14, minHeight: 60 }}>
          <div className="sf-bar-id">
            {avatar ? (
              <span style={{ width: 34, height: 34, borderRadius: 999, flex: 'none', background: `center / cover no-repeat url("${avatar}")` }} />
            ) : (
              <span className="avatar" style={{ width: 34, height: 34, fontSize: 13, flex: 'none' }}>{initialsFor(profile.name)}</span>
            )}
            <span className="serif sf-bar-name">{profile.name}</span>
          </div>
          <nav className="sf-nav" aria-label="Storefront sections">
            {navLinks.map((l) => (
              <a key={l.id} href={`#${l.id}`} onClick={goTo(l.id)} className="sf-navlink" aria-current={activeSection === l.id ? 'true' : undefined}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="sf-bar-cta">{followButton(true)}</div>
        </div>
      </div>

      {isSelf && (
        <div style={{ ...WRAP, paddingTop: 20 }}>
          <div style={{ padding: '12px 18px', borderRadius: 14, background: '#fff', border: '1px dashed #C8923F', fontSize: 13.5, color: '#6F5846' }}>
            You are looking at your own storefront, the way customers see it. Drafts show here for you only.
          </div>
        </div>
      )}

      {/* Why buy here */}
      <section aria-label="Why buy here" className="sf-reveal" style={{ ...WRAP, paddingTop: 22 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 26px' }}>
          {TRUST.map((t) => (
            <div key={t.text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, fontWeight: 600, color: 'var(--text-soft)' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, flex: 'none', borderRadius: 10, background: '#F1E4D3', color: 'var(--brown)' }}>
                <Icon size={16}>{t.icon}</Icon>
              </span>
              {t.text}
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      {featured && (
        <section className="sf-reveal" style={{ ...WRAP, paddingTop: 40 }}>
          <div className="sf-eyebrow" style={{ marginBottom: 12 }}>Start here</div>
          <FeaturedCard offering={featured} stats={offeringStats[featured.id]} />
        </section>
      )}

      {/* Shop */}
      <section id="shop" className="sf-reveal" style={{ ...WRAP, paddingTop: 56, scrollMarginTop: 76 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '14px 24px' }}>
          <div>
            <h2 style={H2}>Shop {firstName}&rsquo;s offerings</h2>
            <p style={{ margin: '8px 0 0', fontSize: 15.5, color: '#6F5846' }}>Pick what speaks to you. You can check out in under a minute.</p>
          </div>
          {offerings.length > 1 && (
            <div className="sf-toolbar">
              <label className="sf-search">
                <Icon size={17}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search offerings"
                  aria-label="Search offerings"
                />
              </label>
              <label className="sf-sort">
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort offerings">
                  <option value="popular">Most popular</option>
                  <option value="newest">Newest</option>
                  <option value="low">Price: low to high</option>
                  <option value="high">Price: high to low</option>
                </select>
              </label>
            </div>
          )}
        </div>

        {offerings.length > 1 && (
          <div role="group" aria-label="Filter by type" className="sf-chips">
            {TYPE_TABS.map((t) => {
              const count = t === 'all' ? offerings.length : offerings.filter((o) => o.type === t).length;
              // Only show types this creator actually sells.
              if (t !== 'all' && count === 0) return null;
              return (
                <button key={t} type="button" onClick={() => setTab(t)} aria-pressed={tab === t} className="sf-pill">
                  {t === 'all' ? 'All' : OFFERING_TYPE_LABELS[t]}
                  <span className="sf-pill-count">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {filtersActive && (
          <div className="muted" style={{ marginTop: 14, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            Showing {visibleOfferings.length} of {offerings.length}
            <button type="button" className="sf-link" onClick={() => { setTab('all'); setQuery(''); }}>Clear filters</button>
          </div>
        )}

        <div style={{ marginTop: 22 }}>
          {visibleOfferings.length === 0 && (
            <div className="sf-empty">
              <span style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 16, background: '#F1E4D3', color: 'var(--brown)' }}>
                <Icon size={24}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon>
              </span>
              <div className="serif" style={{ fontSize: 18, fontWeight: 700 }}>
                {offerings.length === 0 ? 'Nothing here yet' : 'No matches'}
              </div>
              <div className="muted" style={{ fontSize: 14 }}>
                {offerings.length === 0 ? 'Check back soon.' : 'Try a different word, or clear the filters.'}
              </div>
              {filtersActive && (
                <button type="button" className="btn btn-outline btn-small" onClick={() => { setTab('all'); setQuery(''); }}>
                  Clear filters
                </button>
              )}
            </div>
          )}
          {visibleOfferings.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))', gap: 22 }}>
              {visibleOfferings.map((o, i) => (
                <StoreCard key={o.id} offering={o} stats={offeringStats[o.id]} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Spiritual Family */}
      {(isFamily || freeCount > 0) && (
        <section className="sf-reveal" style={{ ...WRAP, paddingTop: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '18px 22px', borderRadius: 20, background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, flex: 'none', borderRadius: 14, background: '#fff', color: 'var(--success-text)' }}>
              <Icon size={22}><path d="M12 21s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.6-7 10-7 10z" /></Icon>
            </span>
            <div style={{ flex: '1 1 260px' }}>
              {isFamily ? (
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--success-text)' }}>
                  You are part of {firstName}&rsquo;s Spiritual Family. Anything marked &ldquo;Free for family&rdquo; is already unlocked for you.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--success-text)' }}>
                    {freeCount} {freeCount === 1 ? 'piece is' : 'pieces are'} shared free with {firstName}&rsquo;s Spiritual Family
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Request to join from the Rooted Together app.</div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Reviews: shown once there are real ones */}
      {hasReviews && (
        <section id="reviews" className="sf-reveal" style={{ ...WRAP, paddingTop: 64, scrollMarginTop: 76 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px 24px', marginBottom: 22 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 22px' }}>
              <h2 style={H2}>What students are saying</h2>
              {reviewStats.review_count > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999, background: '#fff', border: '1px solid #EADBC8', fontSize: 14, fontWeight: 700 }}>
                  <StarRating value={Number(reviewStats.avg_rating)} size={15} />
                  {Number(reviewStats.avg_rating).toFixed(1)}
                  <span className="muted" style={{ fontWeight: 500 }}>from {reviewStats.review_count} {reviewStats.review_count === 1 ? 'review' : 'reviews'}</span>
                </span>
              )}
            </div>
            {reviews.length > 1 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="sf-icon-btn" onClick={() => slideReviews(-1)} aria-label="Previous reviews">
                  <Icon size={18}><path d="M15 5l-7 7 7 7" /></Icon>
                </button>
                <button type="button" className="sf-icon-btn" onClick={() => slideReviews(1)} aria-label="Next reviews">
                  <Icon size={18}><path d="M9 5l7 7-7 7" /></Icon>
                </button>
              </div>
            )}
          </div>
          <div className="sf-scroller" ref={reviewsRef} tabIndex={0} aria-label="Student reviews">
            {reviews.map((r) => (
              <figure key={r.id} className="sf-review">
                <StarRating value={r.rating} size={14} />
                {r.body && <blockquote style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65 }}>{r.body}</blockquote>}
                <figcaption className="muted" style={{ fontSize: 12.5, marginTop: 'auto' }}>
                  {r.reviewer_name}, on {r.offering_title}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* About */}
      <section id="about" className="sf-reveal" style={{ ...WRAP, paddingTop: 64, scrollMarginTop: 76 }}>
        <div className="responsive-2col" style={{ '--col-a': '2fr', '--col-b': '1fr', '--col-gap': '36px', alignItems: 'start' }}>
          <div>
            <h2 style={H2}>About {firstName}</h2>
            <div
              style={{
                marginTop: 14,
                fontSize: 16,
                color: 'var(--text)',
                lineHeight: 1.75,
                whiteSpace: 'pre-line',
                ...(longAbout && !aboutOpen ? { display: '-webkit-box', WebkitLineClamp: 7, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}),
              }}
            >
              {aboutText || 'This creator hasn’t written their story yet.'}
            </div>
            {longAbout && (
              <button type="button" className="sf-link" style={{ marginTop: 10, fontSize: 14.5 }} onClick={() => setAboutOpen((v) => !v)} aria-expanded={aboutOpen}>
                {aboutOpen ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
          <div className="sf-connect">
            <div className="sf-eyebrow" style={{ marginBottom: 8 }}>Connect with {firstName}</div>
            {socials.map((so) => (
              <a key={so.key} href={so.href} target="_blank" rel="noreferrer" className="sf-connect-row">
                <span className="sf-connect-icon">{so.icon}</span>
                <span style={{ minWidth: 0, flex: 1 }}>{so.label}</span>
                <Icon size={15}><path d="M7 17L17 7M9 7h8v8" /></Icon>
              </a>
            ))}
            <div className="sf-connect-row" style={{ cursor: 'default' }}>
              <span className="sf-connect-icon">
                <Icon size={16}><path d="M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></Icon>
              </span>
              <span style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.35 }}>
                Message in the Rooted Together app
                <span className="muted" style={{ display: 'block', fontSize: 12.5, fontWeight: 500 }}>Get the app to send {firstName} a message.</span>
              </span>
            </div>
            <button type="button" className="sf-connect-row" onClick={shareLink} style={{ width: '100%', textAlign: 'left', font: 'inherit', background: 'none', border: 'none', cursor: 'pointer' }}>
              <span className="sf-connect-icon">
                <Icon size={16}><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13" /></Icon>
              </span>
              <span style={{ flex: 1 }}>{copied ? 'Link copied' : 'Share this storefront'}</span>
            </button>
          </div>
        </div>
      </section>

      {creatorIsPro && (
        <section id="services" className="sf-reveal" style={{ ...WRAP, paddingTop: 64, scrollMarginTop: 76 }}>
          <h2 style={H2}>Additional Services</h2>
          <p style={{ margin: '8px 0 20px', fontSize: 15, color: '#6F5846' }}>
            {isSelf
              ? 'Preview: this is how visitors see your Additional Services.'
              : `Personal requests held between you and ${firstName}, not part of the offerings above.`}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 270px), 1fr))', gap: 18 }}>
            {SERVICES.map((service) => (
              <div key={service.key} className="sf-service">
                <div style={{ width: 46, height: 46, borderRadius: 14, background: '#F1E4D3', color: 'var(--brown)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {service.icon}
                </div>
                <div className="serif" style={{ fontSize: 18, fontWeight: 700 }}>{service.title}</div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: '#6F5846', flex: 1 }}>{service.description}</div>
                {isSelf ? (
                  <span
                    className="btn btn-outline btn-small"
                    title="Visitors see this button linked to a request page — you can't request from yourself"
                    style={{ alignSelf: 'flex-start', opacity: 0.55, cursor: 'default', pointerEvents: 'none' }}
                  >
                    Request
                  </span>
                ) : (
                  <a href={`/creator/${handle}/${service.routeSuffix}`} className="btn btn-primary btn-small" style={{ alignSelf: 'flex-start' }}>
                    Request
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Closing call to action, for visitors who are not signed in */}
      {!session && !isSelf && (
        <section className="sf-reveal" style={{ ...WRAP, marginTop: 72 }}>
          <div style={{ borderRadius: 28, background: 'linear-gradient(160deg, #2E1B10 0%, #4A2E1C 100%)', padding: 'clamp(32px, 5vw, 56px) clamp(20px, 4vw, 48px)', textAlign: 'center' }}>
            <h2 className="serif" style={{ margin: 0, fontSize: 'clamp(26px, 3.4vw, 36px)', fontWeight: 700, color: '#FBF6EF', textWrap: 'balance' }}>
              Ready to get started with {firstName}?
            </h2>
            <p style={{ margin: '12px auto 0', maxWidth: 520, fontSize: 16, lineHeight: 1.6, color: '#E8CDA8' }}>
              Make a free account in a minute. There is no membership fee, and everything you get waits for you in your library.
            </p>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Link
                href={`/login?tab=signup&path=buyer&next=${encodeURIComponent(`/creator/${handle}`)}`}
                className="btn"
                style={{ background: '#C8923F', color: '#2E1B10', minHeight: 50, padding: '0 28px', fontWeight: 700 }}
              >
                Create a free account
              </Link>
              {offerings.length > 0 && (
                <a href="#shop" onClick={goTo('shop')} className="btn" style={{ border: '1.5px solid rgba(251,246,239,0.5)', color: '#FBF6EF', minHeight: 50 }}>
                  Back to the offerings
                </a>
              )}
            </div>
          </div>
        </section>
      )}
      <div style={{ height: 64 }} />
    </div>
  );
}

function Cover({ offering, ratio = '16 / 9' }) {
  const cover = coverUrl(offering.cover_path);
  const meta = OFFERING_TYPE_BY_KEY[offering.type];
  if (cover) return <CoverImage src={cover} alt={offering.title} ratio={ratio} />;
  return (
    <div aria-hidden="true" style={{ aspectRatio: ratio, display: 'grid', placeItems: 'center', background: meta?.tint || '#F1E4D3', color: meta?.ink || '#6B4226' }}>
      <TypeIcon name={offering.type} size={44} />
    </div>
  );
}

function Rating({ stats }) {
  if (!stats || !(stats.review_count > 0)) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <StarRating value={Number(stats.avg_rating)} size={13} />
      <span className="muted" style={{ fontSize: 12 }}>{Number(stats.avg_rating).toFixed(1)} ({stats.review_count})</span>
    </div>
  );
}

function StoreCard({ offering, stats, index = 0 }) {
  const o = offering;
  const popular = (stats?.purchases_count || 0) >= 3;
  const extra = detailLine(o);
  const free = o.is_free_for_family || !o.price_cents;
  return (
    <Link href={`/offering/${o.id}`} className="rt-card sf-card sf-pop" style={{ height: '100%', animationDelay: `${Math.min(index, 9) * 40}ms` }}>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="sf-cover"><Cover offering={o} /></div>
        <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {popular && <span style={{ padding: '4px 10px', borderRadius: 999, background: '#C8923F', color: '#2E1B10', fontSize: 11, fontWeight: 800, letterSpacing: '0.05em' }}>POPULAR</span>}
          {o.status !== 'published' && <span style={{ padding: '4px 10px', borderRadius: 999, background: '#2E1B10', color: '#FBF6EF', fontSize: 11, fontWeight: 800, letterSpacing: '0.05em' }}>DRAFT</span>}
        </div>
      </div>
      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <span className="type-pill" style={{ alignSelf: 'flex-start' }}>{(OFFERING_TYPE_LABELS[o.type] || o.type).toUpperCase()}</span>
        <div className="serif" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.3 }}>{o.title}</div>
        {o.description && (
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#6F5846', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{o.description}</div>
        )}
        {extra && <div className="muted" style={{ fontSize: 12.5 }}>{extra}</div>}
        <Rating stats={stats} />
        <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px 8px', minWidth: 0 }}>
            <span className="serif" style={{ fontWeight: 700, fontSize: 22, color: 'var(--brown)' }}>{priceText(o)}</span>
            <SaleTag offering={o} />
          </span>
          <span className="sf-go">
            {o.type === 'call' ? 'Book' : free ? 'Get it free' : 'Get it'}
            <Icon size={15}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>
          </span>
        </div>
      </div>
    </Link>
  );
}

function FeaturedCard({ offering, stats }) {
  const o = offering;
  const bought = stats?.purchases_count || 0;
  const free = o.is_free_for_family || !o.price_cents;
  const extra = detailLine(o);
  return (
    <Link
      href={`/offering/${o.id}`}
      className="rt-card sf-card"
      style={{ flexDirection: 'row', flexWrap: 'wrap', borderRadius: 28, borderColor: '#E8CDA8', boxShadow: '0 14px 40px rgba(46,27,16,0.08)' }}
    >
      <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', overflow: 'hidden' }}>
        <div className="sf-cover" style={{ width: '100%' }}><Cover offering={o} /></div>
      </div>
      <div style={{ flex: '1 1 340px', minWidth: 0, padding: 'clamp(22px, 3vw, 40px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ padding: '4px 12px', borderRadius: 999, background: '#C8923F', color: '#2E1B10', fontSize: 11.5, fontWeight: 800, letterSpacing: '0.08em' }}>
            {bought > 0 ? 'MOST POPULAR' : 'START HERE'}
          </span>
          <span className="type-pill">{(OFFERING_TYPE_LABELS[o.type] || o.type).toUpperCase()}</span>
        </div>
        <div className="serif" style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' }}>{o.title}</div>
        {o.description && (
          <div style={{ fontSize: 15.5, lineHeight: 1.65, color: '#6F5846', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{o.description}</div>
        )}
        {extra && <div className="muted" style={{ fontSize: 13 }}>{extra}</div>}
        <Rating stats={stats} />
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 12px' }}>
            <span className="serif" style={{ fontWeight: 700, fontSize: 34, color: 'var(--brown)' }}>{priceText(o)}</span>
            <SaleTag offering={o} size={16} />
          </span>
          <span className="sf-go sf-go-lg">
            {o.type === 'call' ? 'Book now' : free ? 'Get it free' : 'Get it now'}
            <Icon size={17}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>
          </span>
        </div>
      </div>
    </Link>
  );
}
