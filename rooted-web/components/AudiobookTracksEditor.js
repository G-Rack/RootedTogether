'use client';

import { useRef } from 'react';
import {
  MAX_TRACKS, MAX_AUDIO_BYTES, audioMimeFor, titleFromFileName, uploadAudioTrack,
  formatDuration, formatTotalDuration,
} from '@/lib/lessons';

// The audiobook builder on the upload page, laid out like the course builder:
// pick how many chapters, then give each one a title and an audio file. The
// parent owns the `tracks` array (so Save can read it); this component edits it.
// Each item: { key, id|null, title, fileName, duration, status, error }
// status: 'empty' (no file yet) | 'uploading' | 'ready'

let keyCounter = 0;
export function newTrackSlot() {
  keyCounter += 1;
  return { key: `new-${Date.now()}-${keyCounter}`, id: null, title: '', fileName: '', duration: 0, status: 'empty', error: '' };
}

export function trackFromRow(row) {
  return {
    key: row.id,
    id: row.id,
    title: row.title || '',
    fileName: row.file_name || 'Audio',
    duration: Number(row.duration_seconds) || 0,
    status: 'ready',
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

export default function AudiobookTracksEditor({ session, tracks, setTracks, setRemoved }) {
  const inputRefs = useRef({});

  const update = (key, patch) => setTracks((list) => list.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  const setCount = (raw) => {
    let n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    n = Math.max(1, Math.min(MAX_TRACKS, n));
    if (n === tracks.length) return;
    if (n > tracks.length) {
      setTracks([...tracks, ...Array.from({ length: n - tracks.length }, () => newTrackSlot())]);
      return;
    }
    const dropped = tracks.slice(n);
    if (dropped.some((t) => t.status === 'uploading')) return;
    const hasContent = dropped.some((t) => t.id || t.title.trim());
    if (hasContent && !window.confirm(`Remove the last ${dropped.length} chapter${dropped.length === 1 ? '' : 's'}? Their audio files will be deleted when you save.`)) return;
    dropped.forEach((t) => { if (t.id) setRemoved((r) => [...r, t.id]); });
    setTracks(tracks.slice(0, n));
  };

  const removeTrack = (track) => {
    if (tracks.length <= 1 || track.status === 'uploading') return;
    if ((track.id || track.title.trim()) && !window.confirm('Remove this chapter? Its audio file will be deleted when you save.')) return;
    if (track.id) setRemoved((r) => [...r, track.id]);
    setTracks((list) => list.filter((t) => t.key !== track.key));
  };

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= tracks.length) return;
    setTracks((list) => {
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const clearFile = (track) => {
    if (track.id) setRemoved((r) => [...r, track.id]);
    update(track.key, { id: null, fileName: '', duration: 0, status: 'empty', error: '' });
  };

  const handleFile = async (track, index, file) => {
    if (!file) return;
    update(track.key, { error: '' });
    if (!audioMimeFor(file)) {
      update(track.key, { error: 'Please choose an MP3, M4A, WAV or AAC file.' });
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      update(track.key, { error: 'That file is over 250 MB. Try exporting it as a smaller MP3 or M4A.' });
      return;
    }
    // Fill in the chapter title from the file name if it's still blank.
    const suggested = track.title.trim() ? null : titleFromFileName(file.name);
    update(track.key, { status: 'uploading', fileName: file.name, ...(suggested ? { title: suggested } : {}) });
    try {
      const row = await uploadAudioTrack(session, file, { title: suggested || track.title, sortOrder: index });
      update(track.key, { id: row.id, status: 'ready', duration: Number(row.duration_seconds) || 0 });
    } catch {
      update(track.key, { status: 'empty', fileName: '', duration: 0, error: 'Couldn’t upload that file. Please try again.' });
    }
  };

  const totalSeconds = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);

  return (
    <div>
      <label className="field-label">Audiobook content</label>
      <div className="card" style={{ padding: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>How many chapters are in this audiobook?</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Each chapter is one audio file with its own title.
            {totalSeconds ? ` ${formatTotalDuration(totalSeconds)} so far.` : ' You can change this any time.'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" style={iconBtn} onClick={() => setCount(tracks.length - 1)} disabled={tracks.length <= 1} aria-label="Fewer chapters">−</button>
          <input
            className="input-field"
            type="number"
            min="1"
            max={MAX_TRACKS}
            value={tracks.length}
            onChange={(e) => setCount(e.target.value)}
            style={{ width: 70, textAlign: 'center' }}
            aria-label="Number of chapters"
          />
          <button type="button" style={iconBtn} onClick={() => setCount(tracks.length + 1)} disabled={tracks.length >= MAX_TRACKS} aria-label="More chapters">+</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tracks.map((track, index) => {
          const busy = track.status === 'uploading';
          return (
            <div key={track.key} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <div className="serif" style={{ fontSize: 15, fontWeight: 700, color: 'var(--brown)', flex: 1 }}>Chapter {index + 1}</div>
                <button type="button" style={iconBtn} onClick={() => move(index, -1)} disabled={index === 0 || busy} aria-label="Move up"><Arrow dir="up" /></button>
                <button type="button" style={iconBtn} onClick={() => move(index, 1)} disabled={index === tracks.length - 1 || busy} aria-label="Move down"><Arrow dir="down" /></button>
                {tracks.length > 1 && (
                  <button type="button" style={{ ...iconBtn, color: 'var(--error-text, #8A3B2F)' }} onClick={() => removeTrack(track)} disabled={busy} aria-label="Remove chapter">×</button>
                )}
              </div>

              <label className="field-label">Chapter title</label>
              <input
                className="input-field"
                value={track.title}
                maxLength={200}
                onChange={(e) => update(track.key, { title: e.target.value })}
                placeholder="e.g. Chapter 1 — Letting go"
                style={{ marginBottom: 12 }}
              />

              <label className="field-label">Audio</label>
              <input
                ref={(el) => { inputRefs.current[track.key] = el; }}
                type="file"
                accept=".mp3,.m4a,.wav,.aac,audio/*"
                style={{ display: 'none' }}
                onChange={(e) => { handleFile(track, index, e.target.files?.[0]); e.target.value = ''; }}
              />

              {track.status === 'empty' ? (
                <button
                  type="button"
                  onClick={() => inputRefs.current[track.key]?.click()}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: 'var(--white)', border: '1px dashed var(--brown-pale)', borderRadius: 10, padding: '18px 14px',
                    fontSize: 13, color: 'var(--text-soft)', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <UploadIcon />
                  Choose an audio file to upload
                </button>
              ) : (
                <div style={{ border: '1px solid rgba(107,66,38,0.2)', borderRadius: 10, padding: '12px 14px', background: 'var(--cream-dark, #F3ECE3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {track.fileName || 'Audio'}
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        {busy ? 'Uploading… (big files can take a minute)' : `✓ Ready${track.duration ? ` · ${formatDuration(track.duration)}` : ''}`}
                      </div>
                    </div>
                    {!busy && (
                      <button type="button" className="btn btn-outline btn-small" onClick={() => clearFile(track)}>Replace</button>
                    )}
                  </div>
                  {busy && (
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(107,66,38,0.15)', marginTop: 10, overflow: 'hidden' }}>
                      <div className="rt-indeterminate" style={{ height: 6, width: '40%', background: 'var(--brown)', borderRadius: 3 }} />
                    </div>
                  )}
                </div>
              )}
              {track.error ? <div className="error-banner" style={{ marginTop: 10 }}>{track.error}</div> : null}
            </div>
          );
        })}
      </div>
      <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
        Buyers listen in the page, chapter by chapter, and pick up where they left off. MP3, M4A, WAV or AAC, up to 250 MB each. The audio is private to buyers — never listed publicly.
      </div>
    </div>
  );
}
