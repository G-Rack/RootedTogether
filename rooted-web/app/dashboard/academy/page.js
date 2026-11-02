'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import ProBadge from '@/components/ProBadge';
import ProUpgradeBanner from '@/components/ProUpgradeBanner';
import { COURSES, DOWNLOADS, ALL_LESSON_KEYS } from '@/lib/academy';
import { formatBytes } from '@/lib/pro';

async function signedUrl(path) {
  const { data } = await supabase.storage.from('pro-academy').createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

export default function AcademyPage() {
  const { session, isPro } = useSession();
  const [done, setDone] = useState(new Set());
  const [files, setFiles] = useState({}); // path -> size in bytes, for files that exist in the bucket
  const [open, setOpen] = useState(COURSES[0].key);
  const [playing, setPlaying] = useState(null); // { key, url }
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const loading = isPro && !loaded;

  useEffect(() => {
    if (!session || !isPro) return;
    let active = true;
    async function load() {
      const [{ data: prog }, vids, downs] = await Promise.all([
        supabase.from('pro_academy_progress').select('lesson_key').eq('user_id', session.user.id),
        supabase.storage.from('pro-academy').list('videos', { limit: 100 }),
        supabase.storage.from('pro-academy').list('downloads', { limit: 100 }),
      ]);
      if (!active) return;
      setDone(new Set((prog || []).map((r) => r.lesson_key)));
      const found = {};
      (vids.data || []).forEach((f) => { found[`videos/${f.name}`] = f.metadata?.size || 0; });
      (downs.data || []).forEach((f) => { found[`downloads/${f.name}`] = f.metadata?.size || 0; });
      setFiles(found);
      setLoaded(true);
    }
    load();
    return () => { active = false; };
  }, [session, isPro]);

  const toggleDone = useCallback(async (lessonKey) => {
    if (!session) return;
    const isDone = done.has(lessonKey);
    setDone((prev) => {
      const next = new Set(prev);
      if (isDone) next.delete(lessonKey); else next.add(lessonKey);
      return next;
    });
    const res = isDone
      ? await supabase.from('pro_academy_progress').delete().eq('user_id', session.user.id).eq('lesson_key', lessonKey)
      : await supabase.from('pro_academy_progress').insert({ user_id: session.user.id, lesson_key: lessonKey });
    if (res.error) {
      setError('Could not save your progress. Please try again.');
      setDone((prev) => {
        const next = new Set(prev);
        if (isDone) next.add(lessonKey); else next.delete(lessonKey);
        return next;
      });
    }
  }, [session, done]);

  const watch = async (lesson) => {
    setBusyKey(lesson.key);
    setError('');
    const url = await signedUrl(lesson.video);
    setBusyKey(null);
    if (!url) { setError('This video could not be opened. Please try again.'); return; }
    setPlaying({ key: lesson.key, url });
  };

  const download = async (path, key) => {
    setBusyKey(key);
    setError('');
    const url = await signedUrl(path);
    setBusyKey(null);
    if (!url) { setError('This file could not be opened. Please try again.'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const total = ALL_LESSON_KEYS.length;
  const doneCount = ALL_LESSON_KEYS.filter((k) => done.has(k)).length;
  const nextLesson = COURSES.flatMap((c) => c.lessons.map((l) => ({ ...l, course: c }))).find((l) => !done.has(l.key));

  if (!isPro) {
    return (
      <div style={{ maxWidth: 820 }}>
        <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', marginBottom: 6 }}>Academy</div>
        <div className="muted" style={{ fontSize: 13.5, marginBottom: 22, lineHeight: 1.6 }}>
          Short trainings, templates and a swipe file to help you sell more from your storefront.
        </div>
        <ProUpgradeBanner title="The Academy is part of Creator Pro" />
        <div style={{ display: 'grid', gap: 12, marginTop: 22 }}>
          {COURSES.map((c) => (
            <div key={c.key} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-soft)' }}>{c.kind}</div>
              <div className="serif" style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>{c.title}</div>
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 4 }}>{c.summary}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)' }}>Academy</div>
        <ProBadge />
      </div>
      <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 24, maxWidth: 640 }}>
        Short trainings, templates and a private community to help you sell more from your storefront. Your files and videos stay here for as long as your account is active.
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      {nextLesson && (
        <div className="card" style={{ padding: '20px 22px', marginBottom: 28, background: 'var(--brown)', color: 'var(--white)', border: 'none' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, opacity: 0.8 }}>
            {doneCount === 0 ? 'START HERE' : 'CONTINUE'}
          </div>
          <div className="serif" style={{ fontSize: 19, fontWeight: 700, marginTop: 4 }}>{nextLesson.course.title}</div>
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 2 }}>Lesson {nextLesson.n}: {nextLesson.title}</div>
          <button
            className="btn btn-small"
            style={{ background: 'var(--white)', color: 'var(--brown)', marginTop: 14 }}
            onClick={() => { setOpen(nextLesson.course.key); document.getElementById(`course-${nextLesson.course.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
          >
            {doneCount === 0 ? 'Start course' : 'Keep going'}
          </button>
        </div>
      )}
      {!nextLesson && (
        <div className="success-banner" style={{ marginBottom: 28 }}>You have finished every lesson. Take your action list into your storefront this week.</div>
      )}

      <div className="serif" style={{ fontSize: 19, fontWeight: 700, color: 'var(--brown)', marginBottom: 12 }}>Courses</div>
      <div style={{ display: 'grid', gap: 14, marginBottom: 32 }}>
        {COURSES.map((c) => {
          const cDone = c.lessons.filter((l) => done.has(l.key)).length;
          const isOpen = open === c.key;
          return (
            <div key={c.key} id={`course-${c.key}`} className="card" style={{ overflow: 'hidden' }}>
              <button
                onClick={() => setOpen(isOpen ? null : c.key)}
                aria-expanded={isOpen}
                style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '18px 20px', display: 'block' }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-soft)' }}>{c.kind}</div>
                <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>{c.title}</div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 4 }}>{c.summary}</div>
                <div style={{ height: 6, borderRadius: 999, background: 'var(--cream-dark)', marginTop: 12, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(cDone / c.lessons.length) * 100}%`, background: 'var(--brown)', borderRadius: 999 }} />
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{cDone} of {c.lessons.length} lessons complete</div>
              </button>
              {isOpen && (
                <div style={{ borderTop: '1px solid rgba(107,66,38,0.1)' }}>
                  {c.lessons.map((l) => {
                    const hasVideo = files[l.video] !== undefined;
                    const isDone = done.has(l.key);
                    const isPlaying = playing?.key === l.key;
                    return (
                      <div key={l.key} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(107,66,38,0.08)' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => toggleDone(l.key)}
                            aria-label={`Mark lesson ${l.n} complete`}
                            style={{ width: 18, height: 18, marginTop: 3, flexShrink: 0 }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>Lesson {l.n}: {l.title}</div>
                            <div className="muted" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 4 }}>
                              <strong style={{ color: 'var(--text)' }}>Your action:</strong> {l.action}
                            </div>
                            <div style={{ marginTop: 10 }}>
                              {hasVideo ? (
                                <button className="btn btn-outline btn-xs" disabled={busyKey === l.key} onClick={() => (isPlaying ? setPlaying(null) : watch(l))}>
                                  {isPlaying ? 'Hide video' : busyKey === l.key ? 'Opening…' : 'Watch lesson'}
                                </button>
                              ) : (
                                <span className="muted" style={{ fontSize: 12 }}>Video coming soon</span>
                              )}
                            </div>
                            {isPlaying && (
                              <video src={playing.url} controls autoPlay playsInline style={{ width: '100%', maxWidth: 640, borderRadius: 12, marginTop: 12, background: '#000' }} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="serif" style={{ fontSize: 19, fontWeight: 700, color: 'var(--brown)', marginBottom: 12 }}>Downloads</div>
      <div className="card" style={{ marginBottom: 32 }}>
        {DOWNLOADS.map((d, i) => {
          const path = `downloads/${d.file}`;
          const exists = files[path] !== undefined;
          return (
            <div key={d.file} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderTop: i ? '1px solid rgba(107,66,38,0.08)' : 'none', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{d.title}</div>
                <div className="muted" style={{ fontSize: 12 }}>{d.note}{exists && files[path] ? ` · ${formatBytes(files[path])}` : ''}</div>
              </div>
              {exists ? (
                <button className="btn btn-outline btn-xs" disabled={busyKey === path} onClick={() => download(path, path)}>
                  {busyKey === path ? 'Opening…' : 'Download'}
                </button>
              ) : (
                <span className="muted" style={{ fontSize: 12 }}>Coming soon</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Questions, wins or files to share?</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>The Pro community is where members ask, answer and swap what works.</div>
        </div>
        <Link href="/dashboard/community" className="btn btn-primary btn-small">Open community</Link>
      </div>

      <div className="muted" style={{ fontSize: 12, marginTop: 16 }}>
        {doneCount} of {total} lessons complete. No training can promise income; these show the steps that tend to work.
      </div>
    </div>
  );
}
