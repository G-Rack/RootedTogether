'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { bannerUrl, avatarUrl } from '@/lib/storage';
import { initialsFor, ROLE_LABELS, OFFERING_TYPE_LABELS } from '@/lib/roles';
import OfferingCard from '@/components/OfferingCard';
import StarRating from '@/components/StarRating';
import ShareButtons from '@/components/ShareButtons';
import { fetchCreatorReviewStats, fetchCreatorReviews } from '@/lib/reviews';

const TYPE_TABS = ['all', 'course', 'ebook', 'routine', 'call'];

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

export default function CreatorStorefrontClient() {
  const { handle } = useParams();
  const router = useRouter();
  const { session } = useSession();
  const [storefront, setStorefront] = useState(null);
  const [profile, setProfile] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [isFamily, setIsFamily] = useState(false);
  const [stats, setStats] = useState({ offerings_count: 0, students_count: 0 });
  const [reviewStats, setReviewStats] = useState({ review_count: 0, avg_rating: 0 });
  const [reviews, setReviews] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
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

      const [{ data: prof }, offeringsRes, familyRes, statsRes, followRes, reviewStatsRes, reviewsRes] = await Promise.all([
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
      ]);

      if (!active) return;
      setProfile(prof || null);
      setOfferings(offeringsRes.data || []);
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

  const [now] = useState(() => Date.now());
  const yearsActive = useMemo(() => {
    if (!profile?.created_at) return null;
    const years = (now - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365);
    return years < 1 ? '<1' : Math.floor(years);
  }, [profile, now]);

  const toggleFollow = async () => {
    if (!session) {
      router.push('/login');
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
        <div className="skeleton" style={{ height: 220 }} />
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
  const freeCount = offerings.filter((o) => o.is_free_for_family && o.status === 'published').length;
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div>
      <div
        style={{
          height: 220,
          background: banner ? `center / cover no-repeat url(${banner})` : 'linear-gradient(160deg, var(--brown) 0%, var(--brown-light) 100%)',
        }}
      />
      <div className="container" style={{ paddingBlock: '0 64px' }}>
        {/* The avatar overlaps the banner via `transform` (not margin), so
            it never affects — or is affected by — the height of the name
            block next to it: however tall that block gets (extra review
            line, longer name), it always starts safely below the banner. */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, paddingTop: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
            {avatar ? (
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 999,
                  flexShrink: 0,
                  border: '4px solid var(--cream)',
                  background: `center / cover no-repeat url(${avatar})`,
                  transform: 'translateY(-56px)',
                }}
              />
            ) : (
              <div className="avatar" style={{ width: 96, height: 96, fontSize: 30, border: '4px solid var(--cream)', transform: 'translateY(-56px)' }}>
                {initialsFor(profile.name)}
              </div>
            )}
            <div style={{ paddingBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{profile.name}</div>
                <span title="Approved creator" style={{ color: 'var(--brown)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="var(--cream)" strokeWidth="1.2">
                    <path d="M12 2l2.4 2.1 3.1-.6.9 3 2.6 1.7-1 3 1 3-2.6 1.7-.9 3-3.1-.6L12 22l-2.4-2.1-3.1.6-.9-3-2.6-1.7 1-3-1-3 2.6-1.7.9-3 3.1.6z" />
                  </svg>
                </span>
              </div>
              <div className="muted" style={{ fontSize: 13.5 }}>{ROLE_LABELS[profile.role] || profile.role}</div>
              {reviewStats.review_count > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <StarRating value={Number(reviewStats.avg_rating)} size={13} />
                  <span className="muted" style={{ fontSize: 12 }}>
                    {Number(reviewStats.avg_rating).toFixed(1)} ({reviewStats.review_count})
                  </span>
                </div>
              )}
            </div>
          </div>

          {!isSelf && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10 }}>
              <button
                onClick={toggleFollow}
                disabled={followBusy}
                className={isFollowing ? 'btn btn-outline' : 'btn btn-primary'}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <span className="muted" title="Message from the Rooted Together app" style={{ fontSize: 12.5, border: '1px solid rgba(107,66,38,0.14)', borderRadius: 999, padding: '10px 18px' }}>
                Message in the app
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 40, marginTop: 22, paddingBottom: 22, borderBottom: '1px solid rgba(107,66,38,0.1)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Stat value={stats.offerings_count ?? 0} label="offerings" />
          <Stat value={stats.students_count ?? 0} label="students" />
          {yearsActive !== null && <Stat value={yearsActive} label="years on Rooted Together" />}
          <div style={{ marginLeft: 'auto' }}>
            <ShareButtons url={pageUrl} title={`${profile.name} on Rooted Together`} />
          </div>
        </div>

        <div className="responsive-2col" style={{ '--col-a': '2fr', '--col-b': '1fr', '--col-gap': '40px', padding: '32px 0' }}>
          <div>
            <div className="serif" style={{ fontSize: 19, fontWeight: 700, color: 'var(--brown)', marginBottom: 12 }}>
              About {profile.name.split(' ')[0]}
            </div>
            <div style={{ fontSize: 14.5, color: 'var(--text)', lineHeight: 1.7 }}>
              {storefront.bio || profile.story || 'This creator hasn’t written their story yet.'}
            </div>
          </div>
          {(storefront.instagram_url || storefront.website_url) && (
            <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, alignSelf: 'start' }}>
              <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Connect</div>
              {storefront.instagram_url && (
                <a href={storefront.instagram_url} target="_blank" rel="noreferrer" style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Instagram →
                </a>
              )}
              {storefront.website_url && (
                <a href={storefront.website_url} target="_blank" rel="noreferrer" style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Website →
                </a>
              )}
            </div>
          )}
        </div>

        {isFamily ? (
          <div className="success-banner" style={{ marginBottom: 32 }}>
            You&rsquo;re part of {profile.name.split(' ')[0]}&rsquo;s Spiritual Family — anything marked
            &ldquo;Free for family&rdquo; below is already unlocked for you.
          </div>
        ) : freeCount > 0 ? (
          <div
            style={{
              background: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              borderRadius: 14,
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: 32,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--success-text)' }}>
              {freeCount} {freeCount === 1 ? 'piece' : 'pieces'} shared free with {profile.name.split(' ')[0]}&rsquo;s Spiritual Family
            </div>
            <div className="muted" style={{ fontSize: 12 }}>Request to join her Spiritual Family from the Rooted Together app.</div>
          </div>
        ) : null}

        <div style={{ paddingBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, borderBottom: '1px solid rgba(107,66,38,0.1)', marginBottom: 24, flexWrap: 'wrap' }}>
            {TYPE_TABS.map((t) => {
              const count = t === 'all' ? offerings.length : offerings.filter((o) => o.type === t).length;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 14.5,
                    fontWeight: tab === t ? 700 : 400,
                    color: tab === t ? 'var(--brown)' : 'var(--text-soft)',
                    paddingBottom: 12,
                    borderBottom: tab === t ? '2px solid var(--brown)' : 'none',
                  }}
                >
                  {t === 'all' ? `All (${count})` : `${OFFERING_TYPE_LABELS[t]} (${count})`}
                </button>
              );
            })}
          </div>

          {filteredOfferings.length === 0 && <div className="muted">Nothing here yet — check back soon.</div>}

          {filteredOfferings.length > 0 && (
            <div className="grid-cards">
              {filteredOfferings.map((o) => (
                <OfferingCard key={o.id} offering={o} />
              ))}
            </div>
          )}
        </div>

        <div style={{ paddingBottom: 56 }}>
          <div className="serif" style={{ fontSize: 19, fontWeight: 700, color: 'var(--brown)', marginBottom: 16 }}>
            What students are saying
          </div>
          {reviews.length === 0 ? (
            <div className="muted" style={{ fontSize: 13.5 }}>No reviews yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
              {reviews.map((r) => (
                <div key={r.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <StarRating value={r.rating} size={13} />
                  {r.body && <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6 }}>{r.body}</div>}
                  <div className="muted" style={{ fontSize: 12 }}>
                    {r.reviewer_name} — on {r.offering_title}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {(
          <div style={{ paddingBottom: 64 }}>
            <div className="serif" style={{ fontSize: 19, fontWeight: 700, color: 'var(--brown)', marginBottom: 6 }}>
              Additional Services
            </div>
            <div className="muted" style={{ fontSize: 13.5, marginBottom: 20 }}>
              {isSelf
                ? 'Preview: this is how visitors see your Additional Services.'
                : `Personal requests held between you and ${profile.name.split(' ')[0]} — not part of the offerings above.`}
            </div>
            <div className="grid-cards">
              {SERVICES.map((service) => (
                <div key={service.key} className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      background: 'var(--cream-dark)',
                      color: 'var(--brown)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {service.icon}
                  </div>
                  <div className="serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{service.title}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-soft)', flex: 1 }}>{service.description}</div>
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
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--brown)' }}>{value}</span>{' '}
      <span className="muted" style={{ fontSize: 13 }}>{label}</span>
    </div>
  );
}
