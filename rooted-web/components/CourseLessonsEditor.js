'use client';

import { useEffect, useRef } from 'react';
import {
  MAX_LESSONS, MAX_PDF_BYTES, fetchLessonStatuses, startVideoUpload, putToMux,
  uploadLessonPdf, deleteLesson,
} from '@/lib/lessons';

// The course builder on the upload page: pick how many lessons, then give each
// one a title and a video or PDF. The parent owns the `lessons` array (so Save
// can read it); this component edits it. Each item:
//   { key, id|null, kind:'video'|'pdf', title, fileName, status, progress, error }
// status: 'empty' (no file yet) | 'uploading' | 'processing' | 'ready' | 'errored'

let keyCounter = 0;
export function newLessonSlot(kind = 'video') {
  keyCounter += 1;
  return { key: `new-${Date.now()}-${keyCounter}`, id: null, kind, title: '', fileName: '', status: 'empty', progress: 0, error: '' };
}

export function lessonFromRow(row) {
  return {
    key: row.id,
    id: row.id,
    kind: row.kind,
    title: row.title || '',
    fileName: row.file_name || (row.kind === 'video' ? 'Video' : 'PDF'),
    status: row.status,
    progress: 1,
    error: '',
  };
}

function Arrow({ dir }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === 'up' ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brown)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

const iconBtn = {
  width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(107,66,38,0.2)', background: 'var(--white)',
  color: 'var(--brown)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

export default function CourseLessonsEditor({ session, lessons, setLessons, removed, setRemoved }) {
  const cancelRefs = useRef({});
  const inputRefs = useRef({});

  const update = (key, patch) => setLessons((list) => list.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  // Poll Mux processing status for videos that were just uploaded.
  const processingIds = lessons.filter((l) => l.id && l.kind === 'video' && l.status === 'processing').map((l) => l.id).join(',');
  useEffect(() => {
    if (!processingIds) return undefined;
    let active = true;
    const tick = async () => {
      const map = await fetchLessonStatuses(processingIds.split(','));
      if (!active) return;
      setLessons((list) => list.map((l) => {
        const row = l.id && map[l.id];
        if (!row || l.status !== 'processing') return l;
        if (row.status === 'ready') return { ...l, status: 'ready' };
        if (row.status === 'errored') return { ...l, status: 'errored', error: 'Mux couldn’t process this video. Try a different file.' };
        return l;
      }));
    };
    const timer = setInterval(tick, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [processingIds, setLessons]);

  const setCount = (raw) => {
    let n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    n = Math.max(1, Math.min(MAX_LESSONS, n));
    if (n === lessons.length) return;
    if (n > lessons.length) {
      setLessons([...lessons, ...Array.from({ length: n - lessons.length }, () => newLessonSlot())]);
      return;
    }
    const dropped = lessons.slice(n);
    const hasContent = dropped.some((l) => l.id || l.title.trim());
    if (hasContent && !window.confirm(`Remove the last ${dropped.length} lesson${dropped.length === 1 ? '' : 's'}? Their uploaded files will be deleted when you save.`)) return;
    dropped.forEach((l) => removeBookkeeping(l));
    setLessons(lessons.slice(0, n));
  };

  const removeBookkeeping = (lesson) => {
    if (cancelRefs.current[lesson.key]) cancelRefs.current[lesson.key].cancel();
    if (lesson.id) setRemoved((r) => [...r, lesson.id]);
  };

  const removeLesson = (lesson) => {
    if (lessons.length <= 1) return;
    if ((lesson.id || lesson.title.trim()) && !window.confirm('Remove this lesson? Its file will be deleted when you save.')) return;
    removeBookkeeping(lesson);
    setLessons((list) => list.filter((l) => l.key !== lesson.key));
  };

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= lessons.length) return;
    setLessons((list) => {
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const clearFile = (lesson) => {
    if (cancelRefs.current[lesson.key]) cancelRefs.current[lesson.key].cancel();
    if (lesson.id) setRemoved((r) => [...r, lesson.id]);
    update(lesson.key, { id: null, fileName: '', status: 'empty', progress: 0, error: '' });
  };

  const setKind = (lesson, kind) => {
    if (lesson.kind === kind || lesson.status !== 'empty') return;
    update(lesson.key, { kind, error: '' });
  };

  const handleFile = async (lesson, index, file) => {
    if (!file) return;
    update(lesson.key, { error: '' });

    if (lesson.kind === 'pdf') {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        update(lesson.key, { error: 'Please choose a PDF file.' });
        return;
      }
      if (file.size > MAX_PDF_BYTES) {
        update(lesson.key, { error: 'That PDF is over 50 MB. Try compressing it.' });
        return;
      }
      update(lesson.key, { status: 'uploading', progress: 0, fileName: file.name });
      try {
        const row = await uploadLessonPdf(session, file, { title: lesson.title, sortOrder: index });
        update(lesson.key, { id: row.id, status: 'ready', progress: 1 });
      } catch {
        update(lesson.key, { status: 'empty', fileName: '', error: 'Couldn’t upload that PDF. Please try again.' });
      }
      return;
    }

    if (!file.type.startsWith('video/')) {
      update(lesson.key, { error: 'Please choose a video file (MP4, MOV, …).' });
      return;
    }
    update(lesson.key, { status: 'uploading', progress: 0, fileName: file.name });
    let createdId = null;
    try {
      const { lessonId, uploadUrl } = await startVideoUpload(session, { title: lesson.title, sortOrder: index });
      createdId = lessonId;
      update(lesson.key, { id: lessonId });
      await putToMux(
        uploadUrl,
        file,
        (p) => update(lesson.key, { progress: p }),
        (handle) => { cancelRefs.current[lesson.key] = handle; },
      );
      delete cancelRefs.current[lesson.key];
      update(lesson.key, { status: 'processing', progress: 1 });
    } catch (e) {
      delete cancelRefs.current[lesson.key];
      if (createdId) deleteLesson(session, createdId).catch(() => {});
      update(lesson.key, {
        id: null, status: 'empty', fileName: '', progress: 0,
        error: e.message === 'cancelled' ? '' : (e.message || 'The upload didn’t finish.'),
      });
    }
  };

  return (
    <div>
      <label className="field-label">Course content</label>
      <div className="card" style={{ padding: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>How many lessons are in this course?</div>
          <div className="muted" style={{ fontSize: 12 }}>Each lesson is one video or one PDF. You can change this any time.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" style={iconBtn} onClick={() => setCount(lessons.length - 1)} disabled={lessons.length <= 1} aria-label="Fewer lessons">−</button>
          <input
            className="input-field"
            type="number"
            min="1"
            max={MAX_LESSONS}
            value={lessons.length}
            onChange={(e) => setCount(e.target.value)}
            style={{ width: 70, textAlign: 'center' }}
            aria-label="Number of lessons"
          />
          <button type="button" style={iconBtn} onClick={() => setCount(lessons.length + 1)} disabled={lessons.length >= MAX_LESSONS} aria-label="More lessons">+</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {lessons.map((lesson, index) => {
          const busy = lesson.status === 'uploading';
          const pct = Math.round((lesson.progress || 0) * 100);
          return (
            <div key={lesson.key} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <div className="serif" style={{ fontSize: 15, fontWeight: 700, color: 'var(--brown)', flex: 1 }}>Lesson {index + 1}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setKind(lesson, 'video')}
                    disabled={lesson.status !== 'empty'}
                    className={lesson.kind === 'video' ? 'btn btn-primary btn-small' : 'btn btn-outline btn-small'}
                  >
                    Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setKind(lesson, 'pdf')}
                    disabled={lesson.status !== 'empty'}
                    className={lesson.kind === 'pdf' ? 'btn btn-primary btn-small' : 'btn btn-outline btn-small'}
                  >
                    PDF
                  </button>
                </div>
                <button type="button" style={iconBtn} onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up"><Arrow dir="up" /></button>
                <button type="button" style={iconBtn} onClick={() => move(index, 1)} disabled={index === lessons.length - 1} aria-label="Move down"><Arrow dir="down" /></button>
                {lessons.length > 1 && (
                  <button type="button" style={{ ...iconBtn, color: 'var(--error-text, #8A3B2F)' }} onClick={() => removeLesson(lesson)} aria-label="Remove lesson">×</button>
                )}
              </div>

              <label className="field-label">Lesson title</label>
              <input
                className="input-field"
                value={lesson.title}
                maxLength={200}
                onChange={(e) => update(lesson.key, { title: e.target.value })}
                placeholder={lesson.kind === 'video' ? 'e.g. Day 1 — Letting go' : 'e.g. Day 1 workbook'}
                style={{ marginBottom: 12 }}
              />

              <label className="field-label">{lesson.kind === 'video' ? 'Video' : 'PDF'}</label>
              <input
                ref={(el) => { inputRefs.current[lesson.key] = el; }}
                type="file"
                accept={lesson.kind === 'video' ? 'video/*' : '.pdf,application/pdf'}
                style={{ display: 'none' }}
                onChange={(e) => { handleFile(lesson, index, e.target.files?.[0]); e.target.value = ''; }}
              />

              {lesson.status === 'empty' ? (
                <button
                  type="button"
                  onClick={() => inputRefs.current[lesson.key]?.click()}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: 'var(--white)', border: '1px dashed var(--brown-pale)', borderRadius: 10, padding: '18px 14px',
                    fontSize: 13, color: 'var(--text-soft)', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <UploadIcon />
                  {lesson.kind === 'video' ? 'Choose a video to upload' : 'Choose a PDF to upload'}
                </button>
              ) : (
                <div style={{ border: '1px solid rgba(107,66,38,0.2)', borderRadius: 10, padding: '12px 14px', background: 'var(--cream-dark, #F3ECE3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lesson.fileName || (lesson.kind === 'video' ? 'Video' : 'PDF')}
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        {lesson.status === 'uploading' && `Uploading… ${pct}%`}
                        {lesson.status === 'processing' && 'Uploaded — processing video (usually 1–2 minutes)…'}
                        {lesson.status === 'ready' && '✓ Ready'}
                        {lesson.status === 'errored' && 'Processing failed'}
                      </div>
                    </div>
                    {busy ? (
                      lesson.kind === 'video' ? (
                        <button type="button" className="btn btn-outline btn-small" onClick={() => cancelRefs.current[lesson.key]?.cancel()}>Cancel</button>
                      ) : null
                    ) : (
                      <button type="button" className="btn btn-outline btn-small" onClick={() => clearFile(lesson)}>Replace</button>
                    )}
                  </div>
                  {busy && (
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(107,66,38,0.15)', marginTop: 10, overflow: 'hidden' }}>
                      <div style={{ height: 6, width: `${pct}%`, background: 'var(--brown)', transition: 'width 0.2s' }} />
                    </div>
                  )}
                </div>
              )}
              {lesson.error ? <div className="error-banner" style={{ marginTop: 10 }}>{lesson.error}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
