'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import ProBadge from '@/components/ProBadge';
import ProUpgradeBanner from '@/components/ProUpgradeBanner';
import useAcademyProgress from '@/lib/useAcademyProgress';
import { lessonStepKeys, lessonMinutes } from '@/lib/academy';
import { formatBytes } from '@/lib/pro';

async function signedUrl(path, download = false) {
  const { data } = await supabase.storage.from('pro-academy').createSignedUrl(path, 3600, download ? { download: true } : undefined);
  return data?.signedUrl || null;
}

function DocIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h8l5 5v13H6z" /><path d="M14 3v5h5" /><path d="M9 13h7M9 17h5" />
    </svg>
  );
}

function Tick({ on }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 22, height: 22, borderRadius: '50%', flex: '0 0 auto', boxSizing: 'border-box',
        border: on ? '1.5px solid var(--brown)' : '1.5px solid #D9C7AE',
        background: on ? 'var(--brown)' : '#fff', color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
    </span>
  );
}

// A multi-chapter Academy course: chapter list, one PDF guide at a time, one action per chapter, one workbook.
export default function AcademyCourse({ lesson, BackLink }) {
  const { session, isPro } = useSession();
  const { done, loaded, error: progressError, setError: setProgressError, toggleDone } = useAcademyProgress(session, isPro);
  const [files, setFiles] = useState(null); // path -> size, for PDFs that exist in the bucket
  const [current, setCurrent] = useState(1);
  const [readUrl, setReadUrl] = useState(null);
  const [busy, setBusy] = useState('');
  const [fileError, setFileError] = useState('');
  const error = fileError || progressError;

  useEffect(() => {
    if (!session || !isPro) return undefined;
    let active = true;
    async function load() {
      const downs = await supabase.storage.from('pro-academy').list('downloads', { limit: 200 });
      if (!active) return;
      const found = {};
      (downs.data || []).forEach((f) => { found[`downloads/${f.name}`] = f.metadata?.size || 0; });
      setFiles(found);
    }
    load();
    return () => { active = false; };
  }, [session, isPro]);

  const chapters = lesson.chapters;
  const tpl = lesson.template;
  const keys = lessonStepKeys(lesson);
  const total = keys.length;
  const doneCount = keys.filter((k) => done.has(k)).length;
  const minutes = lessonMinutes(lesson);

  if (!isPro) {
    return (
      <div style={{ maxWidth: 820 }}>
        <BackLink />
        <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', marginBottom: 6 }}>{lesson.cardTitle}</div>
        <div className="muted" style={{ fontSize: 13.5, marginBottom: 22, lineHeight: 1.6 }}>{lesson.summary}</div>
        <ProUpgradeBanner title="The Academy is part of Creator Pro" />
        <div className="card" style={{ marginTop: 22, overflow: 'hidden' }}>
          {chapters.map((c, i) => (
            <div key={c.key} style={{ display: 'flex', gap: 14, padding: '14px 20px', borderTop: i ? '1px solid rgba(107,66,38,0.08)' : 'none', alignItems: 'baseline' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', width: 24 }}>{c.n}</span>
              <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600 }}>{c.title}</span>
              <span className="muted" style={{ fontSize: 12.5 }}>{c.minutes} min read</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!loaded || files === null) return <div className="skeleton" style={{ height: 300 }} />;

  const ch = chapters.find((c) => c.n === current) || chapters[0];
  const hasGuide = files[ch.file] !== undefined;
  const hasTemplate = files[tpl.path] !== undefined;
  const isDone = done.has(ch.key);

  const selectChapter = (n) => {
    setCurrent(n);
    setReadUrl(null);
    setFileError('');
    setProgressError('');
  };

  const readGuide = async () => {
    setBusy('read');
    setFileError('');
    setProgressError('');
    const url = await signedUrl(ch.file);
    setBusy('');
    if (!url) { setFileError('This guide could not be opened. Please try again.'); return; }
    setReadUrl(url);
  };

  const openInTab = async () => {
    setBusy('tab');
    setFileError('');
    const url = await signedUrl(ch.file);
    setBusy('');
    if (!url) { setFileError('This guide could not be opened. Please try again.'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadGuide = async () => {
    setBusy('dl');
    setFileError('');
    const url = await signedUrl(ch.file, true);
    setBusy('');
    if (!url) { setFileError('This guide could not be downloaded. Please try again.'); return; }
    window.location.href = url;
  };

  const downloadTemplate = async () => {
    setBusy('template');
    setFileError('');
    const url = await signedUrl(tpl.path);
    setBusy('');
    if (!url) { setFileError('This file could not be opened. Please try again.'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ maxWidth: 1040 }}>
      <BackLink />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)' }}>{lesson.cardTitle}</div>
        <ProBadge />
      </div>
      <div className="muted" style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 680 }}>
        {lesson.summary} About {minutes} minutes of reading in all. {doneCount} of {total} chapters done.
      </div>

      {error && <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>}

      <div className="responsive-2col" style={{ '--col-a': '1.7fr', '--col-b': '1fr', '--col-gap': '24px', marginTop: 24, alignItems: 'start' }}>
        {/* Chapter guide and action */}
        <div>
          <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ padding: '22px 24px', background: 'linear-gradient(135deg, #6B4226, #2E1B10)', color: '#FBF6EF' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: '#E8CDA8' }}>CHAPTER {ch.n} OF {total} · {ch.minutes} MIN READ</div>
              <div className="serif" style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, marginTop: 6 }}>{ch.title}</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, marginTop: 8, opacity: 0.9, maxWidth: 560 }}>{ch.summary}</div>
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {hasGuide ? (
                <>
                  {!readUrl && (
                    <button type="button" className="btn btn-primary btn-small" onClick={readGuide} disabled={busy === 'read'}>
                      {busy === 'read' ? 'Opening…' : 'Read this chapter'}
                    </button>
                  )}
                  {readUrl && (
                    <button type="button" className="btn btn-outline btn-small" onClick={() => setReadUrl(null)}>Close the reader</button>
                  )}
                  <button type="button" className="btn btn-outline btn-small" onClick={openInTab} disabled={busy === 'tab'}>Open in a new tab</button>
                  <button type="button" className="btn btn-outline btn-small" onClick={downloadGuide} disabled={busy === 'dl'}>
                    {busy === 'dl' ? 'Preparing…' : `Download PDF${files[ch.file] ? ` (${formatBytes(files[ch.file])})` : ''}`}
                  </button>
                </>
              ) : (
                <span className="muted" style={{ fontSize: 14 }}>This chapter&rsquo;s guide is coming soon.</span>
              )}
            </div>
            {readUrl && (
              <iframe
                title={`Chapter ${ch.n}: ${ch.title}`}
                src={`${readUrl}#view=FitH`}
                style={{ display: 'block', width: '100%', height: 'min(78vh, 820px)', border: 0, borderTop: '1px solid rgba(107,66,38,0.1)', background: '#fff' }}
              />
            )}
          </div>

          <label className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px 20px', marginTop: 14, cursor: 'pointer', background: isDone ? 'rgba(138,154,107,0.08)' : undefined }}>
            <input type="checkbox" checked={isDone} onChange={() => toggleDone(ch.key)} aria-label={`Mark chapter ${ch.n} done`} style={{ width: 20, height: 20, marginTop: 2, flex: '0 0 auto' }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'var(--gold)' }}>YOUR ACTION THIS WEEK</span>
              <span style={{ display: 'block', fontSize: 14.5, lineHeight: 1.55, marginTop: 4 }}>{ch.action}</span>
              <span className="muted" style={{ display: 'block', fontSize: 12.5, marginTop: 6 }}>{isDone ? 'Done. Well done.' : 'Tick this when you have done it.'}</span>
            </span>
          </label>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            {ch.n > 1 && <button type="button" className="btn btn-outline btn-small" onClick={() => selectChapter(ch.n - 1)}>Previous chapter</button>}
            {ch.n < total && <button type="button" className="btn btn-primary btn-small" onClick={() => selectChapter(ch.n + 1)}>Next chapter</button>}
          </div>
        </div>

        {/* Chapter list */}
        <div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ height: 6, background: 'var(--cream-dark, #F1E4D3)' }}>
              <div style={{ height: '100%', width: `${(doneCount / total) * 100}%`, background: 'var(--brown)', transition: 'width .25s' }} />
            </div>
            {chapters.map((c, i) => {
              const active = c.n === ch.n;
              const live = files[c.file] !== undefined;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => selectChapter(c.n)}
                  aria-current={active ? 'true' : undefined}
                  style={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', gap: 12, alignItems: 'center', padding: '13px 16px', cursor: 'pointer', borderTop: i ? '1px solid rgba(107,66,38,0.08)' : 'none', background: active ? 'rgba(200,146,63,0.12)' : 'transparent' }}
                >
                  <Tick on={done.has(c.key)} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: active ? 700 : 600, color: 'var(--text)' }}>{c.n}. {c.title}</span>
                    <span className="muted" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>{c.minutes} min read{live ? '' : ' · coming soon'}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="card" style={{ padding: '18px 18px', marginTop: 16, border: '1.5px solid #C8923F' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--cream-dark, #F1E4D3)', color: 'var(--brown)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><DocIcon /></div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: 'var(--gold)' }}>WORKBOOK</div>
                <div className="serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--brown)', marginTop: 2 }}>{tpl.title}</div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 4 }}>{tpl.summary}</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              {hasTemplate ? (
                <>
                  <button type="button" className="btn btn-primary btn-small" disabled={busy === 'template'} onClick={downloadTemplate}>
                    {busy === 'template' ? 'Opening…' : 'Download workbook'}
                  </button>
                  <span className="muted" style={{ fontSize: 12, marginLeft: 10 }}>{tpl.note}{files[tpl.path] ? ` · ${formatBytes(files[tpl.path])}` : ''}</span>
                </>
              ) : (
                <span className="muted" style={{ fontSize: 13 }}>Workbook coming soon</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {doneCount === total && (
        <div className="success-banner" style={{ marginTop: 18 }}>You have finished every chapter. Well done.</div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
        <Link href="/dashboard/promote/studio" className="btn btn-outline btn-small">Make a post in the Creative hub</Link>
        <Link href="/dashboard/community" className="btn btn-outline btn-small">Ask in the community</Link>
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 16 }}>
        No training can promise income; these show the steps that tend to work.
      </div>
    </div>
  );
}
