'use client';

import { useRef, useState } from 'react';

const ICONS = {
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="4" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M21 16l-4.5-4.5L8 20" />
    </>
  ),
  document: (
    <>
      <path d="M14 3H8a3 3 0 00-3 3v12a3 3 0 003 3h8a3 3 0 003-3V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
};

// Rooted Together styled replacement for the browser's grey "Choose file" button.
// Wraps a hidden native file input, so it behaves the same: `onChange` receives the
// normal change event (read the file with e.target.files?.[0]).
export default function FileField({
  accept,
  onChange,
  disabled,
  kind = 'image',
  label,
  hint,
}) {
  const inputRef = useRef(null);
  const [name, setName] = useState('');

  const handle = (e) => {
    setName(e.target.files?.[0]?.name || '');
    onChange?.(e);
  };

  const buttonLabel = label || (name ? 'Change' : kind === 'document' ? 'Choose a file' : 'Choose a photo');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minWidth: 0 }}>
      <input ref={inputRef} type="file" accept={accept} onChange={handle} disabled={disabled} style={{ display: 'none' }} />
      <button
        type="button"
        className="file-btn"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {ICONS[kind] || ICONS.image}
        </svg>
        {buttonLabel}
      </button>
      <span
        className="muted"
        style={{ fontSize: 12.5, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
      >
        {name ? `✓ ${name}` : hint || 'No file chosen'}
      </span>
    </div>
  );
}
