'use client';

import { useEffect, useMemo, useState } from 'react';
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

  const filteredOfferings = useMemo(
    () => (tab === 'all' ? offerings : offerings.filter((o) => o.type === tab)),
    [offerings, tab],
  );

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

  const toggleFollow = async () => {
    if (!session) {
      router.push(`/login?tab=signup&path=buyer&next=${encodeURIComponent(`/creator/${handle}`)}`);
      return;
    }
    setFollowBusy(true);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_auth_id', session.user.id).eq('followee_auth_id', storefront.auth_user_id);
      setIsFollowing(false);
    } else {
      await supabase.from('follows').insert({ follower_auth_id: session.user.id, followee_auth_id: storefront.auth_user_id });
      setIsFollowing(true);
    }
    setFollowBusy(false);
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingBlock: '48px' }}>
        <div className="skeleton" style={{ height: 320 }} />
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
  const hasReviews = reviews.length > 0;

  return (
    <div style={{ background: 'var(--cream)' }}>
      {/* Hero */}
      <section
        style={{
          position: 'relative',
          color: '#FBF6EF',
          background: banner ? `center / cover no-repeat url("${banner}")` : 'linear-gradient(160deg, #6B4226 0%, #8C6A4A 100%)',
        }}
      >
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(46,27,16,0.22) 0%, rgba(46,27,16,0.9) 100%)' }} />
        <div style={{ ...WRAP, position: 'relative', paddingTop: 'clamp(110px, 17vw, 190px)', paddingBottom: 36, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, flexWrap: 'wrap', minWidth: 0, flex: '1 1 480px' }}>
            {avatar ? (
              <div style={{ width: 112, height: 112, borderRadius: 999, flexShrink: 0, border: '4px solid #FBF6EF', background: `center / cover no-repeat url("${avatar}")`, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} />
            ) : (
              <div className="avatar" style={{ width: 112, height: 112, fontSize: 34, border: '4px solid #FBF6EF', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                {initialsFor(profile.name)}
              </div>
            )}
            <div style={{ minWidth: 0, flex: '1 1 280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 className="serif" style={{ margin: 0, fontSize: 'clamp(30px, 4.4vw, 46px)', lineHeight: 1.08, fontWeight: 700, letterSpacing: '-0.015em' }}>{profile.name}</h1>
                <span title="Approved creator" style={{ color: '#C8923F', display: 'flex' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="rgba(46,27,16,0.4)" strokeWidth="1">
                    <path d="M12 2l2.4 2.1 3.1-.6.9 3 2.6 1.7-1 3 1 3-2.6 1.7-.9 3-3.1-.6L12 22l-2.4-2.1-3.1.6-.9-3-2.6-1.7 1-3-1-3 2.6-1.7.9-3 3.1.6z" />
                  </svg>
                </span>
                {creatorIsPro && <ProBadge />}
              </div>
              <div style={{ marginTop: 6, fontSize: 15, color: '#E8CDA8', fontWeight: 600 }}>{ROLE_LABELS[profile.role] || profile.role}</div>
              {storefront.tagline && (
                <p style={{ margin: '12px 0 0', maxWidth: 560, fontSize: 17, lineHeight: 1.5, color: 'rgba(251,246,239,0.92)' }}>{storefront.tagline}</p>
              )}
              <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {reviewStats.review_count > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: 'rgba(251,246,239,0.14)', fontSize: 13, fontWeight: 600 }}>
                    <StarRating value={Number(reviewStats.avg_rating)} size={13} />
                    {Number(reviewStats.avg_rating).toFixed(1)} ({reviewStats.review_count})
                  </span>
                )}
                <span style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(251,246,239,0.14)', fontSize: 13, fontWeight: 600 }}>{stats.offerings_count ?? 0} offerings</span>
                {(stats.students_count ?? 0) > 0 && (
                  <span style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(251,246,239,0.14)', fontSize: 13, fontWeight: 600 }}>{stats.students_count} students</span>
                )}
                {yearsActive !== null && (
                  <span style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(251,246,239,0.14)', fontSize: 13, fontWeight: 600 }}>{yearsActive} {yearsActive === 1 ? 'year' : 'years'} on Rooted Together</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {offerings.length > 0 && (
              <a href="#shop" className="btn" style={{ background: '#C8923F', color: '#2E1B10', minHeight: 50, padding: '0 28px', fontWeight: 700 }}>
                Shop now
              </a>
            )}
            {isSelf ? (
              <Link href="/dashboard/branding" className="btn" style={{ border: '1.5px solid rgba(251,246,239,0.6)', color: '#FBF6EF', minHeight: 50 }}>
                Edit storefront
              </Link>
            ) : (
              <button
                onClick={toggleFollow}
                disabled={followBusy}
                className="btn"
                style={{ border: '1.5px solid rgba(251,246,239,0.6)', color: '#FBF6EF', background: isFollowing ? 'rgba(251,246,239,0.18)' : 'transparent', minHeight: 50 }}
              >
                {isFollowing ? 'Following ✓' : 'Follow'}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Why buy here */}
      <section aria-label="Why buy here" style={{ background: '#F1E4D3' }}>
        <div style={{ ...WRAP, paddingBlock: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px 24px' }}>
          {TRUST.map((t) => (
            <div key={t.text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 600 }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, flex: 'none', borderRadius: 12, background: '#fff', color: 'var(--brown)' }}>
                <Icon size={18}>{t.icon}</Icon>
              </span>
              {t.text}
            </div>
          ))}
        </div>
      </section>

      {isSelf && (
        <div style={{ ...WRAP, paddingTop: 20 }}>
          <div style={{ padding: '12px 18px', borderRadius: 14, background: '#fff', border: '1px dashed #C8923F', fontSize: 13.5, color: '#6F5846' }}>
            You are looking at your own storefront, the way customers see it. Drafts show here for you only.
          </div>
        </div>
      )}

      {/* Featured */}
      {featured && (
        <section style={{ ...WRAP, paddingTop: 48 }}>
          <FeaturedCard offering={featured} stats={offeringStats[featured.id]} />
        </section>
      )}

      {/* Shop */}
      <section id="shop" style={{ ...WRAP, paddingTop: 56, scrollMarginTop: 16 }}>
        <h2 style={H2}>Shop {firstName}&rsquo;s offerings</h2>
        <p style={{ margin: '8px 0 0', fontSize: 15.5, color: '#6F5846' }}>Pick what speaks to you. You can check out in under a minute.</p>

        {offerings.length > 1 && (
          <div role="group" aria-label="Filter by type" style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TYPE_TABS.map((t) => {
              const count = t === 'all' ? offerings.length : offerings.filter((o) => o.type === t).length;
              // Only show types this creator actually sells.
              if (t !== 'all' && count === 0) return null;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  aria-pressed={tab === t}
                  className={tab === t ? 'btn btn-primary btn-small' : 'btn btn-outline btn-small'}
                >
                  {t === 'all' ? `All (${count})` : `${OFFERING_TYPE_LABELS[t]} (${count})`}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          {filteredOfferings.length === 0 && <div className="muted">Nothing here yet — check back soon.</div>}
          {filteredOfferings.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))', gap: 22 }}>
              {filteredOfferings.map((o) => (
                <StoreCard key={o.id} offering={o} stats={offeringStats[o.id]} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Spiritual Family */}
      {(isFamily || freeCount > 0) && (
        <section style={{ ...WRAP, paddingTop: 40 }}>
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
        <section style={{ ...WRAP, paddingTop: 64 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 28px', marginBottom: 24 }}>
            <h2 style={H2}>What students are saying</h2>
            {reviewStats.review_count > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999, background: '#fff', border: '1px solid #EADBC8', fontSize: 14, fontWeight: 700 }}>
                <StarRating value={Number(reviewStats.avg_rating)} size={15} />
                {Number(reviewStats.avg_rating).toFixed(1)}
                <span className="muted" style={{ fontWeight: 500 }}>from {reviewStats.review_count} {reviewStats.review_count === 1 ? 'review' : 'reviews'}</span>
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 18 }}>
            {reviews.map((r) => (
              <figure key={r.id} style={{ margin: 0, padding: 22, borderRadius: 22, background: '#fff', border: '1px solid #EADBC8', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <StarRating value={r.rating} size={14} />
                {r.body && <blockquote style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>{r.body}</blockquote>}
                <figcaption className="muted" style={{ fontSize: 12.5, marginTop: 'auto' }}>
                  {r.reviewer_name}, on {r.offering_title}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* About */}
      <section style={{ ...WRAP, paddingTop: 64 }}>
        <div className="responsive-2col" style={{ '--col-a': '2fr', '--col-b': '1fr', '--col-gap': '36px', alignItems: 'start' }}>
          <div>
            <h2 style={H2}>About {firstName}</h2>
            <div style={{ marginTop: 14, fontSize: 16, color: 'var(--text)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
              {aboutText || 'This creator hasn’t written their story yet.'}
            </div>
          </div>
          <div style={{ padding: 22, borderRadius: 22, background: '#fff', border: '1px solid #EADBC8', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--brown)', marginBottom: 8 }}>Connect with {firstName}</div>
            {socials.map((so) => (
              <a
                key={so.key}
                href={so.href}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 14.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, minHeight: 48 }}
              >
                <span style={{ width: 36, height: 36, borderRadius: 999, flexShrink: 0, border: '1px solid rgba(107,66,38,0.16)', color: 'var(--brown)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {so.icon}
                </span>
                <span style={{ minWidth: 0 }}>{so.label} →</span>
              </a>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 48 }}>
              <span style={{ width: 36, height: 36, borderRadius: 999, flexShrink: 0, border: '1px solid rgba(107,66,38,0.16)', color: 'var(--brown)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16}><path d="M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></Icon>
              </span>
              <span style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.35 }}>
                Message in the Rooted Together app
                <span className="muted" style={{ display: 'block', fontSize: 12.5, fontWeight: 500 }}>Get the app to send {firstName} a message.</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {creatorIsPro && (
        <section style={{ ...WRAP, paddingTop: 64 }}>
          <h2 style={H2}>Additional Services</h2>
          <p style={{ margin: '8px 0 20px', fontSize: 15, color: '#6F5846' }}>
            {isSelf
              ? 'Preview: this is how visitors see your Additional Services.'
              : `Personal requests held between you and ${firstName}, not part of the offerings above.`}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 270px), 1fr))', gap: 18 }}>
            {SERVICES.map((service) => (
              <div key={service.key} style={{ padding: 24, borderRadius: 22, background: '#fff', border: '1px solid #EADBC8', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        <section style={{ marginTop: 72, background: '#2E1B10' }}>
          <div style={{ ...WRAP, paddingBlock: 56, textAlign: 'center' }}>
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
                <a href="#shop" className="btn" style={{ border: '1.5px solid rgba(251,246,239,0.5)', color: '#FBF6EF', minHeight: 50 }}>
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

function StoreCard({ offering, stats }) {
  const o = offering;
  const popular = (stats?.purchases_count || 0) >= 3;
  const extra = detailLine(o);
  const free = o.is_free_for_family || !o.price_cents;
  return (
    <Link href={`/offering/${o.id}`} className="rt-card" style={{ height: '100%' }}>
      <div style={{ position: 'relative' }}>
        <Cover offering={o} />
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
          <span className="serif" style={{ fontWeight: 700, fontSize: 22, color: 'var(--brown)' }}>{priceText(o)}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40, padding: '0 16px', borderRadius: 999, background: 'var(--brown)', color: '#FBF6EF', fontSize: 14, fontWeight: 700 }}>
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
      className="rt-card"
      style={{ flexDirection: 'row', flexWrap: 'wrap', borderRadius: 28, borderColor: '#E8CDA8', boxShadow: '0 14px 40px rgba(46,27,16,0.08)' }}
    >
      <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex' }}>
        <div style={{ width: '100%' }}><Cover offering={o} /></div>
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
          <span className="serif" style={{ fontWeight: 700, fontSize: 34, color: 'var(--brown)' }}>{priceText(o)}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 52, padding: '0 28px', borderRadius: 999, background: 'var(--brown)', color: '#FBF6EF', fontSize: 16, fontWeight: 700 }}>
            {o.type === 'call' ? 'Book now' : free ? 'Get it free' : 'Get it now'}
            <Icon size={17}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>
          </span>
        </div>
      </div>
    </Link>
  );
}
