'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useSession } from '@/components/SessionProvider';
import CoverImage from '@/components/CoverImage';
import MuxVideo from '@/components/MuxVideo';
import OriginalsTag from '@/components/OriginalsTag';
import { TrustLines } from '@/components/OfferingExtras';
import { coverUrl } from '@/lib/storage';
import { formatPrice } from '@/lib/roles';
import { formatDuration } from '@/lib/lessons';
import { FUNCTIONS_URL, SUPABASE_ANON_KEY, GUEST_CHECKOUT } from '@/lib/config';
import { getAttribution, trackLead, trackViewContent, trackBeginCheckout, newEventId } from '@/lib/tracking';
import { track as trackSite } from '@/lib/analytics';
import { FUNNELS, NIGHT_1 } from '@/lib/funnels';

// The free-sample pages /lesson-1 and /night-1 (see lib/funnels.js).
//  1. First screen (phone): the picture, one line, an email box.
//  2. On submit: Meta Lead (browser, and server through /api/funnel) and Google generate_lead, the ad tags are
//     saved with the email, the sample plays or opens on this page, and the paid offer shows right below it.
//  3. The Buy button runs the same guest-checkout call the offering page uses (create-checkout-session).
// The person is remembered on this device (a key, never the email), and the email link carries the same key
// (?k=...), so coming back from the email shows the sample straight away.

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHECKOUT_FN_URL = `${FUNCTIONS_URL}/create-checkout-session?forceFunctionRegion=ap-southeast-2`;
const noop = () => () => {};

const CHECK = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B4226" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const eyebrowStyle = { fontSize: 11.5, fontWeight: 700, letterSpacing: 0.6, color: 'var(--text-soft)' };

function NightOne({ onPlay, onDone }) {
  const [ticked, setTicked] = useState({});
  const n = NIGHT_1;
  const h = { fontSize: 12, fontWeight: 700, letterSpacing: 0.6, color: 'var(--text-soft)', margin: '18px 0 4px' };
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={eyebrowStyle}>NIGHT 1 OF 7</div>
      <h2 className="serif" style={{ fontSize: 28, lineHeight: 1.1, color: 'var(--brown)', margin: '6px 0 2px' }}>{n.title}</h2>
      <div className="muted" style={{ fontSize: 14 }}>{n.subtitle}</div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Listen · about 2 minutes</div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls preload="none" src={n.audioUrl} onPlay={onPlay} onEnded={onDone} style={{ width: '100%' }} />
      </div>

      <blockquote className="serif" style={{ margin: '20px 0 0', padding: '4px 0 4px 14px', borderLeft: '3px solid var(--brown-pale)', fontSize: 18, lineHeight: 1.5, color: 'var(--brown)' }}>
        “{n.verse}”
        <div className="muted" style={{ fontSize: 12.5, fontFamily: 'var(--sans)', marginTop: 6, fontWeight: 700, letterSpacing: 0.3 }}>{n.verseRef.toUpperCase()}</div>
      </blockquote>

      <div style={h}>REFLECT</div>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>{n.reflect}</p>
      <div style={h}>PRAY</div>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>{n.prayer}</p>
      <div style={h}>WRITE</div>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, fontStyle: 'italic' }}>{n.write}</p>

      <div style={h}>TONIGHT’S CHECKLIST</div>
      <div style={{ display: 'grid', gap: 2 }}>
        {n.checklist.map((item, i) => (
          <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, fontSize: 15, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!ticked[i]}
              onChange={(e) => setTicked((t) => ({ ...t, [i]: e.target.checked }))}
              style={{ width: 22, height: 22, accentColor: '#6B4226', flexShrink: 0 }}
            />
            <span style={{ textDecoration: ticked[i] ? 'line-through' : 'none', opacity: ticked[i] ? 0.6 : 1 }}>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function FunnelLanding({ funnel, offering }) {
  const cfg = FUNNELS[funnel];
  const { session } = useSession();
  const storeKey = `rt_funnel_${funnel}`;
  const isLesson = funnel === 'lesson-1';

  // A key from the email link (?k=) or from this device. It is read after the page loads; the server always renders the form.
  const remembered = useSyncExternalStore(noop, () => {
    try {
      const k = new URLSearchParams(window.location.search).get('k') || window.localStorage.getItem(storeKey) || '';
      return KEY.test(k) ? k : '';
    } catch { return ''; }
  }, () => '');
  const [resolved, setResolved] = useState(false);
  const [done, setDone] = useState(false);
  const [lesson, setLesson] = useState(null);
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // hidden field: real people leave it empty
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState('');
  const sampleRef = useRef(null);
  const emailRef = useRef(null);
  const justSubmitted = useRef(false);
  const viewSent = useRef(false);
  const audioSent = useRef(false);
  const checking = !!remembered && !resolved && !done;

  useEffect(() => {
    if (!remembered) return undefined;
    let active = true;
    fetch('/api/funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funnel, returning: true, key: remembered }),
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok && !!j?.ok, j })).catch(() => ({ ok: false, j: null })))
      .then(({ ok, j }) => {
        if (!active) return;
        if (ok) {
          try { window.localStorage.setItem(storeKey, remembered); } catch { /* storage blocked */ }
          setLesson(j.lesson || null);
          setDone(true);
          trackSite('funnel_return', { props: { funnel } });
        } else {
          try { window.localStorage.removeItem(storeKey); } catch { /* storage blocked */ }
        }
        setResolved(true);
      })
      .catch(() => { if (active) setResolved(true); });
    return () => { active = false; };
  }, [remembered, funnel, storeKey]);

  // Once the sample is on screen, so is the offer: that is a ViewContent for the paid item.
  useEffect(() => {
    if (!done || !offering || viewSent.current) return;
    viewSent.current = true;
    trackViewContent({ id: offering.id, title: offering.title, value: (offering.price_cents || 0) / 100 });
  }, [done, offering]);

  useEffect(() => {
    if (done && justSubmitted.current) {
      justSubmitted.current = false;
      sampleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [done]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const clean = email.trim().toLowerCase();
    if (!EMAIL.test(clean)) { setError('Please enter a valid email address.'); return; }
    setBusy(true);
    try {
      const attr = getAttribution();
      const eventId = newEventId();
      const res = await fetch('/api/funnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funnel,
          email: clean,
          event_id: eventId,
          content_name: offering?.title || cfg.slug,
          attribution: attr,
          website,
          utm_source: attr.utm_source || cfg.slug,
          utm_medium: attr.utm_medium || '',
          utm_campaign: attr.utm_campaign || '',
          utm_content: attr.utm_content || '',
        }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) { setError(j?.error || 'Something went wrong. Please try again.'); return; }
      try { if (j.key) window.localStorage.setItem(storeKey, j.key); } catch { /* storage blocked */ }
      trackSite('funnel_lead', { props: { funnel, new_lead: !!j.saved } });
      trackSite(isLesson ? 'free_lesson_unlocked' : 'free_night_unlocked', { props: { offering_id: offering?.id || '', funnel } });
      // Meta Lead and Google generate_lead, once per brand-new email (the server sends Meta's copy with the same id).
      if (j.saved) trackLead({ source: cfg.leadSource, contentName: offering?.title || cfg.slug, eventId });
      setLesson(j.lesson || null);
      justSubmitted.current = true;
      setDone(true);
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const buy = async () => {
    if (!offering) return;
    const guest = !session;
    const props = { offering_id: offering.id, price_cents: offering.price_cents || 0, signed_in: !!session, src: cfg.slug };
    trackSite('buy_click', { props });
    trackSite('funnel_offer_click', { props });
    // Same rule as the offering page: a paid item can be bought as a guest. Anything else goes to the offering page.
    if (guest && (!GUEST_CHECKOUT || !offering.price_cents || offering.is_free_for_family)) {
      window.location.href = `/offering/${offering.id}${window.location.search}`;
      return;
    }
    setBuyError('');
    setBuying(true);
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
        setBuyError(data.error || "Couldn't start checkout. Please try again.");
        setBuying(false);
        return;
      }
      trackSite('checkout_start', { props: { offering_id: offering.id, price_cents: offering.price_cents || 0, guest, src: cfg.slug } });
      window.location.href = data.url; // the button keeps saying "Opening secure checkout…" while the browser leaves for Stripe
    } catch {
      setBuyError("Couldn't start checkout. Please try again.");
      setBuying(false);
    }
  };

  const forgetMe = () => {
    try { window.localStorage.removeItem(storeKey); } catch { /* storage blocked */ }
    // Drop ?k= so the page shows the box again, then reload it.
    window.location.href = `/${funnel}${window.location.search.replace(/([?&])k=[^&]*&?/, '$1').replace(/[?&]$/, '')}`;
  };

  if (!offering) {
    return (
      <main className="funnel">
        <p className="muted" style={{ textAlign: 'center', padding: '72px 0' }}>This page is not available right now.</p>
      </main>
    );
  }

  const cover = coverUrl(offering.cover_path);
  const price = formatPrice(offering.price_cents);

  const disclosure = <p className="muted" style={{ fontSize: 12.5, fontStyle: 'italic', margin: '12px 0 0', textAlign: 'center' }}>{cfg.disclosure}</p>;

  return (
    <main className="funnel">
      {!done && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <OriginalsTag small />
            <span style={eyebrowStyle}>{cfg.eyebrow}</span>
          </div>

          <button
            type="button"
            className="funnel-cover"
            onClick={() => emailRef.current?.focus()}
            aria-label={isLesson ? 'Lesson 1: enter your email to watch' : 'Night 1: enter your email to open it'}
          >
            <CoverImage src={cover} alt="" radius={16} />
            {isLesson && (
              <span className="funnel-play" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" focusable="false" style={{ marginLeft: 4 }}><path d="M7 4.5v15l13-7.5z" fill="#FFFFFF" /></svg>
              </span>
            )}
          </button>

          <h1 className="serif funnel-h1">{cfg.headline}</h1>
          <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>{cfg.caption}</div>

          {checking ? (
            <div className="skeleton" style={{ height: 132, marginTop: 16, borderRadius: 14 }} aria-hidden="true" />
          ) : (
            <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <label className="field-label" htmlFor="funnel-email" style={{ margin: 0 }}>{cfg.label}</label>
              <input
                id="funnel-email"
                ref={emailRef}
                className="input-field"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              />
              {error && <div className="error-banner" role="alert">{error}</div>}
              <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', padding: '14px 20px', fontSize: 15.5 }}>
                {busy ? 'Please wait…' : cfg.button}
              </button>
              <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, margin: 0, textAlign: 'center' }}>
                {cfg.notice}{' '}
                <a href="/privacy" style={{ textDecoration: 'underline' }}>Privacy Policy</a>
              </p>
            </form>
          )}
          {disclosure}
        </>
      )}

      {done && (
        <>
          <div ref={sampleRef} style={{ scrollMarginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <OriginalsTag small />
              <span style={eyebrowStyle}>{isLesson ? 'YOUR FREE LESSON 1' : 'YOUR FREE NIGHT 1'}</span>
            </div>

            {isLesson ? (
              lesson?.mux_playback_id ? (
                <>
                  <h1 className="serif funnel-h1" style={{ fontSize: 'clamp(22px, 5.5vw, 28px)' }}>{lesson.title || 'Lesson 1'}</h1>
                  <div className="muted" style={{ fontSize: 13, margin: '4px 0 12px' }}>
                    Hearing God in the Quiet{lesson.duration_seconds ? ` · ${formatDuration(lesson.duration_seconds)}` : ''}
                  </div>
                  <div className="card" style={{ padding: 10 }}>
                    <MuxVideo
                      playbackId={lesson.mux_playback_id}
                      title={lesson.title || 'Lesson 1'}
                      onEnded={() => trackSite('free_lesson_completed', { props: { offering_id: offering.id, funnel } })}
                    />
                  </div>
                </>
              ) : (
                <div className="card muted" style={{ padding: 18, fontSize: 14 }}>
                  Lesson 1 could not load just now. Please refresh the page, or use the link in the email we sent you.
                </div>
              )
            ) : (
              <NightOne
                onPlay={() => { if (!audioSent.current) { audioSent.current = true; trackSite('night_audio_play', { props: { funnel } }); } }}
                onDone={() => trackSite('night_audio_done', { props: { funnel } })}
              />
            )}

            <p className="muted" style={{ fontSize: 13, lineHeight: 1.55, margin: '14px 2px 0' }}>{cfg.sentLine}</p>
            {disclosure}
            <button type="button" onClick={forgetMe} className="muted" style={{ background: 'none', border: 0, padding: 0, marginTop: 10, fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer', display: 'block', marginInline: 'auto' }}>
              Not you? Use a different email
            </button>
          </div>

          <section id="offer" className="card funnel-offer" aria-label={offering.title}>
            <div style={eyebrowStyle}>{cfg.offerEyebrow}</div>
            <h2 className="serif" style={{ fontSize: 26, lineHeight: 1.12, color: 'var(--brown)', margin: '6px 0 8px' }}>{offering.title}</h2>
            <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.55, margin: '0 0 14px' }}>{cfg.offerLine}</p>
            <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
              {cfg.items.map((t) => (
                <div key={t} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.45 }}>{CHECK}<span>{t}</span></div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
              <span className="serif" style={{ fontSize: 34, fontWeight: 700, color: 'var(--brown)' }}>{price}</span>
              <span className="muted" style={{ fontSize: 13 }}>one-time payment</span>
            </div>
            {buyError && <div className="error-banner" role="alert" style={{ marginBottom: 10 }}>{buyError}</div>}
            <button type="button" className="btn btn-primary" onClick={buy} disabled={buying} style={{ width: '100%', padding: '15px 20px', fontSize: 16 }}>
              {buying ? 'Opening secure checkout…' : cfg.buyLabel(price)}
            </button>
            <div style={{ marginTop: 14 }}>
              <TrustLines guest={!session && GUEST_CHECKOUT} />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
