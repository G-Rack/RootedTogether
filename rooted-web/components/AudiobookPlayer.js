'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchLessons, audioSignedUrl, formatDuration, formatTotalDuration } from '@/lib/lessons';

// The chapter list + player on an audiobook's page.
//  - Buyers (and the creator): a real player with chapters, speed control,
//    auto-advance and "pick up where you left off". Audio is streamed through
//    short-lived private links.
//  - Everyone else: just the chapter titles ("What's inside"), no audio.

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function Icon({ d, size = 18, fill = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const circleBtn = {
  width: 40, height: 40, borderRadius: 999, border: '1px solid rgba(107,66,38,0.2)', background: 'var(--white)',
  color: 'var(--brown)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

function readSaved(offeringId) {
  try {
    const raw = window.localStorage.getItem(`rt-audiobook-${offeringId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSaved(offeringId, value) {
  try {
    window.localStorage.setItem(`rt-audiobook-${offeringId}`, JSON.stringify(value));
  } catch { /* private mode etc. — resume just won't work */ }
}

export default function AudiobookPlayer({ offeringId, owned, onLoaded }) {
  const [tracks, setTracks] = useState(null);
  const [current, setCurrent] = useState(0);
  const [src, setSrc] = useState('');
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef(null);
  const resumeAt = useRef(0);
  const autoplay = useRef(false);
  const lastSave = useRef(0);

  // Load the chapter list.
  useEffect(() => {
    let active = true;
    async function load() {
      let rows = [];
      try {
        if (owned) {
          rows = (await fetchLessons(offeringId)).filter((l) => l.kind === 'audio' && l.status === 'ready');
        } else {
          const { data } = await supabase.rpc('get_offering_outline', { p_offering: offeringId });
          rows = (data || []).filter((r) => r.kind === 'audio').map((r, i) => ({ id: `outline-${i}`, title: r.title, kind: r.kind, status: 'ready' }));
        }
      } catch {
        rows = [];
      }
      if (!active) return;
      setTracks(rows);
      if (owned && rows.length) {
        const saved = readSaved(offeringId);
        if (saved && Number.isInteger(saved.index) && saved.index >= 0 && saved.index < rows.length) {
          setCurrent(saved.index);
          resumeAt.current = Number(saved.time) || 0;
        }
      }
      if (onLoaded) onLoaded(rows.length);
    }
    load();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeringId, owned]);

  // Fetch a signed link whenever the chapter changes.
  const currentId = tracks && owned ? tracks[current]?.id : null;
  const currentPath = tracks && owned ? tracks[current]?.file_path : null;
  useEffect(() => {
    if (!currentPath) return undefined;
    let active = true;
    audioSignedUrl(currentPath)
      .then((url) => { if (active) { setError(''); setSrc(url); } })
      .catch(() => { if (active) setError('Couldn’t load that chapter — please try again.'); });
    return () => { active = false; };
  }, [currentId, currentPath]);

  if (!tracks || tracks.length === 0) return null;

  const total = tracks.reduce((sum, t) => sum + (Number(t.duration_seconds) || 0), 0);

  const select = (index, shouldPlay) => {
    if (index < 0 || index >= tracks.length) return;
    resumeAt.current = 0;
    autoplay.current = shouldPlay;
    if (index === current) {
      const el = audioRef.current;
      if (el) { el.currentTime = 0; if (shouldPlay) el.play().catch(() => {}); }
      return;
    }
    setSrc('');
    setCurrent(index);
  };

  const onLoadedMetadata = () => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = speed;
    if (resumeAt.current > 1 && resumeAt.current < (el.duration || Infinity) - 2) el.currentTime = resumeAt.current;
    resumeAt.current = 0;
    if (autoplay.current) {
      autoplay.current = false;
      el.play().catch(() => {});
    }
  };

  const onTimeUpdate = () => {
    const el = audioRef.current;
    if (!el) return;
    const now = Date.now();
    if (now - lastSave.current > 4000) {
      lastSave.current = now;
      writeSaved(offeringId, { index: current, time: Math.floor(el.currentTime) });
    }
  };

  const onEnded = () => {
    if (current < tracks.length - 1) select(current + 1, true);
    else writeSaved(offeringId, { index: 0, time: 0 });
  };

  const changeSpeed = (value) => {
    setSpeed(value);
    if (audioRef.current) audioRef.current.playbackRate = value;
  };

  const track = tracks[current];

  return (
    <div id="audiobook-player" style={{ marginTop: 28 }}>
      <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--brown)', marginBottom: 4 }}>
        {owned ? 'Listen' : 'What’s inside'}
      </div>
      <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
        {tracks.length} chapter{tracks.length === 1 ? '' : 's'}
        {owned && total ? ` · ${formatTotalDuration(total)}` : ''}
        {!owned ? ' — unlocked after you get this audiobook.' : ''}
      </div>
      {error && <div className="error-banner" style={{ marginBottom: 10 }}>{error}</div>}

      {owned && (
        <div className="card" style={{ padding: 18, marginBottom: 12 }}>
          <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Chapter {current + 1} of {tracks.length}
          </div>
          <div className="serif" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '4px 0 12px' }}>
            {track.title || `Chapter ${current + 1}`}
          </div>
          <audio
            ref={audioRef}
            src={src || undefined}
            controls
            preload="metadata"
            controlsList="nodownload"
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={onEnded}
            onError={() => { if (src) setError('That chapter stopped loading — reload the page and try again.'); }}
            style={{ width: '100%', display: 'block' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" style={{ ...circleBtn, opacity: current === 0 ? 0.4 : 1 }} disabled={current === 0} onClick={() => select(current - 1, playing)} aria-label="Previous chapter">
              <Icon d="M19 20L9 12l10-8v16zM5 19V5" />
            </button>
            <button type="button" style={{ ...circleBtn, opacity: current === tracks.length - 1 ? 0.4 : 1 }} disabled={current === tracks.length - 1} onClick={() => select(current + 1, playing)} aria-label="Next chapter">
              <Icon d="M5 4l10 8-10 8V4zM19 5v14" />
            </button>
            <div style={{ flex: 1 }} />
            <label className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              Speed
              <select
                className="input-field"
                value={speed}
                onChange={(e) => changeSpeed(Number(e.target.value))}
                style={{ width: 'auto', padding: '4px 8px', fontSize: 12.5 }}
              >
                {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
              </select>
            </label>
          </div>
          {owned && !src && !error && <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Loading chapter…</div>}
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {tracks.map((t, i) => {
          const active = owned && i === current;
          return (
            <div
              key={t.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
                borderTop: i === 0 ? 'none' : '1px solid rgba(107,66,38,0.08)',
                background: active ? 'var(--cream-dark, #F3ECE3)' : 'transparent',
              }}
            >
              <div
                style={{
                  width: 28, height: 28, borderRadius: 999, background: active ? 'var(--brown)' : 'var(--cream-dark, #F3ECE3)',
                  color: active ? '#fff' : 'var(--brown)', fontSize: 12.5, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t.title || `Chapter ${i + 1}`}</div>
                {owned && t.duration_seconds ? (
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{formatDuration(t.duration_seconds)}</div>
                ) : null}
              </div>
              {owned && (
                <button
                  type="button"
                  className={active && playing ? 'btn btn-outline btn-small' : 'btn btn-primary btn-small'}
                  onClick={() => {
                    if (active && playing) audioRef.current?.pause();
                    else if (active) { autoplay.current = false; audioRef.current?.play().catch(() => {}); }
                    else select(i, true);
                  }}
                >
                  {active && playing ? 'Pause' : 'Play'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
