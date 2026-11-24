'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice, OFFERING_TYPE_LABELS } from '@/lib/roles';
import SaleTag from '@/components/SaleTag';
import styles from './advisor.module.css';
import { track as trackSite } from '@/lib/analytics';
import { QUESTIONS, needsCare, recommend, whyItFits, pairLine, previewItem } from '@/lib/advisor';

// rootedtogether.club/advisor: the course advisor ("Sales generator").
// Six questions plus an optional first name, one per screen, then one honest suggestion, one
// "pairs well with" offer and, if both are declined, the free gift. Visits are recorded only through
// the advisor_* database functions. The first name stays in this browser and is never stored.

const NAME_STEP = QUESTIONS.length + 1; // screens 1..6 are questions, 7 is the name
const TOTAL = NAME_STEP;
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

// Record a step. Never blocks the visitor for long, and a failure never stops the quiz.
async function track(sessionId, event, extra = {}) {
  // Site analytics get the step name only (never the care note, which stays anonymous).
  if (event !== 'care_note') trackSite(`advisor_${event}`, extra.p_recommended ? { props: { offering_id: extra.p_recommended } } : {});
  if (!sessionId) return;
  const call = supabase.rpc('advisor_event', { p_session: sessionId, p_event: event, ...extra });
  await Promise.race([call.then(() => null, () => null), new Promise((r) => setTimeout(r, 900))]);
}

function offeringHref(o, sessionId, utm) {
  const q = new URLSearchParams({ src: 'advisor' });
  if (sessionId) q.set('as', sessionId);
  if (utm?.utm_source) q.set('utm_source', utm.utm_source);
  if (utm?.utm_medium) q.set('utm_medium', utm.utm_medium);
  if (utm?.utm_campaign) q.set('utm_campaign', utm.utm_campaign);
  return `/offering/${o.id}?${q.toString()}`;
}

function whatYouGet(o) {
  if (o.type === 'call') return '30-minute call';
  if ((o.ready_video_lessons || 0) > 0) return `${o.ready_video_lessons} video lessons`;
  return `${OFFERING_TYPE_LABELS[o.type] || 'Download'}, delivered as a file`;
}

function TeamLine({ o, className }) {
  if (!(o?.type === 'course' && o?.is_original)) return null;
  return <p className={className}>A Rooted Together team course. Presenter is AI-generated.</p>;
}

function Price({ o, className }) {
  return (
    <div className={className}>
      <span>{formatPrice(o.price_cents)}</span>
      {Number(o.price_cents) > 0 && <SaleTag offering={o} size={16} />}
    </div>
  );
}

export default function AdvisorClient() {
  const [screen, setScreen] = useState(0); // 0 intro, 1..7 questions, then 'care' | 'result' | 'upsell' | 'gift' | 'thanks'
  const [answers, setAnswers] = useState({});
  const [name, setName] = useState('');
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

  // Move focus to each new screen's heading for keyboard and screen-reader users.
  useEffect(() => {
    headingRef.current?.focus();
  }, [screen]);

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
    setScreen((s) => s + 1);
  };

  const goBack = () => {
    setError('');
    if (screen === 'care') setScreen(1);
    else if (screen === 'result') setScreen(NAME_STEP);
    else if (screen === 'upsell') setScreen('result');
    else if (screen === 'gift') setScreen(rec?.upsell ? 'upsell' : 'result');
    else if (typeof screen === 'number' && screen > 0) setScreen(screen - 1);
  };

  const go = async (e, event) => {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    await track(sessionId, event);
    window.location.assign(href);
  };

  const declineLead = () => {
    if (rec?.upsell) setScreen('upsell');
    else { setScreen('gift'); track(sessionId, 'declined'); }
  };
  const declineUpsell = () => { setScreen('gift'); track(sessionId, 'declined'); };

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
      // The email is tied to the quiz answers only when the visitor ticked the box.
      if (consent && sessionId) {
        try { await supabase.rpc('advisor_save_email', { p_session: sessionId, p_email: clean }); } catch { /* best effort */ }
      }
      await track(sessionId, 'gift_claimed');
      if (json.saved && typeof window.fbq === 'function') { try { window.fbq('track', 'Lead'); } catch { /* ignore */ } }
      setGiftSent(true);
      setScreen('thanks');
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const progress = typeof screen === 'number' ? Math.round((screen / TOTAL) * 100) : 100;
  const showBack = screen !== 0 && screen !== 'thanks';
  const first = name.trim().split(/\s+/)[0]?.slice(0, 40) || '';

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        {showBack && (
          <div className={styles.topbar}>
            <button type="button" className={styles.back} onClick={goBack}>← Back</button>
            {typeof screen === 'number' && (
              <div className={styles.progress} role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        )}

        {screen === 0 && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={styles.h1}>Find your next step with God</h1>
            <p className={styles.lead}>
              Six short questions, under 90 seconds. We will suggest one course, book, routine or call from our marketplace that fits where you are today. No account needed.
            </p>
            {loadFailed ? (
              <div className={styles.error} role="alert">We could not load the marketplace just now. Please refresh the page in a moment.</div>
            ) : (
              <button type="button" className={styles.primary} onClick={start} disabled={!catalogue}>
                {catalogue ? 'Start' : 'Loading…'}
              </button>
            )}
          </>
        )}

        {typeof screen === 'number' && screen >= 1 && screen <= QUESTIONS.length && (() => {
          const q = QUESTIONS[screen - 1];
          return (
            <>
              <p className={styles.step}>Question {screen} of {TOTAL}</p>
              <h1 ref={headingRef} tabIndex={-1} className={styles.h1} id={`q-${q.key}`}>{q.title}</h1>
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
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          );
        })()}

        {screen === NAME_STEP && (
          <form onSubmit={(e) => { e.preventDefault(); finish(answers); }}>
            <p className={styles.step}>Question {NAME_STEP} of {TOTAL} (optional)</p>
            <h1 ref={headingRef} tabIndex={-1} className={styles.h1}>What should we call you?</h1>
            <label className={styles.label} htmlFor="adv-name">First name</label>
            <input id="adv-name" className={styles.input} type="text" autoComplete="given-name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
            <p className={styles.small}>Only used on the next screen. We do not save it.</p>
            <div className={styles.stack}>
              <button type="submit" className={styles.primary}>See my suggestion</button>
              <button type="button" className={styles.linkBtn} onClick={() => { setName(''); finish(answers); }}>Skip</button>
            </div>
          </form>
        )}

        {screen === 'care' && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={styles.h1}>We are so sorry you are carrying this</h1>
            <p>You do not have to carry it alone, and reaching out is a brave and good thing to do.</p>
            <p>
              <strong>If you are in danger or thinking about harming yourself, please contact your local emergency services now.</strong>{' '}
              You can find a free helpline in your country at{' '}
              <a href="https://findahelpline.com" target="_blank" rel="noreferrer" style={{ color: 'var(--brown)', fontWeight: 700 }}>findahelpline.com</a>.
            </p>
            <p>Please also talk today with someone you trust: a pastor, a counselor, a doctor or a close friend.</p>
            <p className={styles.verse}>&ldquo;The LORD is nigh unto them that are of a broken heart.&rdquo; Psalm 34:18 (KJV)</p>
            <p className={styles.small}>This page is not medical or mental-health advice.</p>
          </>
        )}

        {screen === 'result' && !rec && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={styles.h1}>We could not find a match just now</h1>
            <p>Please browse the <Link href="/" style={{ color: 'var(--brown)', fontWeight: 700 }}>marketplace</Link>.</p>
          </>
        )}

        {screen === 'result' && rec && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={styles.h1}>{first ? `${first}, here is our suggestion` : 'Here is our suggestion'}</h1>
            <div className={styles.card}>
              <div className={styles.pickLabel}>Best fit for you</div>
              <h2 className={styles.h2}>{rec.lead.title}</h2>
              <Price o={rec.lead} className={styles.priceRow} />
              <p className={styles.meta}>{whatYouGet(rec.lead)}</p>
              <p className={styles.why}>{whyItFits(rec.lead, answers)}</p>
              <TeamLine o={rec.lead} className={styles.teamLine} />
              {rec.lead.free_preview && (
                <p className={styles.special}><strong>Lesson 1 is free to watch</strong>, no account needed. Try it before you decide.</p>
              )}
              <a href={offeringHref(rec.lead, sessionId, utm)} className={styles.primary} onClick={(e) => go(e, 'lead_clicked')}>
                {rec.lead.free_preview ? 'Watch Lesson 1 free' : Number(rec.lead.price_cents) === 0 ? 'Get it free' : `See ${OFFERING_TYPE_LABELS[rec.lead.type]?.toLowerCase() || 'it'}`}
              </a>
            </div>

            {rec.freeStep && (
              <div className={styles.card} style={{ marginTop: 14 }}>
                <div className={styles.pickLabel}>Not ready yet? Start free</div>
                <h2 className={styles.h2}>{rec.freeStep.title}</h2>
                <p className={styles.why}>{rec.freeStep.free_preview ? 'Lesson 1 is free to watch, no account needed.' : 'Free. '}{pairLine(rec.freeStep)}</p>
                <TeamLine o={rec.freeStep} className={styles.teamLine} />
                <a href={offeringHref(rec.freeStep, sessionId, utm)} className={styles.secondary} onClick={(e) => go(e, 'alternate_clicked')}>
                  {rec.freeStep.free_preview ? 'Watch Lesson 1 free' : 'Get it free'}
                </a>
              </div>
            )}

            {rec.alternates.filter((o) => o.id !== rec.freeStep?.id).length > 0 && (
              <>
                <h2 className={styles.h2} style={{ fontSize: 19, marginTop: 26 }}>Also a good fit</h2>
                <div className={styles.stack} style={{ marginTop: 10 }}>
                  {rec.alternates.filter((o) => o.id !== rec.freeStep?.id).map((o) => (
                    <a key={o.id} href={offeringHref(o, sessionId, utm)} className={`${styles.card} ${styles.alt}`} onClick={(e) => go(e, 'alternate_clicked')}>
                      <span className={styles.altTitle}>{o.title}</span>
                      <span className={styles.meta} style={{ display: 'block', margin: '2px 0 0' }}>
                        {formatPrice(o.price_cents)} · {whatYouGet(o)}
                      </span>
                      {o.type === 'course' && o.is_original && (
                        <span className={styles.small} style={{ display: 'block', fontStyle: 'italic' }}>A Rooted Together team course. Presenter is AI-generated.</span>
                      )}
                    </a>
                  ))}
                </div>
              </>
            )}

            <div className={styles.stack}>
              <button type="button" className={styles.linkBtn} onClick={declineLead}>No thanks</button>
            </div>
          </>
        )}

        {screen === 'upsell' && rec?.upsell && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={styles.h1}>Pairs well with {rec.lead.title}</h1>
            <div className={styles.card}>
              <h2 className={styles.h2}>{rec.upsell.title}</h2>
              <Price o={rec.upsell} className={styles.priceRow} />
              <p className={styles.meta}>{whatYouGet(rec.upsell)}</p>
              <p className={styles.why}>{pairLine(rec.upsell)}</p>
              <TeamLine o={rec.upsell} className={styles.teamLine} />
              {rec.upsell.free_preview && <p className={styles.special}><strong>Lesson 1 is free to watch</strong>, no account needed.</p>}
              <a href={offeringHref(rec.upsell, sessionId, utm)} className={styles.primary} onClick={(e) => go(e, 'upsell_clicked')}>
                See {rec.upsell.title}
              </a>
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
              <form onSubmit={claimGift} noValidate>
                <div className={styles.card}>
                  <h2 className={styles.h2}>{gift.title}</h2>
                  {gift.subline && <p className={styles.why}>{gift.subline}</p>}
                  <label className={styles.label} htmlFor="adv-email">Your email</label>
                  <input id="adv-email" className={styles.input} type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className={styles.hidden} value={website} onChange={(e) => setWebsite(e.target.value)} />
                  <label className={styles.check} htmlFor="adv-consent">
                    <input id="adv-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    <span>Also send me the daily devotional, and keep my quiz answers with my email so you can suggest courses that fit. I can unsubscribe at any time.</span>
                  </label>
                  {error && <div className={styles.error} role="alert">{error}</div>}
                  <div className={styles.stack}>
                    <button type="submit" className={styles.primary} disabled={busy}>{busy ? 'Please wait…' : 'Send me the gift'}</button>
                  </div>
                  <p className={styles.small} style={{ marginTop: 12 }}>
                    We email you this gift because you asked for it. See our <Link href="/privacy" style={{ textDecoration: 'underline' }}>privacy policy</Link>.
                  </p>
                </div>
              </form>
            ) : (
              <p>There is no gift available right now.</p>
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
              <h1 ref={headingRef} tabIndex={-1} className={styles.h1}>{giftSent ? 'Check your inbox' : 'Thank you for stopping by'}</h1>
              {giftSent && <p>{gift?.title || 'Your gift'} is on its way. If you do not see it in a few minutes, look in your spam or promotions folder.</p>}
              <p className={styles.verse}>&ldquo;Come unto me, all ye that labour and are heavy laden, and I will give you rest.&rdquo; Matthew 11:28 (KJV)</p>
              {preview && (
                <div className={styles.card}>
                  <h2 className={styles.h2}>Watch Lesson 1 of {preview.title} free</h2>
                  <p className={styles.meta}>No account needed.</p>
                  <TeamLine o={preview} className={styles.teamLine} />
                  <a href={offeringHref(preview, sessionId, utm)} className={styles.secondary}>Watch Lesson 1 free</a>
                </div>
              )}
              <div className={styles.stack}>
                <Link href="/" className={styles.linkBtn} style={{ textAlign: 'center' }}>Browse the marketplace</Link>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
