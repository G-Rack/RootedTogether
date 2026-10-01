'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { coverUrl, uploadCover, uploadContentFile } from '@/lib/storage';
import { OFFERING_TYPE_LABELS } from '@/lib/roles';

const TYPES = ['course', 'ebook', 'routine', 'call'];

const EXAMPLE_TEXT = {
  course: {
    title: '30 Days of Surrender',
    description: 'A guided, multi-part journey through daily surrender, prayer, and reflection — one lesson a day for 30 days.',
  },
  ebook: {
    title: 'Naming What Hurts',
    description: 'A gentle guide to putting words to grief before you can move through it…',
  },
  routine: {
    title: 'Morning Prayer & Gratitude Practice',
    description: 'A simple daily rhythm — a short prayer, a gratitude prompt, and a few minutes of quiet — to start each morning grounded.',
  },
  call: {
    title: '30-Minute Guidance Call',
    description: 'One-on-one time to talk through what’s on your heart and receive personal prayer and guidance.',
  },
};

function UploadIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--brown)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

function UploadPageInner() {
  const { session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [type, setType] = useState('course');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceDollars, setPriceDollars] = useState('');
  const [coverPath, setCoverPath] = useState(null);
  const [contentUrl, setContentUrl] = useState('');
  const [contentFileName, setContentFileName] = useState('');
  const [calendlyUrl, setCalendlyUrl] = useState('');
  const [callDuration, setCallDuration] = useState('30');
  const [isFreeForFamily, setIsFreeForFamily] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(!!editId);
  const [busy, setBusy] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const coverInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!editId) return;
    let active = true;
    async function load() {
      const [{ data: o }, { data: content }] = await Promise.all([
        supabase.from('offerings').select('*').eq('id', editId).maybeSingle(),
        supabase.from('offering_content').select('content_url').eq('offering_id', editId).maybeSingle(),
      ]);
      if (!active || !o) return;
      setType(o.type);
      setTitle(o.title);
      setDescription(o.description || '');
      setPriceDollars(o.price_cents ? String(o.price_cents / 100) : '');
      setCoverPath(o.cover_path);
      setCalendlyUrl(o.calendly_url || '');
      setCallDuration(o.call_duration_minutes ? String(o.call_duration_minutes) : '30');
      setIsFreeForFamily(o.is_free_for_family);
      setContentUrl(content?.content_url || '');
      if (content?.content_url) {
        try {
          setContentFileName(decodeURIComponent(content.content_url.split('/').pop()));
        } catch {
          setContentFileName('Uploaded file');
        }
      }
      setLoadingExisting(false);
    }
    load();
    return () => { active = false; };
  }, [editId]);

  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingCover(true);
    try {
      const path = await uploadCover(file, session.user.id);
      setCoverPath(path);
    } catch {
      setError("Couldn't upload that image.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleContentFile = async (file) => {
    if (!file) return;
    setError('');
    setUploadingFile(true);
    try {
      const { url, name } = await uploadContentFile(file, session.user.id);
      setContentUrl(url);
      setContentFileName(name);
    } catch {
      setError("Couldn't upload that file.");
    } finally {
      setUploadingFile(false);
    }
  };

  const save = async (status) => {
    setError('');
    if (!title.trim()) {
      setError('Give it a title first.');
      return;
    }
    setBusy(true);

    const row = {
      creator_auth_id: session.user.id,
      type,
      title: title.trim(),
      description,
      price_cents: isFreeForFamily ? 0 : Math.round(parseFloat(priceDollars || '0') * 100) || 0,
      is_free_for_family: isFreeForFamily,
      cover_path: coverPath,
      calendly_url: type === 'call' ? calendlyUrl : null,
      call_duration_minutes: type === 'call' ? parseInt(callDuration, 10) || null : null,
      status,
      updated_at: new Date().toISOString(),
    };

    let offeringId = editId;
    if (editId) {
      const { error: updateError } = await supabase.from('offerings').update(row).eq('id', editId);
      if (updateError) {
        setBusy(false);
        setError("Couldn't save — please try again.");
        return;
      }
    } else {
      const { data: inserted, error: insertError } = await supabase.from('offerings').insert(row).select().single();
      if (insertError) {
        setBusy(false);
        setError("Couldn't save — please try again.");
        return;
      }
      offeringId = inserted.id;
    }

    if (type !== 'call' && contentUrl.trim()) {
      await supabase.from('offering_content').upsert({
        offering_id: offeringId,
        content_url: contentUrl.trim(),
        updated_at: new Date().toISOString(),
      });
    }

    setBusy(false);
    router.push('/dashboard');
  };

  if (loadingExisting) {
    return <div className="skeleton" style={{ height: 400 }} />;
  }

  const cover = coverUrl(coverPath);

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', marginBottom: 6 }}>
        {editId ? 'Edit Offering' : 'Upload a New Offering'}
      </div>
      <div className="muted" style={{ fontSize: 13.5, marginBottom: 26 }}>
        Share it with the marketplace, or give it free to your Spiritual Family.
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <label className="field-label">Offering type</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={type === t ? 'btn btn-primary btn-small' : 'btn btn-outline btn-small'}
              >
                {OFFERING_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="field-label">Title</label>
          <input
            className="input-field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={EXAMPLE_TEXT[type].title}
          />
        </div>

        <div>
          <label className="field-label">Description</label>
          <textarea
            className="input-field"
            style={{ minHeight: 100, fontFamily: 'var(--sans)' }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={EXAMPLE_TEXT[type].description}
          />
        </div>

        <div className="responsive-2col" style={{ '--col-gap': '16px' }}>
          <div>
            <label className="field-label">Price (USD)</label>
            <input
              className="input-field"
              type="number"
              min="0"
              step="0.01"
              disabled={isFreeForFamily}
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              placeholder="9.00"
            />
          </div>
          <div>
            <label className="field-label">Cover image</label>
            <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} style={{ display: 'none' }} />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--white)',
                border: '1px dashed var(--brown-pale)',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 13,
                color: 'var(--text-soft)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {cover && (
                <div
                  style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: `center / cover no-repeat url(${cover})` }}
                />
              )}
              <UploadIcon />
              {uploadingCover ? 'Uploading…' : cover ? 'Change image' : 'Upload image'}
            </button>
          </div>
        </div>

        {type === 'call' ? (
          <div className="responsive-2col" style={{ '--col-gap': '16px' }}>
            <div>
              <label className="field-label">Calendly link</label>
              <input
                className="input-field"
                value={calendlyUrl}
                onChange={(e) => setCalendlyUrl(e.target.value)}
                placeholder="https://calendly.com/your-name/30min"
              />
            </div>
            <div>
              <label className="field-label">Call length (minutes)</label>
              <input
                className="input-field"
                type="number"
                min="5"
                value={callDuration}
                onChange={(e) => setCallDuration(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="field-label">File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.zip,.mp3,.mp4,.epub"
              style={{ display: 'none' }}
              onChange={(e) => handleContentFile(e.target.files?.[0])}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleContentFile(e.dataTransfer.files?.[0]);
              }}
              style={{
                background: dragOver ? 'var(--cream-dark)' : 'var(--white)',
                border: `1px dashed ${dragOver ? 'var(--brown)' : 'var(--brown-pale)'}`,
                borderRadius: 10,
                padding: 22,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <UploadIcon size={22} />
              <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>
                {uploadingFile ? 'Uploading…' : contentFileName ? contentFileName : 'Drag a PDF here, or click to upload'}
              </div>
              {contentFileName && !uploadingFile && (
                <div className="muted" style={{ fontSize: 11.5 }}>Click to replace</div>
              )}
            </div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
              This is what buyers receive after purchase — only shown to them, never listed publicly.
            </div>
          </div>
        )}

        <div className="success-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Give free to my Spiritual Family</div>
            <div style={{ fontSize: 12 }}>Skips the price entirely — visible only to your accepted family in the app.</div>
          </div>
          <label style={{ position: 'relative', width: 42, height: 24, flexShrink: 0, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isFreeForFamily}
              onChange={(e) => setIsFreeForFamily(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 999,
                background: isFreeForFamily ? 'var(--brown)' : 'var(--success-border)',
                transition: 'background 0.15s',
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: isFreeForFamily ? 21 : 3,
                width: 18,
                height: 18,
                borderRadius: 999,
                background: 'var(--white)',
                transition: 'left 0.15s',
              }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
          <button type="button" disabled={busy} onClick={() => save('draft')} className="btn btn-outline">
            Save as Draft
          </button>
          <button type="button" disabled={busy} onClick={() => save('published')} className="btn btn-primary">
            {busy ? 'Publishing…' : 'Publish to Marketplace'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: 400 }} />}>
      <UploadPageInner />
    </Suspense>
  );
}
