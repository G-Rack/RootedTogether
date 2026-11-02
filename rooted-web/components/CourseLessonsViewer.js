'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchLessons, pdfSignedUrl, muxPlayerUrl, formatDuration } from '@/lib/lessons';

// The lesson list on a course's page.
//  - Buyers (and the creator): every lesson, in order. Videos play in the page,
//    PDFs open in a new tab through a short-lived private link.
//  - Everyone else: just the titles ("What's inside"), no files.
export default function CourseLessonsViewer({ offeringId, owned, onLoaded }) {
  const [lessons, setLessons] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      let rows = [];
      try {
        if (owned) {
          rows = (await fetchLessons(offeringId)).filter((l) => l.status === 'ready' || l.status === 'processing');
        } else {
          const { data } = await supabase.rpc('get_offering_outline', { p_offering: offeringId });
          rows = (data || []).map((r, i) => ({ id: `outline-${i}`, title: r.title, kind: r.kind, status: 'ready' }));
        }
      } catch {
        rows = [];
      }
      if (!active) return;
      setLessons(rows);
      if (onLoaded) onLoaded(rows.length);
    }
    load();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeringId, owned]);

  if (!lessons || lessons.length === 0) return null;

  const openPdf = async (lesson) => {
    setError('');
    setPdfBusy(lesson.id);
    try {
      const url = await pdfSignedUrl(lesson.file_path);
      window.open(url, '_blank', 'noopener');
    } catch {
      setError('Couldn’t open that PDF — please try again.');
    } finally {
      setPdfBusy(null);
    }
  };

  return (
    <div style={{ marginTop: 28 }}>
      <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--brown)', marginBottom: 4 }}>
        {owned ? 'Your lessons' : 'What’s inside'}
      </div>
      <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
        {lessons.length} lesson{lessons.length === 1 ? '' : 's'}
        {!owned ? ' — unlocked after you get this course.' : ''}
      </div>
      {error && <div className="error-banner" style={{ marginBottom: 10 }}>{error}</div>}

      <div className="card" style={{ overflow: 'hidden' }}>
        {lessons.map((lesson, i) => {
          const isOpen = owned && openId === lesson.id;
          const isVideo = lesson.kind === 'video';
          return (
            <div key={lesson.id} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(107,66,38,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: 28, height: 28, borderRadius: 999, background: 'var(--cream-dark, #F3ECE3)', color: 'var(--brown)',
                    fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{lesson.title || `Lesson ${i + 1}`}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {isVideo ? 'Video' : 'PDF'}
                    {isVideo && lesson.duration_seconds ? ` · ${formatDuration(lesson.duration_seconds)}` : ''}
                    {lesson.status === 'processing' ? ' · still processing' : ''}
                  </div>
                </div>
                {owned && lesson.status === 'ready' && (
                  isVideo ? (
                    <button type="button" className="btn btn-primary btn-small" onClick={() => setOpenId(isOpen ? null : lesson.id)}>
                      {isOpen ? 'Close' : 'Watch'}
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primary btn-small" disabled={pdfBusy === lesson.id} onClick={() => openPdf(lesson)}>
                      {pdfBusy === lesson.id ? 'Opening…' : 'Open PDF'}
                    </button>
                  )
                )}
              </div>
              {isOpen && isVideo && lesson.mux_playback_id && (
                <div style={{ padding: '0 18px 18px' }}>
                  <iframe
                    src={muxPlayerUrl(lesson.mux_playback_id)}
                    title={lesson.title || `Lesson ${i + 1}`}
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    style={{ width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: 10, background: '#000' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
