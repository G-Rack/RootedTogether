'use client';

import { useRef, useState } from 'react';
import {
  MAX_TRACKS, MAX_AUDIO_BYTES, audioMimeFor, titleFromFileName, uploadAudioTrack,
  formatDuration, formatTotalDuration,
} from '@/lib/lessons';

// The audiobook builder on the upload page: drop in one or many audio files, each
// becomes a chapter you can rename and reorder. The parent owns the `tracks` array
// (so Save can read it); this component edits it. Each item:
//   { key, id|null, title, fileName, duration, status, error }
// status: 'uploading' | 'ready'

let keyCounter = 0;

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

function HeadphonesIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--brown)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0118 0v6" />
      <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
    </svg>
  );
}

const iconBtn = {
  width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(107,66,38,0.2)', background: 'var(--white)',
  color: 'var(--brown)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

export default function AudiobookTracksEditor({ session, tracks, setTracks, setRemoved }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [notes, setNotes] = useState([]);

  const update = (key, patch) => setTracks((list) => list.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const problems = [];
    const room = Math.max(0, MAX_TRACKS - tracks.length);
    const accepted = [];
    // Files picked together are added in name order, so "01-…, 02-…" land in sequence.
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    files.forEach((file) => {
      if (!audioMimeFor(file)) problems.push(`${file.name}: please use an MP3, M4A, WAV or AAC file.`);
      else if (file.size > MAX_AUDIO_BYTES) problems.push(`${file.name}: over 250 MB — try exporting it as a smaller MP3 or M4A.`);
      else if (accepted.length >= room) problems.push(`${file.name}: an audiobook can have up to ${MAX_TRACKS} tracks.`);
      else accepted.push(file);
    });
    setNotes(problems);
    if (!accepted.length) return;

    const baseIndex = tracks.length;
    const slots = accepted.map((file) => {
      keyCounter += 1;
      return {
        key: `new-${Date.now()}-${keyCounter}`, id: null, title: titleFromFileName(file.name) || '',
        fileName: file.name, duration: 0, status: 'uploading', error: '', file,
      };
    });
    setTracks((list) => [...list, ...slots.map(({ file, ...rest }) => rest)]);

    // One at a time keeps big files from fighting for the connection.
    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      try {
        const row = await uploadAudioTrack(session, slot.file, { title: slot.title, sortOrder: baseIndex + i });
        update(slot.key, { id: row.id, status: 'ready', duration: Number(row.duration_seconds) || 0 });
      } catch (e) {
        setTracks((list) => list.filter((t) => t.key !== slot.key));
        setNotes((n) => [...n, `${slot.fileName}: couldn’t upload — ${e?.message && e.message.startsWith('Please') ? e.message : 'please try again.'}`]);
      }
    }
  };

  const removeTrack = (track) => {
    if (track.status === 'uploading') return;
    if (!window.confirm(`Remove “${track.title || track.fileName}”? Its audio file will be deleted when you save.`)) return;
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

  const totalSeconds = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  const uploadingCount = tracks.filter((t) => t.status === 'uploading').length;

  const dropzone = (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
      style={{
        background: dragOver ? 'var(--cream-dark)' : 'var(--white)',
        border: `1px dashed ${dragOver ? 'var(--brown)' : 'var(--brown-pale)'}`,
        borderRadius: 10, padding: tracks.length ? '16px 14px' : 26, textAlign: 'center', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}
    >
      <HeadphonesIcon size={tracks.length ? 18 : 24} />
      <div style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 600 }}>
        {tracks.length ? 'Add more chapters' : 'Drag your audio files here, or click to choose them'}
      </div>
      {!tracks.length && (
        <div className="muted" style={{ fontSize: 12 }}>
          Pick several at once — each file becomes a chapter. MP3, M4A, WAV or AAC, up to 250 MB each.
        </div>
      )}
    </div>
  );

  return (
    <div>
      <label className="field-label">Audiobook chapters</label>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".mp3,.m4a,.wav,.aac,audio/*"
        style={{ display: 'none' }}
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
      />

      {tracks.length > 0 && (
        <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
          {tracks.length} chapter{tracks.length === 1 ? '' : 's'}
          {totalSeconds ? ` · ${formatTotalDuration(totalSeconds)} in total` : ''}
          {uploadingCount ? ` · uploading ${uploadingCount}…` : ''}
        </div>
      )}

      {tracks.length > 0 && (
        <div className="card" style={{ overflow: 'hidden', marginBottom: 12 }}>
          {tracks.map((track, index) => {
            const busy = track.status === 'uploading';
            return (
              <div
                key={track.key}
                style={{ borderTop: index === 0 ? 'none' : '1px solid rgba(107,66,38,0.08)', padding: '12px 14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: 999, background: 'var(--cream-dark, #F3ECE3)', color: 'var(--brown)',
                      fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </div>
                  <input
                    className="input-field"
                    value={track.title}
                    maxLength={200}
                    onChange={(e) => update(track.key, { title: e.target.value })}
                    placeholder={`Chapter ${index + 1} title`}
                    aria-label={`Title for chapter ${index + 1}`}
                    style={{ flex: 1, minWidth: 160 }}
                  />
                  <button type="button" style={iconBtn} onClick={() => move(index, -1)} disabled={index === 0 || busy} aria-label="Move up"><Arrow dir="up" /></button>
                  <button type="button" style={iconBtn} onClick={() => move(index, 1)} disabled={index === tracks.length - 1 || busy} aria-label="Move down"><Arrow dir="down" /></button>
                  <button
                    type="button"
                    style={{ ...iconBtn, color: 'var(--error-text, #8A3B2F)', opacity: busy ? 0.4 : 1 }}
                    onClick={() => removeTrack(track)}
                    disabled={busy}
                    aria-label="Remove chapter"
                  >
                    ×
                  </button>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 6, marginLeft: 38, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {track.fileName}
                  {busy ? ' · uploading…' : ` · ✓ Ready${track.duration ? ` · ${formatDuration(track.duration)}` : ''}`}
                </div>
                {busy && (
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(107,66,38,0.15)', margin: '8px 0 0 38px', overflow: 'hidden' }}>
                    <div className="rt-indeterminate" style={{ height: 4, width: '40%', background: 'var(--brown)', borderRadius: 2 }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {dropzone}

      {notes.length > 0 && (
        <div className="error-banner" style={{ marginTop: 10 }}>
          {notes.map((n) => <div key={n}>{n}</div>)}
        </div>
      )}
      <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
        Buyers listen in the page, chapter by chapter, and pick up where they left off. The audio is private to buyers — never listed publicly.
      </div>
    </div>
  );
}
