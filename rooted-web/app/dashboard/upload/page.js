'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { coverUrl, uploadCover, uploadContentFile } from '@/lib/storage';
import { OFFERING_TYPE_LABELS } from '@/lib/roles';
import { OFFERING_TYPE_KEYS, OFFERING_TYPE_BY_KEY } from '@/lib/offeringTypes';
import { fetchLessons, deleteLesson } from '@/lib/lessons';
import { fetchPayoutsEnabled, setPendingPublish } from '@/lib/payouts';
import CoverImage from '@/components/CoverImage';
import CourseLessonsEditor, { newLessonSlot, lessonFromRow } from '@/components/CourseLessonsEditor';

const TYPES = OFFERING_TYPE_KEYS;
// Smallest price a paid item can have. Free items (price 0) are still allowed.
const MIN_PRICE_DOLLARS = 5;

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
  printable: {
    title: 'A Season of Prayer Journal',
    description: 'Twelve printable pages with a prayer prompt, a scripture to hold, and space to write what you notice each week.',
  },
  audio: {
    title: 'Evening Surrender: A Guided Prayer',
    description: 'A 15-minute guided prayer to slow down, release the day, and rest. Best listened to with headphones.',
  },
  template: {
    title: 'Small Group Leader Kit',
    description: 'An editable planner and session outlines for leading a small group through a study, ready to fill in and reuse.',
  },
  bundle: {
    title: 'The Morning Rhythm Bundle',
    description: 'A prayer journal, a guided audio, and a one-page planner from me, together in one download.',
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
  // Course lessons (each a video or a PDF) and the ones removed since the last save.
  const [lessons, setLessons] = useState(() => [newLessonSlot()]);
  const [removedLessons, setRemovedLessons] = useState([]);
  // null = still checking. Paid items can only be published once Stripe payouts are connected.
  const [payoutsReady, setPayoutsReady] = useState(null);

  const coverInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchPayoutsEnabled(session.user.id).then(setPayoutsReady).catch(() => setPayoutsReady(null));
  }, [session?.user?.id]);

  useEffect(() => {
    if (!editId) return;
    let active = true;
    async function load() {
      const [{ data: o }, { data: content }, lessonRows] = await Promise.all([
        supabase.from('offerings').select('*').eq('id', editId).maybeSingle(),
        supabase.from('offering_content').select('content_url').eq('offering_id', editId).maybeSingle(),
        fetchLessons(editId).catch(() => []),
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
      if (lessonRows.length > 0) setLessons(lessonRows.map(lessonFromRow));
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

  const lessonsUploading = type === 'course' && lessons.some((l) => l.status === 'uploading');

  const save = async (status) => {
    setError('');
    if (!title.trim()) {
      setError('Give it a title first.');
      return;
    }
    if (type === 'course') {
      if (lessons.some((l) => l.status === 'uploading')) {
        setError('A lesson is still uploading — wait for it to finish (or cancel it) before saving.');
        return;
      }
      if (status === 'published') {
        const n = lessons.findIndex((l) => l.status === 'empty' || !l.id);
        if (n !== -1) {
          setError(`Lesson ${n + 1} needs a ${lessons[n].kind === 'video' ? 'video' : 'PDF'} before you can publish.`);
          return;
        }
        const t = lessons.findIndex((l) => !l.title.trim());
        if (t !== -1) {
          setError(`Give Lesson ${t + 1} a title before publishing.`);
          return;
        }
        const p = lessons.findIndex((l) => l.status === 'processing');
        if (p !== -1) {
          setError(`Lesson ${p + 1} is still processing. Give it a minute or two, then publish.`);
          return;
        }
        const bad = lessons.findIndex((l) => l.status === 'errored');
        if (bad !== -1) {
          setError(`Lesson ${bad + 1} failed to process — replace its video and try again.`);
          return;
        }
      }
    }
    const priceNum = isFreeForFamily ? 0 : parseFloat(priceDollars || '0');
    if (!isFreeForFamily && (Number.isNaN(priceNum) || priceNum < 0)) {
      setError('Enter a valid price.');
      return;
    }
    if (!isFreeForFamily && priceNum > 0 && priceNum < MIN_PRICE_DOLLARS) {
      setError('Paid items start at $5. Set the price to $5.00 or more, or leave it at 0 to offer it free.');
      return;
    }
    // A paid item can't go live until payouts are connected (buyers' checkout would be
    // refused). Save it as a draft and take the creator to set up Stripe first.
    let effectiveStatus = status;
    let needsPayouts = false;
    if (status === 'published' && priceNum > 0) {
      const ready = payoutsReady === true || (await fetchPayoutsEnabled(session.user.id));
      if (!ready) {
        effectiveStatus = 'draft';
        needsPayouts = true;
      }
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
      status: effectiveStatus,
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

    if (type === 'course') {
      // Attach the lessons to this course in their current order. Slots with no
      // file yet (only possible when saving a draft) are left out.
      const filled = lessons.filter((l) => l.id);
      const results = await Promise.all(
        filled.map((l, i) =>
          supabase
            .from('offering_lessons')
            .update({ offering_id: offeringId, sort_order: i, title: l.title.trim() })
            .eq('id', l.id)
        )
      );
      if (results.some((r) => r.error)) {
        setBusy(false);
        setError('The course saved, but some lessons couldn’t be attached — please try saving again.');
        return;
      }
      // Lessons the creator removed: delete them (and their Mux videos / PDFs).
      await Promise.all(removedLessons.map((id) => deleteLesson(session, id).catch(() => {})));
      setRemovedLessons([]);
    }

    if (type !== 'call' && type !== 'course' && contentUrl.trim()) {
      await supabase.from('offering_content').upsert({
        offering_id: offeringId,
        content_url: contentUrl.trim(),
        updated_at: new Date().toISOString(),
      });
    }

    setBusy(false);
    if (needsPayouts) {
      setPendingPublish({ id: offeringId, title: title.trim() });
      router.push('/dashboard/payouts');
      return;
    }
    // Live now: straight to the "promote it" page (Instagram / TikTok tools).
    router.push(status === 'published' ? `/dashboard/promote?id=${offeringId}` : '/dashboard');
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
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Paid items start at $5. Leave it at 0 for a free item.</div>
            {payoutsReady === false && parseFloat(priceDollars || '0') > 0 && !isFreeForFamily && (
              <div className="error-banner" style={{ marginTop: 10, fontSize: 12.5 }}>
                To publish a paid item you first need to connect Stripe so you can get paid. When you click Publish,
                we’ll save this as a draft and take you to set it up.
              </div>
            )}
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
              <UploadIcon />
              {uploadingCover ? 'Uploading…' : cover ? 'Change image' : 'Upload image'}
            </button>
            {cover && (
              <div style={{ marginTop: 10 }}>
                <CoverImage src={cover} radius={10} />
              </div>
            )}
            <div className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
              Best size: 1600 × 900 px (a wide 16:9 picture). Any shape works — it’s shown whole, never cropped.
            </div>
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
        ) : type === 'course' ? (
          <>
            {contentUrl && !lessons.some((l) => l.id) && (
              <div className="muted" style={{ fontSize: 12.5 }}>
                This course currently has one file attached ({contentFileName || 'uploaded file'}). Buyers keep access to it;
                add lessons below to turn it into a multi-lesson course.
              </div>
            )}
            <CourseLessonsEditor
              session={session}
              lessons={lessons}
              setLessons={setLessons}
              removed={removedLessons}
              setRemoved={setRemovedLessons}
            />
          </>
        ) : (
          <div>
            <label className="field-label">File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept={OFFERING_TYPE_BY_KEY[type]?.accept || '.pdf,.doc,.docx,.zip,.mp3,.mp4,.epub'}
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
                {uploadingFile ? 'Uploading…' : contentFileName ? contentFileName : `Drag ${OFFERING_TYPE_BY_KEY[type]?.fileHint || 'a PDF'} here, or click to upload`}
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
          <button type="button" disabled={busy || lessonsUploading} onClick={() => save('draft')} className="btn btn-outline">
            Save as Draft
          </button>
          <button type="button" disabled={busy || lessonsUploading} onClick={() => save('published')} className="btn btn-primary">
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
