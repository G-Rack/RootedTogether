'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { coverUrl } from '@/lib/storage';
import { SITE_URL } from '@/lib/seo';
import { FUNCTIONS_URL, SUPABASE_ANON_KEY, GUEST_CHECKOUT } from '@/lib/config';
import { formatPrice, OFFERING_TYPE_LABELS } from '@/lib/roles';
import { fetchOfferingSummary } from '@/lib/lessons';
import { WhatYouGet, TrustLines, CreatorMini, StickyBuyBar, whatYouGetItems } from '@/components/OfferingExtras';
import StarRating from '@/components/StarRating';
import ShareButtons from '@/components/ShareButtons';
import CourseLessonsViewer from '@/components/CourseLessonsViewer';
import AudiobookPlayer from '@/components/AudiobookPlayer';
import CoverImage from '@/components/CoverImage';
import AuthGateModal from '@/components/AuthGateModal';
import SaleTag from '@/components/SaleTag';
import OriginalsTag from '@/components/OriginalsTag';
import FreePreview from '@/components/FreePreview';
import GiftEmailForm from '@/components/GiftEmailForm';
import { fetchOfferingReviewStats, fetchOfferingReviews, fetchMyReview, submitReview, deleteReview } from '@/lib/reviews';
import { trackPurchase, trackViewContent, trackBeginCheckout, getAttribution } from '@/lib/tracking';
import { track as trackSite } from '@/lib/analytics';

// The database lives in Sydney. Running the checkout function in that same region keeps its database
// calls short, which makes Buy Now about twice as fast. Used for the warm-up ping and the real call.
const CHECKOUT_FN_URL = `${FUNCTIONS_URL}/create-checkout-session?forceFunctionRegion=ap-southeast-2`;

// Files live on another domain (Supabase Storage), where a plain <a download>
// is ignored by the browser. Storage honours a ?download=<name> parameter that
// makes it send the file as an attachment, so the page stays put and the file
// just downloads. The upload step prefixes names with a timestamp; drop that.
function downloadUrlFor(url) {
  if (!url) return null;
  const base = url.split('?')[0];
  if (!base.includes('/storage/v1/object/')) return url;
  let name = 'download';
  try {
    name = decodeURIComponent(base.split('/').pop() || '').replace(/^\d{10,}-/, '') || 'download';
  } catch {}
  return `${base}?download=${encodeURIComponent(name)}`;
}

function startDownload(url) {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const subscribeNever = () => () => {};

// Calls up to this long are free once a week for the creator's Spiritual Family.
const FREE_CALL_MAX_MINUTES = 30;

export default function OfferingDetailClient({ initialOffering = null, initialCreator = null, initialStorefront = null }) {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useSession();

  // The page may arrive with the published offering already read on the server (see page.js).
  const seeded = initialOffering && initialOffering.id === id ? initialOffering : null;
  const [offering, setOffering] = useState(seeded);
  const [creatorProfile, setCreatorProfile] = useState(seeded ? initialCreator : null);
  const [storefront, setStorefront] = useState(seeded ? initialStorefront : null);
  const [isFamily, setIsFamily] = useState(false);
  const [purchase, setPurchase] = useState(null);
  const [contentUrl, setContentUrl] = useState(null);
  const [loading, setLoading] = useState(!seeded);
  // True once we know whether the signed-in person already owns this (so Buy never flashes for an owner).
  const [purchaseChecked, setPurchaseChecked] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [buying, setBuying] = useState(false);
  // "Almost there": signed-out visitors make a free account here instead of being sent away.
  const [gateOpen, setGateOpen] = useState(false);
  const [awaitingWebhook, setAwaitingWebhook] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [tab, setTab] = useState('description');
  // How many lessons a course has (set by the lesson list once it loads).
  const [courseLessonCount, setCourseLessonCount] = useState(0);
  // Free weekly call for Spiritual Family members (30-minute calls):
  // { is_member, claimed, booked, resets_on } from the free_call_status RPC.
  const [freeCall, setFreeCall] = useState(null);
  const [claiming, setClaiming] = useState(false);

  // What the course contains (lesson counts and total length), for the "What you get" list.
  const [summary, setSummary] = useState(null);
  // True only in the browser (false while the server builds the page), for things that depend on today's date or the visitor's locale.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  // Tracking and sticky-bar state: which buy buttons are on screen, and whether the visitor has scrolled yet.
  const [mainBuyEl, setMainBuyEl] = useState(null);
  const [bottomBuyEl, setBottomBuyEl] = useState(null);
  const [mainBuyVisible, setMainBuyVisible] = useState(true);
  const [bottomBuyVisible, setBottomBuyVisible] = useState(false);
  // True once the visitor has scrolled past the buy button at the bottom (the bar then stays out of the footer's way).
  const [bottomBuyPast, setBottomBuyPast] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const buyVisibleSent = useRef(false);

  const [reviewStats, setReviewStats] = useState({ review_count: 0, avg_rating: 0 });
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  const loadPurchaseAndContent = async (offeringRow, sessionObj) => {
    if (!sessionObj) {
      setPurchase(null);
      return null;
    }
    const { data: purchaseRow } = await supabase
      .from('offering_purchases')
      .select('*')
      .eq('offering_id', offeringRow.id)
      .eq('buyer_auth_id', sessionObj.user.id)
      .maybeSingle();
    setPurchase(purchaseRow || null);
    if (purchaseRow) {
      const { data: contentRow } = await supabase.from('offering_content').select('content_url').eq('offering_id', offeringRow.id).maybeSingle();
      setContentUrl(contentRow?.content_url || null);
    }
    return purchaseRow || null;
  };

  useEffect(() => {
    let active = true;

    async function load() {
      if (session) setPurchaseChecked(false);
      let o = seeded;
      if (!o) {
        const res = await supabase.from('offerings').select('*').eq('id', id).maybeSingle();
        o = res.data;
      }
      if (!active) return;
      if (!o) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setOffering(o);

      const [{ data: prof }, { data: sf }, familyRes] = await Promise.all([
        seeded ? Promise.resolve({ data: initialCreator }) : supabase.from('creator_public_profiles').select('*').eq('auth_user_id', o.creator_auth_id).maybeSingle(),
        seeded ? Promise.resolve({ data: initialStorefront }) : supabase.from('creator_storefronts').select('handle, avatar_path, bio, tagline').eq('auth_user_id', o.creator_auth_id).maybeSingle(),
        session ? supabase.rpc('is_accepted_family_member_of_creator', { creator_id: o.creator_auth_id }) : Promise.resolve({ data: false }),
      ]);

      if (!active) return;
      setCreatorProfile(prof || null);
      setStorefront(sf || null);
      setIsFamily(!!familyRes.data);
      await loadPurchaseAndContent(o, session);
      if (active) setPurchaseChecked(true);
      if (session && o.type === 'call' && o.call_duration_minutes > 0 && o.call_duration_minutes <= FREE_CALL_MAX_MINUTES) {
        const { data: fc } = await supabase.rpc('free_call_status', { p_creator_id: o.creator_auth_id });
        if (active) setFreeCall(fc || null);
      }

      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session]);

  // After a Stripe Checkout redirect back here, the webhook that actually
  // writes the offering_purchases row may not have landed yet — Stripe
  // sends the buyer back to success_url around the same time it fires the
  // webhook, not strictly after. Poll briefly rather than showing "you
  // don't own this" for a purchase that genuinely just succeeded.
  useEffect(() => {
    const purchaseParam = searchParams.get('purchase');
    if (purchaseParam === 'cancelled') {
      setNotice('Checkout was cancelled — you have not been charged.');
      return;
    }
    if (purchaseParam !== 'success' || !offering || !session || purchase) return;

    let active = true;
    setAwaitingWebhook(true);
    let attempts = 0;

    const poll = async () => {
      if (!active) return;
      attempts += 1;
      const found = await loadPurchaseAndContent(offering, session);
      if (!active) return;
      if (found || attempts >= 6) {
        setAwaitingWebhook(false);
        if (!found) {
          setNotice("Payment went through — this page just needs a moment to catch up. Refresh if it doesn't update shortly.");
        }
        return;
      }
      setTimeout(poll, 1500);
    };
    poll();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, offering, session, purchase]);

  // Back from a successful Stripe Checkout: report the sale to Google Ads. The purchase row's id
  // is the transaction id, so a refresh never counts it twice.
  useEffect(() => {
    if (searchParams.get('purchase') !== 'success' || !offering || !purchase?.id) return;
    const cents = purchase.price_paid_cents ?? offering.price_cents;
    trackPurchase({ value: (cents || 0) / 100, currency: 'USD', transactionId: purchase.id, kind: 'offering', contentId: offering.id, contentName: offering.title });
    try {
      const key = `rt_site_purchase_${purchase.id}`;
      if (!window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, '1');
        trackSite('purchase', { props: { offering_id: offering.id, value_cents: cents || 0 } });
      }
    } catch {
      trackSite('purchase', { props: { offering_id: offering.id, value_cents: cents || 0 } });
    }
  }, [searchParams, offering, purchase]);

  // Wake the checkout function while the visitor reads the page, so Buy Now doesn't wait for a cold start.
  useEffect(() => {
    if (!offering?.id || !offering.price_cents) return;
    fetch(CHECKOUT_FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ warm: true }),
    }).catch(() => {});
  }, [offering?.id, offering?.price_cents]);

  // Coming back from Stripe with the Back button restores this page as it was: un-stick the button.
  useEffect(() => {
    const onShow = (e) => { if (e.persisted) setBuying(false); };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  // Lesson counts and total length for "What you get".
  useEffect(() => {
    if (!offering?.id || offering.type === 'call') return undefined;
    let active = true;
    fetchOfferingSummary(offering.id).then((s) => { if (active && s) setSummary(s); });
    return () => { active = false; };
  }, [offering?.id, offering?.type]);

  // The sticky bar waits for the first scroll.
  useEffect(() => {
    const onScroll = () => { if (window.scrollY > 60) setScrolled(true); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Watch the main buy button: fires buy_button_visible the first time it is really on screen, and tells the
  // sticky bar when it has scrolled away.
  useEffect(() => {
    if (!mainBuyEl || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      setMainBuyVisible(e.isIntersecting);
      if (e.isIntersecting && !buyVisibleSent.current) {
        buyVisibleSent.current = true;
        trackSite('buy_button_visible', { props: { offering_id: id, price_cents: offering?.price_cents || 0 } });
      }
    }, { threshold: 0.6 });
    io.observe(mainBuyEl);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainBuyEl]);

  // Watch the buy button at the bottom of the page, so the sticky bar steps aside when it comes into view.
  useEffect(() => {
    if (!bottomBuyEl || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      setBottomBuyVisible(e.isIntersecting);
      setBottomBuyPast(!e.isIntersecting && e.boundingClientRect.top < 0);
    }, { threshold: 0.3 });
    io.observe(bottomBuyEl);
    return () => io.disconnect();
  }, [bottomBuyEl]);

  // Meta ViewContent and Google view_item: once each time an offering page is opened.
  useEffect(() => {
    if (!offering?.id) return;
    trackViewContent({ id: offering.id, title: offering.title, value: (offering.price_cents || 0) / 100 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offering?.id]);

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

  // Checkout opens in a new tab, so this tab stays behind. Poll for the
  // purchase so it flips to "owned" on its own once payment completes.
  useEffect(() => {
    if (!checkoutOpen || !offering || !session || purchase) return;
    let active = true;
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      const found = await loadPurchaseAndContent(offering, session);
      if (!active) return;
      if (found || attempts >= 200) {
        clearInterval(timer);
        setCheckoutOpen(false);
        if (found) setNotice('');
      }
    }, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutOpen, offering, session, purchase]);

  // Calendly tells the page when someone finishes booking. If they were using
  // their free weekly call, that's the moment it counts as used.
  useEffect(() => {
    if (!offering || !freeCall?.claimed || freeCall?.booked) return undefined;
    const onMessage = async (e) => {
      if (e.origin !== 'https://calendly.com' || e.data?.event !== 'calendly.event_scheduled') return;
      await supabase.rpc('mark_free_call_booked', { p_creator_id: offering.creator_auth_id });
      setFreeCall((prev) => (prev ? { ...prev, booked: true } : prev));
      setNotice('You’re booked. Check your email for the details.');
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [offering, freeCall]);

  const handleClaimFreeCall = async () => {
    setError('');
    setNotice('');
    setClaiming(true);
    const { data, error: rpcError } = await supabase.rpc('claim_free_family_call', { p_offering_id: offering.id });
    setClaiming(false);
    if (rpcError || !data?.ok) {
      setError(data?.error || "Couldn't claim your free call — please try again.");
      return;
    }
    setFreeCall((prev) => ({ ...(prev || {}), is_member: true, claimed: true, booked: false, resets_on: data.resets_on }));
    setNotice('Your free call is unlocked. Pick a time below.');
  };

  // source: which button was pressed ('main', 'sticky', 'bottom', 'upgrade' or 'free_lesson'). Every press still
  // records the original buy_click; the sticky and bottom bars also record their own event so we can tell them apart.
  const handleBuy = async (source = 'main') => {
    const src = typeof source === 'string' ? source : 'main';
    const clickProps = { offering_id: offering.id, price_cents: offering.price_cents || 0, signed_in: !!session, src };
    trackSite('buy_click', { props: clickProps });
    if (src === 'sticky') trackSite('sticky_buy_click', { props: clickProps });
    if (src === 'bottom') trackSite('bottom_buy_click', { props: clickProps });
    // Paid items can be bought without an account (guest checkout): Stripe asks for the email and
    // the account is made after payment. Free items and free-for-family unlocks still need an
    // account first, because they are added to the account straight away.
    const guest = !session;
    if (guest && (!GUEST_CHECKOUT || !offering.price_cents || offering.is_free_for_family)) {
      setGateOpen(true);
      return;
    }
    setError('');
    setNotice('');
    setBuying(true);

    const freeForYou = !guest && offering.is_free_for_family && isFamily;
    const isFreeItem = !guest && offering.type !== 'call' && (freeForYou || !offering.price_cents);

    // Free items skip checkout entirely: record the claim (so it lands in
    // "My purchases" and unlocks the file), then download it straight away.
    if (freeForYou || isFreeItem) {
      if (!purchase) {
        const { error: insertError } = await supabase.from('offering_purchases').insert({
          offering_id: offering.id,
          buyer_auth_id: session.user.id,
          price_paid_cents: 0,
        });
        // 23505 = already claimed earlier; that's fine, carry on to the download.
        if (insertError && insertError.code !== '23505') {
          setBuying(false);
          setError("Couldn't complete that — please try again.");
          return;
        }
      }
      const { data: contentRow } = await supabase.from('offering_content').select('content_url').eq('offering_id', offering.id).maybeSingle();
      await loadPurchaseAndContent(offering, session);
      setBuying(false);
      if (contentRow?.content_url) {
        startDownload(downloadUrlFor(contentRow.content_url));
        setNotice('Your download has started.');
      } else {
        setNotice(courseLessonCount > 0
          ? (offering.type === 'audio' ? 'Added to your library — press play below to start listening.' : 'Added to your library — your lessons are below.')
          : 'Added to your library — the creator has not attached a file yet.');
      }
      return;
    }

    // Everything with a real price goes through Stripe Checkout now —
    // the server (create-checkout-session) verifies the creator has
    // payouts set up and computes the platform fee; this function only
    // redirects to the hosted checkout page it returns.
    // Go to Stripe in this same tab the moment the link is ready. (We used to open an empty second
    // tab first and fill it in later; on phones that tab was slow to fill and sometimes stayed blank.)
    // Meta InitiateCheckout and Google begin_checkout: Buy Now was pressed on a paid item.
    trackBeginCheckout({ id: offering.id, title: offering.title, value: (offering.price_cents || 0) / 100 });
    try {
      const res = await fetch(CHECKOUT_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${guest ? SUPABASE_ANON_KEY : session.access_token}`,
        },
        body: JSON.stringify({ offeringId: offering.id, origin: window.location.origin, guest, attribution: getAttribution() }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Couldn't start checkout — please try again.");
        setBuying(false);
        return;
      }
      trackSite('checkout_start', { props: { offering_id: offering.id, price_cents: offering.price_cents || 0, guest } });
      // The button keeps saying "Opening secure checkout…" while the browser leaves for Stripe.
      window.location.href = data.url;
    } catch {
      setError("Couldn't start checkout — please try again.");
      setBuying(false);
    }
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
  // 30-minute calls come free once a week for the creator's Spiritual Family.
  const freeCallEligible = isCall && offering.call_duration_minutes > 0 && offering.call_duration_minutes <= FREE_CALL_MAX_MINUTES;
  const hasFreeCallUnlocked = freeCallEligible && !!freeCall?.is_member && !!freeCall.claimed && !freeCall.booked;
  const freeCallUsed = freeCallEligible && !!freeCall?.is_member && !!freeCall.booked;
  const freeCallAvailable = freeCallEligible && !!freeCall?.is_member && !freeCall.claimed;
  // The scheduler appears once you've paid or unlocked your free call.
  const canPickTime = alreadyOwned || hasFreeCallUnlocked;
  const resetsLabel = freeCall?.resets_on
    ? new Date(`${freeCall.resets_on}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })
    : 'Monday';
  const freeForYou = offering.is_free_for_family && isFamily;
  // Anything that costs nothing (and isn't a call) is a straight download.
  const isFreeItem = !isCall && (freeForYou || !offering.price_cents);
  const cover = coverUrl(offering.cover_path);
  // The share link is always the clean address (no ad tags).
  const pageUrl = `${SITE_URL}/offering/${offering.id}`;
  const isOwnerOfOffering = session?.user?.id === offering.creator_auth_id;

  const priceLabel = freeForYou || freeCallAvailable || hasFreeCallUnlocked ? 'Free' : formatPrice(offering.price_cents);
  const buyLabel = isCall ? 'Reserve & Pay' : isFreeItem ? 'Download' : `Buy now – ${priceLabel}`;
  // Signed in, but we have not yet looked up whether they already own it: do not offer Buy for a moment.
  const accountPending = !!session && !purchaseChecked;
  // True when the normal Buy button is the thing shown (not owned, not a free-call claim, not a gift form).
  const showBuyButton = !awaitingWebhook && !alreadyOwned && !accountPending && !freeCallAvailable && !hasFreeCallUnlocked && !offering.gift_slug;
  const guestPays = !session && GUEST_CHECKOUT;
  const paidPlain = !isCall && !isFreeItem && !offering.gift_slug && Number(offering.price_cents) > 0;
  const stickyVisible = showBuyButton && !isFreeItem && scrolled && !mainBuyVisible && !bottomBuyVisible && !bottomBuyPast;

  // One line that says what this is: the first sentence of the description.
  const promise = (() => {
    const d = String(offering.description || '').replace(/\s+/g, ' ').trim();
    if (!d) return '';
    const m = d.match(/^.*?[.!?](?=\s|$)/);
    const first = m ? m[0] : d;
    return first.length > 160 ? `${first.slice(0, 157).replace(/\s+\S*$/, '')}…` : first;
  })();
  // The Reviews tab only exists when there is something to read, or when this buyer can write the first review.
  const showReviewsTab = reviewStats.review_count > 0 || (alreadyOwned && !!session);
  const tabStyle = (active) => ({
    background: 'none', border: 'none', fontSize: 14.5, fontWeight: 700,
    color: active ? 'var(--brown)' : 'var(--text-soft)',
    paddingBottom: 12, borderBottom: active ? '2px solid var(--brown)' : 'none',
  });
  const recap = !isCall ? whatYouGetItems(offering, summary).filter((t) => !t.startsWith('Works on')) : [];

  return (
    <div className="container" style={{ paddingBlock: '24px 64px' }}>
      <AuthGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        onSignedIn={() => {
          setGateOpen(false);
          setError('');
          setNotice(`You’re signed in. Tap ${isCall ? '“Reserve & Pay”' : isFreeItem ? '“Download”' : '“Buy now”'} to finish.`);
        }}
        offeringTitle={offering.title}
        priceLabel={isFreeItem ? 'Free' : formatPrice(offering.price_cents)}
      />

      <div className="offer-grid">
        {/* 1. Title and promise */}
        <div className="offer-head">
          <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span className="badge">{(OFFERING_TYPE_LABELS[offering.type] || offering.type).toUpperCase()}</span>
            {offering.is_original && <OriginalsTag />}
          </span>
          <h1 className="serif" style={{ fontSize: 32, fontWeight: 700, color: 'var(--brown)', marginTop: 12, marginBottom: 0, lineHeight: 1.2 }}>
            {offering.title}
          </h1>
          {promise && (
            <p style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--text)', margin: '10px 0 0' }}>{promise}</p>
          )}

          {reviewsLoaded && reviewStats.review_count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <StarRating value={Number(reviewStats.avg_rating)} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{Number(reviewStats.avg_rating).toFixed(1)}</span>
              <span className="muted" style={{ fontSize: 12.5 }}>
                ({reviewStats.review_count} {reviewStats.review_count === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}
        </div>

        {/* 2. Price and buy buttons: straight after the title on phones, beside the text on wide screens */}
        <div className="offer-side">
          <div className="card sticky-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--brown)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 12px' }}>
              <span>{priceLabel}</span>
              {mounted && !(freeForYou || freeCallAvailable || hasFreeCallUnlocked) && <SaleTag offering={offering} size={16} />}
            </div>

            {freeCallEligible && (
              <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                {freeCallAvailable
                  ? 'Your Spiritual Family perk: one free 30-minute call a week.'
                  : hasFreeCallUnlocked
                    ? 'Free call unlocked for this week. Pick a time below.'
                    : freeCallUsed
                      ? `You've used this week's free call. It resets ${resetsLabel}.`
                      : `Members of ${creatorProfile?.name ? `${creatorProfile.name.split(' ')[0]}'s` : 'this'} Spiritual Family get one free 30-minute call a week. Request to join in the app.`}
              </div>
            )}

            {offering.is_free_for_family && (
              <div className="muted" style={{ fontSize: 12 }}>
                {isFamily ? 'Free because you’re part of this Spiritual Family.' : 'Free to this creator’s Spiritual Family — request to join in the app to unlock it.'}
              </div>
            )}

            {error && <div className="error-banner">{error}</div>}
            {notice && !error && <div className="success-banner">{notice}</div>}

            {awaitingWebhook && !alreadyOwned ? (
              <div className="btn btn-outline" style={{ pointerEvents: 'none' }}>
                Finishing up your purchase…
              </div>
            ) : accountPending && !alreadyOwned ? (
              <div className="btn btn-outline" style={{ pointerEvents: 'none' }}>
                One moment…
              </div>
            ) : alreadyOwned ? (
              offering.type === 'audio' && courseLessonCount > 0 && !contentUrl ? (
                <a href="#audiobook-player" className="btn btn-primary">Listen now</a>
              ) : !isCall && contentUrl ? (
                isFreeItem ? (
                  <a href={downloadUrlFor(contentUrl)} rel="noreferrer" className="btn btn-primary">
                    Download
                  </a>
                ) : (
                  <a href={contentUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                    Open / download
                  </a>
                )
              ) : (
                <div className="btn btn-outline" style={{ pointerEvents: 'none' }}>
                  {isCall ? 'Booked' : 'Already yours'}
                </div>
              )
            ) : freeCallAvailable ? (
              <button onClick={handleClaimFreeCall} disabled={claiming} className="btn btn-primary">
                {claiming ? 'Please wait…' : 'Claim your free call'}
              </button>
            ) : hasFreeCallUnlocked ? (
              <div className="btn btn-outline" style={{ pointerEvents: 'none' }}>
                Free call unlocked
              </div>
            ) : offering.gift_slug ? (
              <GiftEmailForm offering={offering} />
            ) : (
              <button
                ref={setMainBuyEl}
                onClick={() => handleBuy('main')}
                disabled={buying || (offering.is_free_for_family && !isFamily && !session)}
                className="btn btn-primary"
                style={{ fontSize: 16, padding: '15px 24px' }}
              >
                {buying ? (isFreeItem ? 'Please wait…' : 'Opening secure checkout…') : buyLabel}
              </button>
            )}

            {/* Second button: jumps to the free Lesson 1 box further down */}
            {offering.type === 'course' && offering.free_preview && !alreadyOwned && !isOwnerOfOffering && (
              <a
                href="#free-lesson"
                className="btn btn-outline"
                style={{ fontSize: 15 }}
                onClick={(e) => {
                  const el = document.getElementById('free-lesson');
                  if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
                }}
              >
                Lesson 1 free
              </a>
            )}

            {paidPlain && !alreadyOwned ? (
              <TrustLines guest={guestPays} />
            ) : (
              <div className="muted" style={{ fontSize: 12, textAlign: 'center' }}>
                {isCall
                  ? "You'll get a video call link by email after payment"
                  : freeForYou
                    ? 'No payment needed — this one’s free for you.'
                    : isFreeItem
                      ? (offering.gift_slug && !alreadyOwned ? 'Free — we email it to you.' : session ? 'Free — no payment needed.' : 'Free — a free account saves it to your library.')
                      : 'Secure checkout powered by Stripe.'}
              </div>
            )}

            {!session && !alreadyOwned && !isFreeItem && !offering.gift_slug && (
              <div className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
                Already bought this?{' '}
                <Link href={`/login?next=${encodeURIComponent(`/offering/${offering.id}`)}`} style={{ fontWeight: 700, textDecoration: 'underline' }}>Log in to open it</Link>
              </div>
            )}

            <div style={{ height: 1, background: 'rgba(107,66,38,0.1)' }} />

            {isCall ? <FeatureList isCall offering={offering} /> : <WhatYouGet offering={offering} summary={summary} />}

            {creatorProfile && (
              <>
                <div style={{ height: 1, background: 'rgba(107,66,38,0.1)' }} />
                <CreatorMini name={creatorProfile.name} storefront={storefront} isCall={isCall} story={creatorProfile.story} />
              </>
            )}
          </div>
        </div>

        {/* 3. Everything else, below the buy block */}
        <div className="offer-body">
          {cover && !isCall && (
            <div className="offer-cover">
              <CoverImage src={cover} alt={offering.title} radius={16} lazy />
            </div>
          )}

          {showReviewsTab ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 24, paddingBottom: 16, borderBottom: '1px solid rgba(107,66,38,0.1)' }}>
              <button onClick={() => setTab('description')} style={tabStyle(tab === 'description')}>
                Description
              </button>
              <button onClick={() => setTab('reviews')} style={tabStyle(tab === 'reviews')}>
                Reviews{reviewStats.review_count > 0 ? ` (${reviewStats.review_count})` : ''}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 24, paddingBottom: 12, borderBottom: '1px solid rgba(107,66,38,0.1)' }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--brown)' }}>About this {(OFFERING_TYPE_LABELS[offering.type] || 'offering').toLowerCase()}</span>
            </div>
          )}

          {tab === 'description' || !showReviewsTab ? (
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
              {!canPickTime ? (
                <div className="card muted" style={{ padding: 24, fontSize: 13.5, lineHeight: 1.55 }}>
                  {freeCallAvailable
                    ? 'Claim your free weekly call on the right, then pick a time here.'
                    : freeCallUsed
                      ? `You've used this week's free call. Reserve & pay to book another, or come back ${resetsLabel}.`
                      : 'Reserve your spot first, then pick a time here.'}
                </div>
              ) : offering.calendly_url ? (
                <CalendlyEmbed url={offering.calendly_url} name={session?.user?.user_metadata?.full_name} email={session?.user?.email} />
              ) : (
                <div className="card muted" style={{ padding: 24, fontSize: 13.5 }}>
                  This creator hasn&rsquo;t connected a Calendly link yet.
                </div>
              )}
            </div>
          )}

          {offering.type === 'course' && offering.is_original && (
            <div className="muted" style={{ fontSize: 13, marginTop: 14, fontStyle: 'italic' }}>
              A Rooted Together team course. Presenter is AI-generated.
            </div>
          )}

          {offering.type === 'course' && !(alreadyOwned || isOwnerOfOffering) && (
            <FreePreview
              offeringId={offering.id}
              offeringTitle={offering.title}
              enabled={!!offering.free_preview}
              onGetFull={(src) => handleBuy(typeof src === 'string' ? src : 'free_lesson')}
              buying={buying}
              priceLabel={priceLabel}
              priceCents={offering.price_cents || 0}
            />
          )}

          {offering.type === 'course' && (
            <CourseLessonsViewer
              offeringId={offering.id}
              owned={alreadyOwned || isOwnerOfOffering}
              onLoaded={setCourseLessonCount}
            />
          )}

          {offering.type === 'audio' && (
            <AudiobookPlayer
              offeringId={offering.id}
              owned={alreadyOwned || isOwnerOfOffering}
              onLoaded={setCourseLessonCount}
            />
          )}

          {!isCall && alreadyOwned && (
            <div className="success-banner" style={{ marginTop: 28 }}>
              {contentUrl ? (
                <>
                  You own this. <a href={contentUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>Open it here →</a>
                </>
              ) : courseLessonCount > 0 ? (
                offering.type === 'audio' ? 'You own this — press play above to start listening.' : 'You own this — your lessons are listed above.'
              ) : (
                'You own this — the creator hasn’t attached content yet.'
              )}
            </div>
          )}

          {/* Buy again at the bottom, for people who read all the way down */}
          {showBuyButton && !isCall && !isFreeItem && (
            <div className="card" style={{ padding: 22, marginTop: 32, background: 'var(--cream-dark, #F3ECE3)' }}>
              <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)', lineHeight: 1.25 }}>
                Ready to start {offering.title}?
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', marginTop: 12, fontSize: 13.5, color: 'var(--text)' }}>
                {recap.map((t) => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B4226" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                    {t}
                  </span>
                ))}
              </div>
              <button
                ref={setBottomBuyEl}
                onClick={() => handleBuy('bottom')}
                disabled={buying || (offering.is_free_for_family && !isFamily && !session)}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 16, fontSize: 16, padding: '15px 24px' }}
              >
                {buying ? 'Opening secure checkout…' : buyLabel}
              </button>
              {paidPlain && (
                <div style={{ marginTop: 12 }}>
                  <TrustLines guest={guestPays} />
                </div>
              )}
            </div>
          )}

          {/* Links that lead away from the page come last, after the buy section. */}
          {creatorProfile && storefront && (
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(107,66,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div className="muted" style={{ fontSize: 13.5 }}>More from {creatorProfile.name}</div>
              <Link href={`/creator/${storefront.handle}`} className="btn btn-outline btn-small">
                View storefront
              </Link>
            </div>
          )}

          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(107,66,38,0.1)' }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
              Share this
            </div>
            <ShareButtons url={pageUrl} title={offering.title} />
          </div>

          <div className="offer-bottom-space" aria-hidden="true" />
        </div>
      </div>

      <StickyBuyBar
        visible={stickyVisible}
        priceLabel={priceLabel}
        buttonLabel={isCall ? 'Reserve & Pay' : 'Buy now'}
        busy={buying}
        onBuy={() => handleBuy('sticky')}
      />
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
        offering.type === 'course' ? 'Self-paced — go at your own speed' : offering.type === 'audio' ? 'Listen anywhere, at your own pace' : 'Yours to keep, no expiration',
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

function CalendlyEmbed({ url, name, email }) {
  const ref = useRef(null);

  // Pre-fill who is booking so the creator knows it's one of their family.
  let dataUrl = url;
  try {
    const u = new URL(url);
    u.searchParams.set('hide_gdpr_banner', '1');
    if (name) u.searchParams.set('name', name);
    if (email) u.searchParams.set('email', email);
    dataUrl = u.toString();
  } catch {
    dataUrl = url;
  }

  // The widget script only scans the page once when it loads, but this embed
  // can appear later (after claiming a free call or paying), so start it
  // explicitly whenever the element is ready.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const start = () => {
      if (window.Calendly && el && !el.dataset.started) {
        el.dataset.started = '1';
        window.Calendly.initInlineWidget({ url: dataUrl, parentElement: el });
      }
    };
    if (window.Calendly) {
      start();
      return undefined;
    }
    let script = document.getElementById('calendly-widget-script');
    if (!script) {
      script = document.createElement('script');
      script.id = 'calendly-widget-script';
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      document.body.appendChild(script);
    }
    script.addEventListener('load', start);
    return () => script.removeEventListener('load', start);
  }, [dataUrl]);

  return (
    <div
      ref={ref}
      style={{ minWidth: 320, height: 700, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(107,66,38,0.12)' }}
    />
  );
}
