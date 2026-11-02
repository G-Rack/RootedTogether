'use client';

import { useRef, useState } from 'react';
import { avatarUrl } from '@/lib/storage';
import { initialsFor } from '@/lib/roles';
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_BYTES, communityFileUrl, formatBytes } from '@/lib/pro';
import ProBadge from '@/components/ProBadge';

export function MemberAvatar({ member, size = 40 }) {
  const url = avatarUrl(member?.avatar_path);
  if (url) {
    return <div style={{ width: size, height: size, borderRadius: 999, flexShrink: 0, background: `center / cover no-repeat url(${url})` }} />;
  }
  return <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initialsFor(member?.display_name)}</div>;
}

export function AuthorLine({ member, when, extra }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <MemberAvatar member={member} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{member?.display_name || 'Member'}</span>
          <ProBadge small />
          {member?.is_moderator && <span className="badge" style={{ fontSize: 10, padding: '2px 8px' }}>Moderator</span>}
        </div>
        <div className="muted" style={{ fontSize: 12 }}>{when}{extra ? ` · ${extra}` : ''}</div>
      </div>
    </div>
  );
}

// A row of file chips. Each opens the private file through a short-lived signed link.
export function AttachmentList({ items }) {
  const [busy, setBusy] = useState(null);
  if (!items || items.length === 0) return null;
  const open = async (a) => {
    setBusy(a.id);
    const url = await communityFileUrl(a.storage_path);
    setBusy(null);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
      {items.map((a) => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--cream)', border: '1px solid rgba(107,66,38,0.12)', borderRadius: 10, flexWrap: 'wrap' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brown)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H8a3 3 0 00-3 3v12a3 3 0 003 3h8a3 3 0 003-3V8z" /><path d="M14 3v5h5" /></svg>
          <div style={{ minWidth: 0, flex: '1 1 160px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-word' }}>{a.file_name}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>{formatBytes(a.size_bytes)}</div>
          </div>
          <button type="button" className="btn btn-outline btn-xs" disabled={busy === a.id} onClick={() => open(a)}>
            {busy === a.id ? 'Opening…' : 'Download'}
          </button>
        </div>
      ))}
    </div>
  );
}

// Picks up to `max` files, checks size, and reports them to the parent. Shows removable chips.
export function FilePicker({ files, onChange, disabled, max = 3 }) {
  const ref = useRef(null);
  const [problem, setProblem] = useState('');
  const pick = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    setProblem('');
    const ok = [];
    for (const f of picked) {
      if (f.size > MAX_ATTACHMENT_BYTES) { setProblem(`"${f.name}" is over 10 MB, so it was not added.`); continue; }
      ok.push(f);
    }
    onChange([...files, ...ok].slice(0, max));
  };
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input ref={ref} type="file" accept={ATTACHMENT_ACCEPT} multiple onChange={pick} style={{ display: 'none' }} disabled={disabled} />
        <button type="button" className="file-btn" disabled={disabled || files.length >= max} onClick={() => ref.current?.click()}>
          Attach file
        </button>
        <span className="muted" style={{ fontSize: 12 }}>PDF, images or documents · up to 10 MB each · up to {max} files</span>
      </div>
      {files.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {files.map((f, i) => (
            <span key={`${f.name}-${i}`} className="check-chip is-checked" style={{ cursor: 'default' }}>
              {f.name} ({formatBytes(f.size)})
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', padding: 0, marginLeft: 4, color: 'var(--brown)', fontWeight: 700 }}>×</button>
            </span>
          ))}
        </div>
      )}
      {problem && <div className="muted" style={{ fontSize: 12, marginTop: 8, color: '#8A2C2C' }}>{problem}</div>}
    </div>
  );
}
