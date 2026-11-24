'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice, OFFERING_TYPE_LABELS } from '@/lib/roles';
import { hasDiscount, offeringDiscountPercent } from '@/lib/discount';
import { coverUrl } from '@/lib/storage';
import CoverImage from '@/components/CoverImage';
import { track as trackSite } from '@/lib/analytics';
import { QUESTIONS, needsCare, recommend, whyItFits, pairLine, previewItem, deliverable } from '@/lib/advisor';
import AdvisorIcon from './AdvisorIcon';
import styles from './advisor.module.css';

// rootedtogether.club/advisor: the course guide ("Sales generator"), styled like the app.
// First screen: real offers (sale price, launch price, free Lesson 1, free items), then the guide.
// The guide asks six questions, one per screen, then gives one honest
// suggestion, one "pairs well with" offer and, if both are declined, the free gift. Visits are
// recorded only through the advisor_* database functions.

const TOTAL = QUESTIONS.length;
const STORE_KEY = 'rt_advisor';
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const tidy = (v) => String(v || '').replace(/[^\w .+-]/g, '').trim().slice(0, 100);

function readUtm() {
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source: tidy(p.get('utm_source')) || tidy(window.sessionStorage.getItem('rt_utm_source')),
      utm_medium: tidy(p.get('utm_medium')),
      utm_campaign: tidy(p.get('utm_campaign')) || tidy(window.sessionStorage.getItem('rt_utm_campaign')),
    };
  } catch {
    return { utm_source: '', utm_medium: '', utm_campaign: '' };
  }
}

// Record a step. Never blocks the visitor for long, and a failure never stops the guide.
async function track(sessionId, event, extra = {}) {
  // Site analytics get the step name only (never the care note, which stays anonymous).
  if (event !== 'care_note') trackSite(`advisor_${event}`, extra.p_recommended ? { props: { offering_id: extra.p_recommended } } : {});
  if (!sessionId) return;
  const call = supabase.rpc('advisor_event', { p_session: sessionId, p_event: event, ...extra });
  await Promise.race([call.then(() => null, () => null), new Promise((r) => setTimeout(r, 900))]);
}

function offeringHref(o, sessionId, utm, src = 'advisor') {
  const q = new URLSearchParams({ src });
  if (sessionId) q.set('as', sessionId);
  if (utm?.utm_source) q.set('utm_source', utm.utm_source);
  if (utm?.utm_medium) q.set('utm_medium', utm.utm_medium);
  if (utm?.utm_campaign) q.set('utm_campaign', utm.utm_campaign);
  return `/offering/${o.id}?${q.toString()}`;
}

function whatYouGet(o) {
  if (o.type === 'call') return '30-minute call';
  if (o.type === 'audio') return (o.ready_video_lessons || 0) > 0 ? `Audiobook, ${o.ready_video_lessons} tracks` : 'Audiobook';
  if ((o.ready_video_lessons || 0) > 0) return `${o.ready_video_lessons} video lessons`;
  return `${OFFERING_TYPE_LABELS[o.type] || 'Download'}, delivered as a file`;
}

function launchLive(o) {
  const d = o?.launch_price_until;
  if (!d || !(Number(o.price_cents) > 0)) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return String(d) >= today;
}

// Only real offers, set by the creator: a former price, a launch price, a free Lesson 1, or a free item.
function offerFor(o) {
  if (hasDiscount(o)) return { rank: 0, badge: `${offeringDiscountPercent(o)}% off`, cta: 'See the offer' };
  if (launchLive(o)) {
    const until = new Date(`${o.launch_price_until}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return { rank: 1, badge: `Launch price until ${until}`, cta: 'See the offer' };
  }
  if (o.free_preview && (o.ready_video_lessons || 0) > 0) return { rank: 2, badge: 'Lesson 1 free', cta: 'Watch Lesson 1 free' };
  if (Number(o.price_cents) === 0 && o.type !== 'call') return { rank: 3, badge: 'Free', cta: 'Get it free' };
  return null;
}

function TeamLine({ o, className }) {
  if (!(o?.type === 'course' && o?.is_original)) return null;
  return <p className={className}>A Rooted Together team course. Presenter is AI-generated.</p>;
}

function Price({ o, className }) {
  return (
    <div className={className}>
      <span>{formatPrice(o.price_cents)}</span>
      {hasDiscount(o) && (
        <>
          <span className={styles.was} aria-label={`Was ${formatPrice(o.original_price_cents)}`}>{formatPrice(o.original_price_cents)}</span>
          <span className={styles.badge}>{offeringDiscountPercent(o)}% off</span>
        </>
      )}
      {!hasDiscount(o) && launchLive(o) && <span className={styles.badge}>Launch price</span>}
    </div>
  );
}

export default function AdvisorClient() {
  const [screen, setScreen] = useState(0); // 0 start, 1..6 questions, then 'care' | 'result' | 'upsell' | 'gift' | 'thanks'
  const [answers, setAnswers] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [utm, setUtm] = useState(null);
  const [catalogue, setCatalogue] = useState(null);
  const [gift, setGift] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [rec, setRec] = useState(null);
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [giftSent, setGiftSent] = useState(false);
  const headingRef = useRef(null);

  useEffect(() => {
    let active = true;
    supabase.rpc('advisor_catalogue').then(({ data, error: err }) => {
      if (!active) return;
      if (err || !Array.isArray(data)) setLoadFailed(true);
      else setCatalogue(data);
    });
    supabase.from('gifts').select('slug, title, subline').eq('active', true).limit(1).then(({ data }) => {
      if (active) setGift(data?.[0] || null);
    });
    return () => { active = false; };
  }, []);

  // Move focus to each new screen's heading for keyboard and screen-reader users, and back to the top.
  useEffect(() => {
    if (screen === 0) return;
    headingRef.current?.focus();
    try { window.scrollTo({ top: 0 }); } catch { /* ignore */ }
  }, [screen]);

  const offers = (catalogue || [])
    .filter(deliverable)
    .map((o) => ({ o, offer: offerFor(o) }))
    .filter((x) => x.offer)
    .sort((a, b) => a.offer.rank - b.offer.rank || Number(a.o.price_cents) - Number(b.o.price_cents));
  const anySale = offers.some((x) => x.offer.rank <= 1);

  const start = async () => {
    trackSite('advisor_started');
    const tags = readUtm();
    setUtm(tags);
    setScreen(1);
    try {
      const { data } = await supabase.rpc('advisor_start', {
        p_utm_source: tags.utm_source || null,
        p_utm_medium: tags.utm_medium || null,
        p_utm_campaign: tags.utm_campaign || null,
      });
      if (data) {
        setSessionId(data);
        try { window.localStorage.setItem(STORE_KEY, JSON.stringify({ id: data, at: Date.now() })); } catch { /* storage blocked */ }
      }
    } catch { /* tracking is best effort */ }
  };

  const finish = (finalAnswers) => {
    const r = recommend(catalogue, finalAnswers);
    setRec(r);
    setScreen('result');
    track(sessionId, 'completed', { p_answers: finalAnswers, p_recommended: r?.lead?.id || null, p_upsell: r?.upsell?.id || null });
  };

  const choose = (key, value) => {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (key === 'need' && needsCare(next)) {
      setScreen('care');
      track(sessionId, 'care_note');
      return;
    }
    // The last question goes straight to the suggestion.
    if (screen >= TOTAL) { finish(next); return; }
    setScreen((s) => s + 1);
  };

  const goBack = () => {
    setError('');
    if (screen === 1 || screen === 'care') setScreen(screen === 'care' ? 1 : 0);
    else if (screen === 'result') setScreen(TOTAL);
    else if (screen === 'upsell') setScreen('result');
    else if (screen === 'gift') setScreen(rec?.upsell ? 'upsell' : 'result');
    else if (typeof screen === 'number' && screen > 1) setScreen(screen - 1);
  };

  const go = async (e, event) => {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    await track(sessionId, event);
    window.location.assign(href);
  };

  const openOffer = (e, o) => {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    trackSite('advisor_offer_click', { props: { offering_id: o.id } });
    setTimeout(() => window.location.assign(href), 150);
  };

  const declineLead = () => {
    if (rec?.upsell) setScreen('upsell');
    else { setScreen(giftSent ? 'thanks' : 'gift'); track(sessionId, 'declined'); }
  };
  const declineUpsell = () => { setScreen(giftSent ? 'thanks' : 'gift'); track(sessionId, 'declined'); };

  const claimGift = async (e) => {
    e.preventDefault();
    setError('');
    const clean = email.trim().toLowerCase();
    if (!EMAIL.test(clean)) { setError('Please enter a valid email address.'); return; }
    if (!gift) { setError('The gift is not available just now. Please try again later.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: clean, website, campaign: gift.slug, send_gift: true, devotional: consent === true,
          utm_source: utm?.utm_source || 'advisor', utm_campaign: utm?.utm_campaign || '',
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) { setError(json?.error || 'Something went wrong. Please try again.'); return; }
      // The email is tied to the answers only when the visitor ticked the box.
      if (consent && sessionId) {
        try { await supabase.rpc('advisor_save_email', { p_session: sessionId, p_email: clean }); } catch { /* best effort */ }
      }
      await track(sessionId, 'gift_claimed');
      if (json.saved && typeof window.fbq === 'function') { try { window.fbq('track', 'Lead'); } catch { /* ignore */ } }
      setGiftSent(true);
      if (screen === 'gift') setScreen('thanks');
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const isQuestion = typeof screen === 'number' && screen >= 1;

  // Deborah's gift: email + unticked consent box. Shown under the suggestions and on the gift step.
  const giftForm = (idPrefix) => (giftSent ? (
    <div className={styles.note} role="status">
      <strong>{gift?.title || 'Your gift'} is on its way.</strong> Check your inbox in a few minutes, and your spam or promotions folder if you do not see it.
    </div>
  ) : gift ? (
    <form onSubmit={claimGift} noValidate>
      <label className={styles.label} htmlFor={`${idPrefix}-email`}>Your email</label>
      <input id={`${idPrefix}-email`} className={styles.input} type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className={styles.hidden} value={website} onChange={(e) => setWebsite(e.target.value)} />
      <label className={styles.check} htmlFor={`${idPrefix}-consent`}>
        <input id={`${idPrefix}-consent`} type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Also send me the daily devotional, and keep my answers with my email so you can suggest courses that fit. I can unsubscribe at any time.</span>
      </label>
      {error && <div className={styles.error} role="alert">{error}</div>}
      <div className={styles.stack}>
        <button type="submit" className={`${styles.primary} ${styles.gold}`} disabled={busy}>{busy ? 'Please wait…' : 'Send me the free gift'}</button>
      </div>
      <p className={styles.small} style={{ marginTop: 12 }}>
        We email you this gift because you asked for it. See our <Link href="/privacy" className={styles.inlineLink}>privacy policy</Link>.
      </p>
    </form>
  ) : null);
  const step = isQuestion ? screen : TOTAL;

  // ---------- First screen: offers, then the guide ----------
  if (screen === 0) {
    return (
      <div className={styles.page}>
        <div className={`${styles.wrap} ${styles.wide}`}>
          <div className={styles.eyebrow}><AdvisorIcon name="compass" size={18} /> Course guide</div>
          <h1 ref={headingRef} tabIndex={-1} className={`${styles.h1} ${styles.heroTitle}`}>Find your next step with God</h1>
          <p className={styles.sub} style={{ maxWidth: 620 }}>
            Courses, books, routines and calls from Spiritual Mothers, pastors and teachers. Start with an offer below, or let us suggest the one that fits you.
          </p>

          {loadFailed && <div className={styles.error} role="alert">We could not load the marketplace just now. Please refresh the page in a moment.</div>}

          {offers.length > 0 && (
            <section className={styles.section} aria-labelledby="offers-h">
              <div className={styles.sectionHead}>
                <h2 id="offers-h" className={styles.h2}>{anySale ? 'On sale now' : 'Free ways to start'}</h2>
                <Link href="/" className={styles.inlineLink} style={{ fontSize: 16 }}>See all</Link>
              </div>
              <div className={styles.offers}>
                {offers.map(({ o, offer }) => (
                  <a key={o.id} href={offeringHref(o, null, null, 'advisor_offers')} className={styles.offer} onClick={(e) => openOffer(e, o)}>
                    <div className={styles.offerCover}>
                      <CoverImage src={coverUrl(o.cover_path)} alt="" />
                      <span className={styles.badge}><AdvisorIcon name={offer.rank <= 1 ? 'tag' : 'gift'} size={15} /> {offer.badge}</span>
                    </div>
                    <div className={styles.offerBody}>
                      <span className={styles.offerTitle}>{o.title}</span>
                      <span className={styles.small}>{whatYouGet(o)}</span>
                      {o.type === 'course' && o.is_original && (
                        <span className={styles.small} style={{ fontStyle: 'italic' }}>A Rooted Together team course. Presenter is AI-generated.</span>
                      )}
                      <span className={styles.offerPrice}>
                        {formatPrice(o.price_cents)}
                        {hasDiscount(o) && <span className={styles.was}>{formatPrice(o.original_price_cents)}</span>}
                      </span>
                      <span className={styles.offerCta}>{offer.cta} →</span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          <section className={styles.guide} aria-labelledby="guide-h">
            <h2 id="guide-h" className={styles.h2} style={{ fontSize: 26 }}>Not sure where to start?</h2>
            <p className={styles.sub} style={{ margin: 0 }}>Answer six quick questions and we will suggest the course, book or call that fits where you are today.</p>
            <ul className={styles.guideSteps}>
              <li><AdvisorIcon name="clock" size={18} /> Under 90 seconds</li>
              <li><AdvisorIcon name="user" size={18} /> No account needed</li>
              <li><AdvisorIcon name="gift" size={18} /> A free gift at the end</li>
            </ul>
            <button type="button" className={styles.primary} onClick={start} disabled={!catalogue}>
              {catalogue ? 'Find my next step' : 'Loading…'}
            </button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        {screen !== 'thanks' && (
          <div className={styles.topbar}>
            <button type="button" className={styles.iconBtn} onClick={goBack} aria-label="Back"><AdvisorIcon name="back" size={26} /></button>
            <div className={styles.segments} role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={step}>
              {Array.from({ length: TOTAL }, (_, i) => <div key={i} className={`${styles.segment} ${i < step ? styles.segmentOn : ''}`} />)}
            </div>
            <div className={styles.sideGap} />
          </div>
        )}

        {isQuestion && screen <= QUESTIONS.length && (() => {
          const q = QUESTIONS[screen - 1];
          return (
            <>
              <h1 ref={headingRef} tabIndex={-1} className={styles.h1} id={`q-${q.key}`}>{q.title}</h1>
              <p className={styles.sub}>{q.sub || 'Pick the one that fits best.'}</p>
              <div className={styles.options} role="group" aria-labelledby={`q-${q.key}`}>
                {q.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={styles.opt}
                    aria-pressed={answers[q.key] === opt.value}
                    onClick={() => choose(q.key, opt.value)}
                    {...(opt.value === 'hurting' ? { 'data-track': 'off' } : { 'data-track-label': q.key === 'need' ? 'advisor need' : `advisor ${q.key}: ${opt.value}` })}
                  >
                    <span className={styles.optIcon}><AdvisorIcon name={opt.icon} /></span>
                    <span className={styles.optText}>
                      <span className={styles.optLabel}>{opt.label}</span>
                      {opt.sub && <span className={styles.optSub}>{opt.sub}</span>}
                    </span>
                    {answers[q.key] === opt.value && <span className={styles.optCheck}><AdvisorIcon name="check" /></span>}
                  </button>
                ))}
              </div>
            </>
          );
        })()}

        {screen === 'care' && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={styles.h1}>We are so sorry you are carrying this</h1>
            <p className={styles.sub}>You do not have to carry it alone, and reaching out is a brave and good thing to do.</p>
            <div className={styles.note}>
              <p style={{ margin: '0 0 10px' }}><strong>If you are in danger or thinking about harming yourself, please contact your local emergency services now.</strong></p>
              <p style={{ margin: 0 }}>You can find a free helpline in your country at <a href="https://findahelpline.com" target="_blank" rel="noreferrer" className={styles.inlineLink}>findahelpline.com</a>.</p>
            </div>
            <p style={{ marginTop: 16 }}>Please also talk today with someone you trust: a pastor, a counselor, a doctor or a close friend.</p>
            <p className={styles.verse}>&ldquo;The LORD is nigh unto them that are of a broken heart.&rdquo; Psalm 34:18 (KJV)</p>
            <p className={styles.small}>This page is not medical or mental-health advice.</p>
          </>
        )}

        {screen === 'result' && !rec && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={styles.h1}>We could not find a match just now</h1>
            <p className={styles.sub}>Please browse the <Link href="/" className={styles.inlineLink}>marketplace</Link>.</p>
          </>
        )}

        {screen === 'result' && rec && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={styles.h1}>Here is our suggestion</h1>
            <p className={styles.sub}>Based on your answers.</p>
            <div className={`${styles.card} ${styles.coverCard}`}>
              <div className={styles.offerCover}>
                <CoverImage src={coverUrl(rec.lead.cover_path)} alt="" />
                <span className={styles.badge}><AdvisorIcon name="star" size={15} /> Best fit for you</span>
              </div>
              <div className={styles.coverBody}>
                <h2 className={styles.h2}>{rec.lead.title}</h2>
                <Price o={rec.lead} className={styles.priceRow} />
                <p className={styles.meta}>{whatYouGet(rec.lead)}</p>
                <p className={styles.why}>{whyItFits(rec.lead, answers)}</p>
                <TeamLine o={rec.lead} className={styles.teamLine} />
                {rec.lead.free_preview && (
                  <p className={styles.note} style={{ marginBottom: 14 }}><strong>Lesson 1 is free to watch</strong>, no account needed. Try it before you decide.</p>
                )}
                <a href={offeringHref(rec.lead, sessionId, utm)} className={styles.primary} onClick={(e) => go(e, 'lead_clicked')}>
                  {rec.lead.free_preview ? 'Watch Lesson 1 free' : Number(rec.lead.price_cents) === 0 ? 'Get it free' : `See the ${OFFERING_TYPE_LABELS[rec.lead.type]?.toLowerCase() || 'offer'}`}
                </a>
              </div>
            </div>

            {rec.alternates.length > 0 && (
              <section className={styles.section} aria-labelledby="alt-h" style={{ marginTop: 28 }}>
                <h2 id="alt-h" className={styles.h2} style={{ marginBottom: 14 }}>Also a good fit</h2>
                <div className={styles.offers}>
                  {rec.alternates.map((o) => (
                    <a key={o.id} href={offeringHref(o, sessionId, utm)} className={styles.offer} onClick={(e) => go(e, 'alternate_clicked')}>
                      <div className={styles.offerCover}>
                        <CoverImage src={coverUrl(o.cover_path)} alt="" />
                        {o.free_preview && <span className={styles.badge}><AdvisorIcon name="gift" size={15} /> Lesson 1 free</span>}
                      </div>
                      <div className={styles.offerBody}>
                        <span className={styles.offerTitle}>{o.title}</span>
                        <span className={styles.small}>{whatYouGet(o)}</span>
                        {o.type === 'course' && o.is_original && (
                          <span className={styles.small} style={{ fontStyle: 'italic' }}>A Rooted Together team course. Presenter is AI-generated.</span>
                        )}
                        <span className={styles.offerPrice}>
                          {formatPrice(o.price_cents)}
                          {hasDiscount(o) && <span className={styles.was}>{formatPrice(o.original_price_cents)}</span>}
                        </span>
                        <span className={styles.offerCta}>See it →</span>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {gift && (
              <section className={styles.guide} aria-labelledby="gift-h">
                <div className={styles.eyebrow} style={{ margin: 0 }}><AdvisorIcon name="gift" size={18} /> Free gift</div>
                <h2 id="gift-h" className={styles.h2} style={{ fontSize: 24 }}>Not ready yet? Start with {gift.title}</h2>
                {gift.subline && <p className={styles.sub} style={{ margin: '0 0 14px' }}>{gift.subline}</p>}
                {giftForm('res')}
              </section>
            )}

            <div className={styles.stack}>
              <button type="button" className={styles.linkBtn} onClick={declineLead}>No thanks</button>
            </div>
          </>
        )}

        {screen === 'upsell' && rec?.upsell && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={styles.h1}>Pairs well with {rec.lead.title}</h1>
            <div className={`${styles.card} ${styles.coverCard}`}>
              <div className={styles.offerCover}><CoverImage src={coverUrl(rec.upsell.cover_path)} alt="" /></div>
              <div className={styles.coverBody}>
              <h2 className={styles.h2}>{rec.upsell.title}</h2>
              <Price o={rec.upsell} className={styles.priceRow} />
              <p className={styles.meta}>{whatYouGet(rec.upsell)}</p>
              <p className={styles.why}>{pairLine(rec.upsell)}</p>
              <TeamLine o={rec.upsell} className={styles.teamLine} />
              {rec.upsell.free_preview && <p className={styles.note} style={{ marginBottom: 14 }}><strong>Lesson 1 is free to watch</strong>, no account needed.</p>}
              <a href={offeringHref(rec.upsell, sessionId, utm)} className={styles.primary} onClick={(e) => go(e, 'upsell_clicked')}>
                See {rec.upsell.title}
              </a>
              </div>
            </div>
            <div className={styles.stack}>
              <button type="button" className={styles.linkBtn} onClick={declineUpsell}>No thanks</button>
            </div>
          </>
        )}

        {screen === 'gift' && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={styles.h1}>Before you go, a free gift</h1>
            {gift ? (
              <div className={styles.card}>
                <div className={styles.pickLabel}><AdvisorIcon name="gift" size={16} /> Free</div>
                <h2 className={styles.h2}>{gift.title}</h2>
                {gift.subline && <p className={styles.why}>{gift.subline}</p>}
                {giftForm('gift')}
              </div>
            ) : (
              <p className={styles.sub}>There is no gift available right now.</p>
            )}
            <div className={styles.stack}>
              <button type="button" className={styles.linkBtn} onClick={() => setScreen('thanks')}>No thanks, I am done</button>
            </div>
          </>
        )}

        {screen === 'thanks' && (() => {
          const preview = previewItem(catalogue, rec);
          return (
            <>
              <h1 ref={headingRef} tabIndex={-1} className={styles.h1} style={{ marginTop: 28 }}>{giftSent ? 'Check your inbox' : 'Thank you for stopping by'}</h1>
              {giftSent && <p className={styles.sub}>{gift?.title || 'Your gift'} is on its way. If you do not see it in a few minutes, look in your spam or promotions folder.</p>}
              <p className={styles.verse}>&ldquo;Come unto me, all ye that labour and are heavy laden, and I will give you rest.&rdquo; Matthew 11:28 (KJV)</p>
              {preview && (
                <div className={styles.card}>
                  <h2 className={styles.h2}>Watch Lesson 1 of {preview.title} free</h2>
                  <p className={styles.meta}>No account needed.</p>
                  <TeamLine o={preview} className={styles.teamLine} />
                  <a href={offeringHref(preview, sessionId, utm)} className={styles.primary}>Watch Lesson 1 free</a>
                </div>
              )}
              <div className={styles.stack}>
                <Link href="/" className={styles.secondary}>Browse the marketplace</Link>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
