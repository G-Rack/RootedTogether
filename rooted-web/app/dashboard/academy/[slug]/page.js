'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import ProBadge from '@/components/ProBadge';
import ProUpgradeBanner from '@/components/ProUpgradeBanner';
import { getLesson, lessonStepKeys } from '@/lib/academy';
import useAcademyProgress from '@/lib/useAcademyProgress';
import { formatBytes } from '@/lib/pro';

async function signedUrl(path) {
  const { data } = await supabase.storage.from('pro-academy').createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

function StepHeading({ n, title, note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '34px 0 14px', flexWrap: 'wrap' }}>
      <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--brown)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{n}</span>
      <h2 className="serif" style={{ margin: 0, fontSize: 21, color: 'var(--brown)' }}>{title}</h2>
      {note && <span className="muted" style={{ fontSize: 13 }}>{note}</span>}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
  );
}

function DocIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h8l5 5v13H6z" /><path d="M14 3v5h5" /><path d="M9 13h7M9 17h5" />
    </svg>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard/academy" className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 600, marginBottom: 14 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      Academy
    </Link>
  );
}

export default function AcademyLessonPage() {
  const { slug } = useParams();
  const lesson = getLesson(slug);
  const { session, isPro } = useSession();
  const { done, loaded, error: progressError, setError: setProgressError, toggleDone } = useAcademyProgress(session, isPro);
  const [files, setFiles] = useState(null); // path -> size in bytes, for files that exist in the bucket
  const [videoUrl, setVideoUrl] = useState(null);
  const [busy, setBusy] = useState('');
  const [fileError, setFileError] = useState('');
  const error = fileError || progressError;

  useEffect(() => {
    if (!session || !isPro) return undefined;
    let active = true;
    async function load() {
      const [vids, downs] = await Promise.all([
        supabase.storage.from('pro-academy').list('videos', { limit: 100 }),
        supabase.storage.from('pro-academy').list('downloads', { limit: 100 }),
      ]);
      if (!active) return;
      const found = {};
      (vids.data || []).forEach((f) => { found[`videos/${f.name}`] = f.metadata?.size || 0; });
      (downs.data || []).forEach((f) => { found[`downloads/${f.name}`] = f.metadata?.size || 0; });
      setFiles(found);
    }
    load();
    return () => { active = false; };
  }, [session, isPro]);

  if (!lesson) {
    return (
      <div style={{ maxWidth: 640 }}>
        <BackLink />
        <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)' }}>We could not find that lesson</div>
        <div className="muted" style={{ fontSize: 14, marginTop: 6 }}>Head back to the Academy to see all the lessons.</div>
      </div>
    );
  }

  const tpl = lesson.template;
  const keys = lessonStepKeys(lesson);
  const total = keys.length;
  const doneCount = keys.filter((k) => done.has(k)).length;
  const hasVideo = !!files && files[lesson.video] !== undefined;
  const hasTemplate = !!files && files[tpl.path] !== undefined;

  const playVideo = async () => {
    setBusy('video');
    setFileError('');
    setProgressError('');
    const url = await signedUrl(lesson.video);
    setBusy('');
    if (!url) { setFileError('This video could not be opened. Please try again.'); return; }
    setVideoUrl(url);
  };

  const downloadTemplate = async () => {
    setBusy('template');
    setFileError('');
    setProgressError('');
    const url = await signedUrl(tpl.path);
    setBusy('');
    if (!url) { setFileError('This file could not be opened. Please try again.'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isPro) {
    return (
      <div style={{ maxWidth: 820 }}>
        <BackLink />
        <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', marginBottom: 6 }}>{lesson.cardTitle}</div>
        <div className="muted" style={{ fontSize: 13.5, marginBottom: 22, lineHeight: 1.6 }}>{lesson.summary}</div>
        <ProUpgradeBanner title="The Academy is part of Creator Pro" />
        <div style={{ display: 'grid', gap: 12, marginTop: 22 }}>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-soft)' }}>{lesson.kind}</div>
            <div className="serif" style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>{lesson.title}</div>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 4 }}>{lesson.summary}</div>
          </div>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-soft)' }}>TEMPLATE</div>
            <div className="serif" style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>{tpl.title}</div>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 4 }}>{tpl.summary}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!loaded || files === null) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <div style={{ maxWidth: 960 }}>
      <BackLink />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)' }}>{lesson.cardTitle}</div>
        <ProBadge />
      </div>
      <div className="muted" style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 640 }}>
        Watch the video, fill in the template as you go, then take the {total} small actions below.
      </div>

      {error && <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>}

      {/* 1. Watch */}
      <StepHeading n="1" title="Watch the video" note={`${lesson.minutes} minutes`} />
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ position: 'relative', background: '#2E1B10', aspectRatio: '16 / 9', maxHeight: 540, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {videoUrl ? (
            <video src={videoUrl} controls autoPlay playsInline style={{ width: '100%', height: '100%', background: '#000' }} />
          ) : hasVideo ? (
            <button
              type="button"
              onClick={playVideo}
              disabled={busy === 'video'}
              aria-label={`Play ${lesson.title}`}
              style={{ all: 'unset', cursor: 'pointer', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: 24, boxSizing: 'border-box', background: lesson.cover ? `linear-gradient(rgba(46,27,16,0.55), rgba(46,27,16,0.7)), url(${lesson.cover}) center / cover` : 'linear-gradient(135deg, #6B4226, #2E1B10)', color: '#FBF6EF' }}
            >
              <span style={{ width: 76, height: 76, borderRadius: '50%', background: '#C8923F', color: '#2E1B10', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 4 }}><PlayIcon /></span>
              <span className="serif" style={{ fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 700 }}>{lesson.title}</span>
              <span style={{ fontSize: 14, opacity: 0.85 }}>{busy === 'video' ? 'Opening…' : `Play the ${lesson.minutes}-minute video`}</span>
            </button>
          ) : (
            <div style={{ textAlign: 'center', color: '#FBF6EF', padding: 24 }}>
              <div className="serif" style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 700 }}>{lesson.title}</div>
              <div style={{ fontSize: 14, opacity: 0.8, marginTop: 8 }}>The video is coming soon.</div>
            </div>
          )}
        </div>
        <div style={{ padding: '18px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: 'var(--gold)' }}>{lesson.kind}</div>
          <div className="serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--brown)', marginTop: 4 }}>{lesson.title}</div>
          <div className="muted" style={{ fontSize: 14, lineHeight: 1.6, marginTop: 6, maxWidth: 680 }}>{lesson.summary}</div>
        </div>
      </div>

      {/* 2. Template */}
      <StepHeading n="2" title="Download your template" note="Fill it in as you watch" />
      <div className="card" style={{ padding: 'clamp(18px, 3vw, 24px)', border: '1.5px solid #C8923F' }}>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--cream-dark, #F1E4D3)', color: 'var(--brown)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><DocIcon /></div>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: 'var(--gold)' }}>TEMPLATE</div>
            <div className="serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--brown)', marginTop: 4 }}>{tpl.title}</div>
            <div className="muted" style={{ fontSize: 14, lineHeight: 1.6, marginTop: 6 }}>{tpl.summary}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 14, color: 'var(--text)' }}>What is inside</div>
            <ul style={{ margin: '6px 0 0', paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>
              {tpl.inside.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
          <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
            {hasTemplate ? (
              <>
                <button type="button" className="btn btn-primary" disabled={busy === 'template'} onClick={downloadTemplate} style={{ minHeight: 48 }}>
                  {busy === 'template' ? 'Opening…' : 'Download template'}
                </button>
                <span className="muted" style={{ fontSize: 12 }}>{tpl.note}{files[tpl.path] ? ` · ${formatBytes(files[tpl.path])}` : ''}</span>
              </>
            ) : (
              <span className="muted" style={{ fontSize: 13 }}>Template coming soon</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Do */}
      <StepHeading n="3" title={`Take your ${total} actions`} note={`${doneCount} of ${total} done`} />
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ height: 6, background: 'var(--cream-dark, #F1E4D3)' }}>
          <div style={{ height: '100%', width: `${(doneCount / total) * 100}%`, background: 'var(--brown)', transition: 'width .25s' }} />
        </div>
        {lesson.steps.map((s, i) => {
          const isDone = done.has(s.key);
          return (
            <label key={s.key} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px 20px', borderTop: i ? '1px solid rgba(107,66,38,0.08)' : 'none', cursor: 'pointer', background: isDone ? 'rgba(138,154,107,0.08)' : 'transparent' }}>
              <input type="checkbox" checked={isDone} onChange={() => toggleDone(s.key)} aria-label={`Mark step ${s.n} done`} style={{ width: 20, height: 20, marginTop: 2, flex: '0 0 auto' }} />
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'var(--gold)' }}>STEP {s.n}</span>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 2, textDecoration: isDone ? 'line-through' : 'none', textDecorationColor: 'rgba(0,0,0,0.3)' }}>{s.title}</span>
                <span className="muted" style={{ display: 'block', fontSize: 13.5, lineHeight: 1.55, marginTop: 4 }}>{s.action}</span>
              </span>
            </label>
          );
        })}
      </div>
      {doneCount === total && (
        <div className="success-banner" style={{ marginTop: 14 }}>
          You have finished all {total} steps. Next, add your product and share it with the buttons below.
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
        <Link href="/dashboard/upload" className="btn btn-outline btn-small">Upload your first product</Link>
        <Link href="/dashboard/promote/studio" className="btn btn-outline btn-small">Make a post in the Creative hub</Link>
      </div>

      <div className="card" style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginTop: 34 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Questions, wins or files to share?</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>The Pro community is where members ask, answer and swap what works.</div>
        </div>
        <Link href="/dashboard/community" className="btn btn-primary btn-small">Open community</Link>
      </div>

      <div className="muted" style={{ fontSize: 12, marginTop: 16 }}>
        No training can promise income; these show the steps that tend to work.
      </div>
    </div>
  );
}
