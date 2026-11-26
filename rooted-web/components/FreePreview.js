'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { formatDuration } from '@/lib/lessons';
import { getAttribution, trackLead, newEventId } from '@/lib/tracking';
import { track as trackSite } from '@/lib/analytics';
import MuxVideo from '@/components/MuxVideo';

// Lesson 1 of a course, free once you give your email, when the creator switched the free preview on.
// The email unlocks the video: it is saved (so we can see who took the free lesson and whether they later
// bought the course), and it subscribes them to the free daily devotional (the notice under the box says so).
// The video itself is only ever handed out by the free-lesson-signup function, never by a public query.
// On the same device the email is remembered, so coming back shows the lesson straight away.
// "Get the full course" runs the page's normal buy flow.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const storeKey = (id) => `rt_free_lesson_${id}`;

async function ask(body) {
  const res = await fetch('/api/free-lesson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok && !!json?.ok, json };
}

export default function FreePreview({ offeringId, offeringTitle = '', enabled, onGetFull, buying = false, priceLabel = '', priceCents = 0 }) {
  const [available, setAvailable] = useState(false);
  const [lesson, setLesson] = useState(null);
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // hidden field: real people leave it empty
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // True once the free lesson has played to the end (only phones and Safari can tell us; see MuxVideo).
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    // The box only appears once we know the answer. If this device unlocked the lesson before, that check
    // finishes first, so a returning visitor goes straight to the video and never sees the email form flash
    // up and then disappear while they are about to type.
    let remembered = '';
    try { remembered = localStorage.getItem(storeKey(offeringId)) || ''; } catch { /* storage blocked */ }
    supabase.rpc('has_free_preview', { p_offering: offeringId })
      .then(({ data }) => {
        if (data !== true) return null;
        if (!remembered) return true;
        return ask({ email: remembered, offering_id: offeringId, returning: true }).then(({ ok, json }) => {
          if (ok) { if (active) setLesson(json.lesson); } else {
            try { localStorage.removeItem(storeKey(offeringId)); } catch { /* storage blocked */ }
          }
          return true;
        });
      })
      .then((show) => { if (active && show) setAvailable(true); })
      .catch(() => {});
    return () => { active = false; };
  }, [offeringId, enabled]);

  if (!enabled || !available) return null;

  const lessonDone = () => {
    if (finished) return;
    setFinished(true);
    trackSite('free_lesson_completed', { props: { offering_id: offeringId } });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const clean = email.trim().toLowerCase();
    if (!EMAIL.test(clean)) { setError('Please enter a valid email address.'); return; }
    setBusy(true);
    try {
      const attr = getAttribution();
      const eventId = newEventId();
      const { ok, json } = await ask({
        email: clean,
        event_id: eventId,
        lead_source: 'free_lesson',
        content_name: offeringTitle,
        attribution: attr,
        website,
        offering_id: offeringId,
        utm_source: attr.utm_source || 'offering_page',
        utm_medium: attr.utm_medium || '',
        utm_campaign: attr.utm_campaign || '',
        utm_content: attr.utm_content || '',
      });
      if (!ok) { setError(json?.error || 'Something went wrong. Please try again.'); return; }
      try { localStorage.setItem(storeKey(offeringId), clean); } catch { /* storage blocked */ }
      trackSite('free_lesson_unlocked', { props: { offering_id: offeringId } });
      if (json.saved) trackLead({ source: 'free_lesson', contentName: offeringTitle, eventId });
      setLesson(json.lesson);
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div id="free-lesson" style={{ marginTop: 28, scrollMarginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--brown)' }}>Watch Lesson 1 free</div>
        <span className="badge">FREE PREVIEW</span>
      </div>

      {lesson?.mux_playback_id ? (
        <>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
            {lesson.title || 'Lesson 1'}
            {lesson.duration_seconds ? ` · ${formatDuration(lesson.duration_seconds)}` : ''}
          </div>
          <div className="card" style={{ padding: 14 }}>
            <MuxVideo playbackId={lesson.mux_playback_id} title={lesson.title || 'Lesson 1 free preview'} onEnded={lessonDone} />
          </div>
          {/* Upgrade panel: shown as soon as the lesson is unlocked, so a viewer who watches a little, or all of it, always has the next step in front of them. */}
          <div id="upgrade-panel" className="card" style={{ padding: 18, marginTop: 12, background: 'var(--cream-dark, #F3ECE3)' }}>
            <div className="serif" style={{ fontSize: 17, fontWeight: 700, color: 'var(--brown)', lineHeight: 1.3 }}>
              {finished ? 'You finished Lesson 1. ' : ''}Continue with Lesson 2{priceLabel ? ` – get the full course for ${priceLabel}` : ''}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={buying}
              onClick={() => {
                trackSite('upgrade_panel_click', { props: { offering_id: offeringId, price_cents: priceCents || 0, finished } });
                if (onGetFull) onGetFull('upgrade');
              }}
              style={{ width: '100%', marginTop: 12 }}
            >
              {buying ? 'Opening secure checkout…' : `Get the full course${priceLabel ? ` – ${priceLabel}` : ''}`}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              try { localStorage.removeItem(storeKey(offeringId)); } catch { /* storage blocked */ }
              setLesson(null);
              setEmail('');
            }}
            className="muted"
            style={{ background: 'none', border: 0, padding: 0, marginTop: 10, fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer' }}
          >
            Not you? Use a different email
          </button>
        </>
      ) : (
        <>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
            Enter your email to unlock Lesson 1. No payment and no account needed.
          </div>
          <form onSubmit={submit} noValidate className="card" style={{ padding: 14, display: 'grid', gap: 10 }}>
            <label className="field-label" htmlFor="free-lesson-email" style={{ margin: 0 }}>Your email</label>
            <input
              id="free-lesson-email"
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
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Please wait…' : 'Unlock Lesson 1 free'}
            </button>
            <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, margin: 0, textAlign: 'center' }}>
              By unlocking the lesson you will also be subscribed to our free daily devotional (a verse, a short
              reflection and a prayer each morning). Unsubscribe any time.{' '}
              <Link href="/privacy" style={{ textDecoration: 'underline' }}>Privacy Policy</Link>
            </p>
          </form>
        </>
      )}
    </div>
  );
}
