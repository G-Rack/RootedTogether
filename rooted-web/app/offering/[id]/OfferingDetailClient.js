'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { coverUrl, avatarUrl } from '@/lib/storage';
import { initialsFor, formatPrice, OFFERING_TYPE_LABELS } from '@/lib/roles';
import StarRating from '@/components/StarRating';
import ShareButtons from '@/components/ShareButtons';
import { fetchOfferingReviewStats, fetchOfferingReviews, fetchMyReview, submitReview, deleteReview } from '@/lib/reviews';

export default function OfferingDetailClient() {
  const { id } = useParams();
  const router = useRouter();
  const { session } = useSession();

  const [offering, setOffering] = useState(null);
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [storefront, setStorefront] = useState(null);
  const [isFamily, setIsFamily] = useState(false);
  const [purchase, setPurchase] = useState(null);
  const [contentUrl, setContentUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [buying, setBuying] = useState(false);
  const [tab, setTab] = useState('description');

  const [reviewStats, setReviewStats] = useState({ review_count: 0, avg_rating: 0 });
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: o } = await supabase.from('offerings').select('*').eq('id', id).maybeSingle();
      if (!active) return;
      if (!o) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setOffering(o);

      const [{ data: prof }, { data: sf }, familyRes, purchaseRes] = await Promise.all([
        supabase.from('creator_public_profiles').select('*').eq('auth_user_id', o.creator_auth_id).maybeSingle(),
        supabase.from('creator_storefronts').select('handle, avatar_path').eq('auth_user_id', o.creator_auth_id).maybeSingle(),
        session ? supabase.rpc('is_accepted_family_member_of_creator', { creator_id: o.creator_auth_id }) : Promise.resolve({ data: false }),
        session
          ? supabase.from('offering_purchases').select('*').eq('offering_id', o.id).eq('buyer_auth_id', session.user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (!active) return;
      setCreatorProfile(prof || null);
      setStorefront(sf || null);
      setIsFamily(!!familyRes.data);
      setPurchase(purchaseRes.data || null);

      if (purchaseRes.data) {
        const { data: contentRow } = await supabase.from('offering_content').select('content_url').eq('offering_id', o.id).maybeSingle();
        if (active) setContentUrl(contentRow?.content_url || null);
      }

      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [id, session]);

  useEffect(() => {
    if (!offering) return;
    let active = true;
    async function loadReviews() {
      const [stats, list, mine] = await Promise.all([
        fetchOfferingReviewStats(offering.id),
        fetchOfferingReviews(offering.id),
        fetchMyReview(offering.id, session?.user?.id),
      ]);
      if (!active) return;
      setReviewStats(stats);
      setReviews(list);
      setMyReview(mine);
      setReviewsLoaded(true);
    }
    loadReviews();
    return () => {
      active = false;
    };
  }, [offering, session]);

  const handleBuy = async () => {
    if (!session) {
      router.push('/login');
      return;
    }
    setError('');
    setBuying(true);
    const pricePaid = offering.is_free_for_family && isFamily ? 0 : offering.price_cents;
    const { error: insertError } = await supabase.from('offering_purchases').insert({
      offering_id: offering.id,
      buyer_auth_id: session.user.id,
      price_paid_cents: pricePaid,
    });
    setBuying(false);
    if (insertError) {
      setError("Couldn't complete that — please try again.");
      return;
    }
    const { data: fresh } = await supabase.from('offering_purchases').select('*').eq('offering_id', offering.id).eq('buyer_auth_id', session.user.id).maybeSingle();
    setPurchase(fresh);
    const { data: contentRow } = await supabase.from('offering_content').select('content_url').eq('offering_id', offering.id).maybeSingle();
    setContentUrl(contentRow?.content_url || null);
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingBlock: '48px' }}>
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container" style={{ paddingBlock: '96px', textAlign: 'center' }}>
        <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)' }}>
          We couldn&rsquo;t find that offering.
        </div>
      </div>
    );
  }

  const isCall = offering.type === 'call';
  const alreadyOwned = !!purchase;
  const freeForYou = offering.is_free_for_family && isFamily;
  const cover = coverUrl(offering.cover_path);
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="container" style={{ paddingBlock: '28px 64px' }}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
        <Link href="/">Marketplace</Link>
        {storefront && (
          <>
            {' '}/{' '}
            <Link href={`/creator/${storefront.handle}`}>{creatorProfile?.name}</Link>
          </>
        )}
        {' '}/ {offering.title}
      </div>

      <div className="responsive-2col" style={{ '--col-a': '1fr', '--col-b': '380px', '--col-gap': '44px' }}>
        {/* Main */}
        <div>
          <span className="badge">{(OFFERING_TYPE_LABELS[offering.type] || offering.type).toUpperCase()}</span>
          <div className="serif" style={{ fontSize: 32, fontWeight: 700, color: 'var(--brown)', marginTop: 12, lineHeight: 1.25 }}>
            {offering.title}
          </div>

          {reviewsLoaded && reviewStats.review_count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <StarRating value={Number(reviewStats.avg_rating)} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{Number(reviewStats.avg_rating).toFixed(1)}</span>
              <span className="muted" style={{ fontSize: 12.5 }}>
                ({reviewStats.review_count} {reviewStats.review_count === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}

          {creatorProfile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              {avatarUrl(storefront?.avatar_path) ? (
                <div
                  style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, background: `center / cover no-repeat url(${avatarUrl(storefront.avatar_path)})` }}
                />
              ) : (
                <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                  {initialsFor(creatorProfile.name)}
                </div>
              )}
              {storefront ? (
                <Link href={`/creator/${storefront.handle}`} style={{ fontSize: 13.5, fontWeight: 700 }}>
                  {creatorProfile.name}
                </Link>
              ) : (
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{creatorProfile.name}</span>
              )}
            </div>
          )}

          {cover && !isCall && (
            <div style={{ marginTop: 22, borderRadius: 16, overflow: 'hidden', height: 280, background: `center / cover no-repeat url(${cover})` }} />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 24, paddingBottom: 16, borderBottom: '1px solid rgba(107,66,38,0.1)' }}>
            <button
              onClick={() => setTab('description')}
              style={{
                background: 'none', border: 'none', fontSize: 14.5, fontWeight: 700,
                color: tab === 'description' ? 'var(--brown)' : 'var(--text-soft)',
                paddingBottom: 12, borderBottom: tab === 'description' ? '2px solid var(--brown)' : 'none',
              }}
            >
              Description
            </button>
            <button
              onClick={() => setTab('reviews')}
              style={{
                background: 'none', border: 'none', fontSize: 14.5, fontWeight: 700,
                color: tab === 'reviews' ? 'var(--brown)' : 'var(--text-soft)',
                paddingBottom: 12, borderBottom: tab === 'reviews' ? '2px solid var(--brown)' : 'none',
              }}
            >
              Reviews{reviewStats.review_count > 0 ? ` (${reviewStats.review_count})` : ''}
            </button>
          </div>

          {tab === 'description' ? (
            <div style={{ fontSize: 14.5, color: 'var(--text)', lineHeight: 1.75, marginTop: 22, whiteSpace: 'pre-wrap' }}>
              {offering.description}
            </div>
          ) : (
            <ReviewsPanel
              key={myReview?.id || 'new'}
              offering={offering}
              session={session}
              alreadyOwned={alreadyOwned}
              reviews={reviews}
              myReview={myReview}
              onChanged={async () => {
                const [stats, list, mine] = await Promise.all([
                  fetchOfferingReviewStats(offering.id),
                  fetchOfferingReviews(offering.id),
                  fetchMyReview(offering.id, session?.user?.id),
                ]);
                setReviewStats(stats);
                setReviews(list);
                setMyReview(mine);
              }}
            />
          )}

          {isCall && offering.call_duration_minutes && (
            <div style={{ display: 'flex', gap: 24, marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                {offering.call_duration_minutes} minutes
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                Video call — link sent after payment
              </div>
            </div>
          )}

          {isCall && (
            <div style={{ marginTop: 32 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Choose a time</div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
                Real scheduling, powered by Calendly — connected directly by {creatorProfile?.name || 'the creator'}.
              </div>
              {offering.calendly_url ? (
                <CalendlyEmbed url={offering.calendly_url} />
              ) : (
                <div className="card muted" style={{ padding: 24, fontSize: 13.5 }}>
                  This creator hasn&rsquo;t connected a Calendly link yet.
                </div>
              )}
            </div>
          )}

          {!isCall && alreadyOwned && (
            <div className="success-banner" style={{ marginTop: 28 }}>
              {contentUrl ? (
                <>
                  You own this. <a href={contentUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>Open it here →</a>
                </>
              ) : (
                'You own this — the creator hasn’t attached content yet.'
              )}
            </div>
          )}

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(107,66,38,0.1)' }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
              Share this
            </div>
            <ShareButtons url={pageUrl} title={offering.title} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="card sticky-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--brown)' }}>
            {freeForYou ? 'Free' : formatPrice(offering.price_cents)}
          </div>

          {offering.is_free_for_family && (
            <div className="muted" style={{ fontSize: 12 }}>
              {isFamily ? 'Free because you’re part of this Spiritual Family.' : 'Free to this creator’s Spiritual Family — request to join in the app to unlock it.'}
            </div>
          )}

          {error && <div className="error-banner">{error}</div>}

          {alreadyOwned ? (
            <div className="btn btn-outline" style={{ pointerEvents: 'none' }}>
              {isCall ? 'Booked' : 'Already yours'}
            </div>
          ) : (
            <button
              onClick={handleBuy}
              disabled={buying || (offering.is_free_for_family && !isFamily && !session)}
              className="btn btn-primary"
            >
              {buying ? 'Please wait…' : isCall ? 'Reserve & Pay' : 'Buy Now'}
            </button>
          )}

          <div className="muted" style={{ fontSize: 12, textAlign: 'center' }}>
            {isCall ? "You'll get a video call link by email after payment" : 'Test checkout — no real payment is taken yet.'}
          </div>

          <div style={{ height: 1, background: 'rgba(107,66,38,0.1)' }} />

          <FeatureList isCall={isCall} offering={offering} />

          {creatorProfile && (
            <>
              <div style={{ height: 1, background: 'rgba(107,66,38,0.1)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {avatarUrl(storefront?.avatar_path) ? (
                  <div
                    style={{ width: 34, height: 34, borderRadius: 999, flexShrink: 0, background: `center / cover no-repeat url(${avatarUrl(storefront.avatar_path)})` }}
                  />
                ) : (
                  <div className="avatar" style={{ width: 34, height: 34, fontSize: 13, flexShrink: 0 }}>
                    {initialsFor(creatorProfile.name)}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    {isCall ? `With ${creatorProfile.name}` : `Taught by ${creatorProfile.name}`}
                  </div>
                  {storefront && (
                    <Link href={`/creator/${storefront.handle}`} style={{ fontSize: 12 }}>
                      View storefront →
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewsPanel({ offering, session, alreadyOwned, reviews, myReview, onChanged }) {
  const [rating, setRating] = useState(myReview?.rating || 0);
  const [body, setBody] = useState(myReview?.body || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(!myReview);

  const save = async (e) => {
    e.preventDefault();
    if (!rating) {
      setError('Choose a star rating first.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await submitReview({ offeringId: offering.id, authUserId: session.user.id, rating, body });
      setEditing(false);
      await onChanged();
    } catch {
      setError("Couldn't save your review — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteReview(myReview.id);
      await onChanged();
    } catch {
      setError("Couldn't remove your review — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 22 }}>
      {alreadyOwned && session && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          {!editing && myReview ? (
            <div>
              <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
                Your review
              </div>
              <StarRating value={myReview.rating} />
              {myReview.body && <div style={{ fontSize: 13.5, color: 'var(--text)', marginTop: 8, lineHeight: 1.6 }}>{myReview.body}</div>}
              <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
                <button type="button" onClick={() => setEditing(true)} className="btn btn-outline btn-small">Edit</button>
                <button type="button" onClick={remove} disabled={busy} className="btn btn-outline btn-small">Remove</button>
              </div>
            </div>
          ) : (
            <form onSubmit={save}>
              <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
                {myReview ? 'Edit your review' : 'Leave a review'}
              </div>
              {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}
              <StarRating value={rating} size={22} onChange={setRating} />
              <textarea
                className="input-field"
                style={{ minHeight: 90, fontFamily: 'var(--sans)', marginTop: 12 }}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What was your experience? (optional)"
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button type="submit" disabled={busy} className="btn btn-primary btn-small">
                  {busy ? 'Saving…' : 'Save review'}
                </button>
                {myReview && (
                  <button type="button" onClick={() => setEditing(false)} className="btn btn-outline btn-small">Cancel</button>
                )}
              </div>
            </form>
          )}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="muted" style={{ fontSize: 13.5 }}>
          No reviews yet{alreadyOwned && session ? '' : ' — reviews open up once someone has purchased this.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ paddingBottom: 18, borderBottom: '1px solid rgba(107,66,38,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <StarRating value={r.rating} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{r.reviewer_name}</span>
              </div>
              {r.body && <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6 }}>{r.body}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeatureList({ isCall, offering }) {
  const items = isCall
    ? [
        `${offering.call_duration_minutes || 30}-minute video call, one on one`,
        'A private link is emailed to you after booking',
      ]
    : [
        'Instant access after purchase',
        offering.type === 'course' ? 'Self-paced — go at your own speed' : 'Yours to keep, no expiration',
      ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((text) => (
        <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B4226" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {text}
        </div>
      ))}
    </div>
  );
}

function CalendlyEmbed({ url }) {
  useEffect(() => {
    if (document.getElementById('calendly-widget-script')) return;
    const script = document.createElement('script');
    script.id = 'calendly-widget-script';
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div
      className="calendly-inline-widget"
      data-url={url}
      style={{ minWidth: 320, height: 700, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(107,66,38,0.12)' }}
    />
  );
}
