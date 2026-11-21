'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { avatarUrl, bannerUrl, uploadAvatar, uploadBanner } from '@/lib/storage';
import { initialsFor, ROLE_LABELS } from '@/lib/roles';
import { SOCIALS, activeSocials, formValue } from '@/lib/socials';
import ShareCard, { CARD_STYLES, CARD_FORMATS } from '@/components/ShareCard';

const STYLE_KEY = 'rt_card_style';
const CARD_ORDER = ['post', 'link', 'story'];

const cleanHandle = (v) => (v || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');

export default function BrandingPage() {
  const { session, profile } = useSession();
  const [storefront, setStorefront] = useState(null);
  const [stats, setStats] = useState({ offerings_count: 0, students_count: 0, followers_count: 0 });
  const [loading, setLoading] = useState(true);
  // Everything the creator types lives here, so the cards above the form change as they type,
  // before anything is saved.
  const [avatarPath, setAvatarPath] = useState(null);
  const [bannerPath, setBannerPath] = useState(null);
  const [handle, setHandle] = useState('');
  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [links, setLinks] = useState(() => Object.fromEntries(SOCIALS.map((so) => [so.key, ''])));
  const [cardStyle, setCardStyle] = useState('warm');

  useEffect(() => {
    if (!session) return;
    let active = true;
    async function load() {
      const [{ data: sf }, statsRes, followRes] = await Promise.all([
        supabase.from('creator_storefronts').select('*').eq('auth_user_id', session.user.id).maybeSingle(),
        supabase.rpc('creator_offering_stats', { creator_id: session.user.id }),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('followee_auth_id', session.user.id),
      ]);
      if (!active) return;
      setStorefront(sf || null);
      setAvatarPath(sf?.avatar_path || null);
      setBannerPath(sf?.banner_path || null);
      setHandle(sf?.handle || '');
      setTagline(sf?.tagline || '');
      setBio(sf?.bio || '');
      setLinks(Object.fromEntries(SOCIALS.map((so) => [so.key, formValue(so, sf?.[so.key])])));
      setStats({
        offerings_count: statsRes.data?.[0]?.offerings_count ?? 0,
        students_count: statsRes.data?.[0]?.students_count ?? 0,
        followers_count: followRes.count ?? 0,
      });
      try {
        const remembered = window.localStorage.getItem(STYLE_KEY);
        if (CARD_STYLES.some((s) => s.key === remembered)) setCardStyle(remembered);
      } catch {
        /* a browser that blocks storage just starts on Warm */
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [session]);

  const pickStyle = (key) => {
    setCardStyle(key);
    try {
      window.localStorage.setItem(STYLE_KEY, key);
    } catch {
      /* not remembered, still applied */
    }
  };

  if (loading) return <div className="skeleton" style={{ height: 400 }} />;

  const name = profile?.full_name || 'Your name';
  const role = ROLE_LABELS[profile?.role] || '';
  const avatar = avatarUrl(avatarPath);
  const banner = bannerUrl(bannerPath);
  const shownHandle = cleanHandle(handle).replace(/^-+|-+$/g, '') || 'your-handle';
  const liveSocials = activeSocials(Object.fromEntries(SOCIALS.map((so) => [so.key, so.toValue(links[so.key])])));
  const card = { name, role, handle: shownHandle, tagline, avatar, banner };

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '14px 28px' }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 'clamp(28px, 3.4vw, 36px)', lineHeight: 1.1, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--brown)' }}>
            Storefront Branding
          </h1>
          <p style={{ margin: '10px 0 0', maxWidth: 620, fontSize: 15.5, lineHeight: 1.55, color: 'var(--text-soft)' }}>
            This is your public page, and the cards you share to bring people to it. Pick a look, fill in your details, and watch it all update.
          </p>
        </div>
        {storefront?.handle && (
          <Link href={`/creator/${storefront.handle}`} target="_blank" className="btn btn-primary">
            View live storefront
          </Link>
        )}
      </div>

      <section aria-label="Your cards" style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
        <StorefrontCard card={card} socials={liveSocials} stats={stats} savedHandle={storefront?.handle} />
        <SharePanel card={card} cardStyle={cardStyle} onPick={pickStyle} />
      </section>

      <DetailsForm
        storefront={storefront}
        setStorefront={setStorefront}
        session={session}
        handle={handle}
        setHandle={setHandle}
        tagline={tagline}
        setTagline={setTagline}
        bio={bio}
        setBio={setBio}
        links={links}
        setLinks={setLinks}
        avatarPath={avatarPath}
        setAvatarPath={setAvatarPath}
        bannerPath={bannerPath}
        setBannerPath={setBannerPath}
        name={name}
      />
    </div>
  );
}

const SECTION_LABEL = { marginBottom: 12 };
const CARD_BOX = { background: '#fff', border: '1px solid #EADBC8', borderRadius: 26 };

function StorefrontCard({ card, socials, stats, savedHandle }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/creator/${savedHandle}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div style={{ flex: '0 1 400px', width: '100%', minWidth: 0 }}>
      <div className="sf-eyebrow" style={SECTION_LABEL}>Your storefront card</div>
      <div style={{ ...CARD_BOX, overflow: 'hidden', boxShadow: '0 14px 40px rgba(46,27,16,0.07)' }}>
        <div
          style={{
            height: 150,
            background: card.banner
              ? `center / cover no-repeat url(${card.banner})`
              : 'radial-gradient(70% 140% at 90% -20%, rgba(200,146,63,0.5), transparent 60%), linear-gradient(160deg, #6B4226 0%, #8C6A4A 100%)',
          }}
        />
        <div style={{ padding: '0 26px 26px' }}>
          {card.avatar ? (
            <div style={{ width: 96, height: 96, marginTop: -48, borderRadius: 999, border: '4px solid #fff', boxSizing: 'border-box', background: `center / cover no-repeat url(${card.avatar})`, boxShadow: '0 8px 20px rgba(46,27,16,0.2)' }} />
          ) : (
            <div className="avatar" style={{ width: 96, height: 96, marginTop: -48, fontSize: 30, border: '4px solid #fff', boxSizing: 'border-box', boxShadow: '0 8px 20px rgba(46,27,16,0.2)' }}>
              {initialsFor(card.name)}
            </div>
          )}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="serif" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.15, minWidth: 0 }}>{card.name}</div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#C8923F" stroke="rgba(46,27,16,0.3)" strokeWidth="1" role="img" aria-label="Approved creator" style={{ flex: 'none' }}>
              <path d="M12 2l2.4 2.1 3.1-.6.9 3 2.6 1.7-1 3 1 3-2.6 1.7-.9 3-3.1-.6L12 22l-2.4-2.1-3.1.6-.9-3-2.6-1.7 1-3-1-3 2.6-1.7.9-3 3.1.6z" />
            </svg>
          </div>
          {card.role && <div className="sf-eyebrow" style={{ marginTop: 6 }}>{card.role}</div>}
          <div className="muted" style={{ marginTop: 3, fontSize: 14 }}>@{card.handle}</div>
          {card.tagline && <p style={{ margin: '12px 0 0', fontSize: 15.5, lineHeight: 1.5 }}>{card.tagline}</p>}

          {socials.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {socials.map((so) => (
                <span key={so.key} title={so.label} style={{ width: 40, height: 40, borderRadius: 999, border: '1px solid rgba(107,66,38,0.2)', color: 'var(--brown)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {so.icon}
                </span>
              ))}
            </div>
          )}

          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            <Stat value={stats.offerings_count} label="offerings" />
            <Stat value={stats.students_count} label="students" />
            <Stat value={stats.followers_count} label="followers" />
          </div>

          {savedHandle ? (
            <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
              <button type="button" onClick={copyLink} className="btn btn-outline" style={{ flex: 1, padding: '12px 10px' }}>
                {copied ? 'Link copied' : 'Copy link'}
              </button>
              <Link href={`/creator/${savedHandle}`} target="_blank" className="btn btn-primary" style={{ flex: 1, padding: '12px 10px' }}>
                Open storefront
              </Link>
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 16, fontSize: 13, lineHeight: 1.5 }}>
              Save your details below to get your public link.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--cream)', border: '1px solid #F0E3D2' }}>
      <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)', lineHeight: 1.1 }}>{value}</div>
      <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>{label}</div>
    </div>
  );
}

function SharePanel({ card, cardStyle, onPick }) {
  const postRef = useRef(null);
  const linkRef = useRef(null);
  const storyRef = useRef(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [captionCopied, setCaptionCopied] = useState(false);

  const download = async (format) => {
    setMessage('');
    setBusy(format);
    try {
      const { toPng } = await import('html-to-image');
      const node = { post: postRef, link: linkRef, story: storyRef }[format].current;
      const spec = CARD_FORMATS[format];
      // Save it large and square-cornered: the size social apps expect, no shadow around it.
      const url = await toPng(node, { pixelRatio: spec.px / node.offsetWidth, cacheBust: true, style: { borderRadius: '0', boxShadow: 'none' } });
      const a = document.createElement('a');
      a.href = url;
      a.download = `${card.handle}-${spec.file}.png`;
      a.click();
    } catch {
      setMessage("Couldn't make that picture. Try again, or take a screenshot of the card.");
    } finally {
      setBusy('');
    }
  };

  const copyCaption = async () => {
    const link = `${window.location.origin}/creator/${card.handle}`;
    const text = `${card.tagline ? `${card.tagline}\n\n` : ''}My storefront is open on Rooted Together: courses, devotionals and teaching to help you grow in faith.\n${link}`;
    try {
      await navigator.clipboard.writeText(text);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2200);
    } catch {
      /* clipboard blocked */
    }
  };

  const cardWidth = { post: 300, link: 300, story: 240 };

  return (
    <div style={{ flex: '1 1 560px', minWidth: 0 }}>
      <div className="sf-eyebrow" style={SECTION_LABEL}>Cards to share</div>
      <div style={{ ...CARD_BOX, padding: 'clamp(18px, 2.4vw, 26px)' }}>
        <h2 className="serif" style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>Post your storefront</h2>
        <p style={{ margin: '6px 0 0', fontSize: 14.5, lineHeight: 1.5, color: 'var(--text-soft)' }}>
          Choose a style. Download a card, post it, and your link goes with it.
        </p>

        <div role="group" aria-label="Card style" style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {CARD_STYLES.map((s) => {
            const on = cardStyle === s.key;
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={on}
                onClick={() => onPick(s.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  borderRadius: 16,
                  cursor: 'pointer',
                  textAlign: 'left',
                  font: 'inherit',
                  background: on ? '#F7EFE4' : '#fff',
                  border: `2px solid ${on ? 'var(--brown)' : '#EADBC8'}`,
                  transition: 'border-color 0.15s ease, background 0.15s ease',
                }}
              >
                <span
                  className="serif"
                  style={{ width: 44, height: 44, flex: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, ...s.swatch }}
                >
                  Aa
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{s.label}</span>
                  <span style={{ display: 'block', marginTop: 2, fontSize: 12.5, lineHeight: 1.35, color: 'var(--text-soft)' }}>{s.note}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 26, display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26, maxWidth: '100%' }}>
            {['post', 'link'].map((format) => (
              <CardWithActions key={format} format={format} busy={busy === format} onDownload={() => download(format)}>
                <ShareCard ref={format === 'post' ? postRef : linkRef} variant={cardStyle} format={format} width={cardWidth[format]} {...card} />
              </CardWithActions>
            ))}
          </div>
          <div style={{ maxWidth: '100%' }}>
            <CardWithActions format="story" busy={busy === 'story'} onDownload={() => download('story')}>
              <ShareCard ref={storyRef} variant={cardStyle} format="story" width={cardWidth.story} {...card} />
            </CardWithActions>
            <div style={{ marginTop: 18, width: cardWidth.story, maxWidth: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 16, background: 'var(--cream)', border: '1px dashed var(--brown-pale)' }}>
              <div className="sf-eyebrow" style={{ fontSize: 11.5 }}>Suggested caption</div>
              <p style={{ margin: '6px 0 10px', fontSize: 13.5, lineHeight: 1.5 }}>
                My storefront is open on Rooted Together: courses, devotionals and teaching to help you grow in faith. Link in my bio.
              </p>
              <button type="button" onClick={copyCaption} className="btn btn-primary btn-small">
                {captionCopied ? 'Caption copied' : 'Copy caption'}
              </button>
            </div>
          </div>
        </div>
        {message && <div className="error-banner" style={{ marginTop: 18 }}>{message}</div>}
      </div>
    </div>
  );
}

function CardWithActions({ format, busy, onDownload, children }) {
  const spec = CARD_FORMATS[format];
  return (
    <div style={{ maxWidth: '100%' }}>
      <div style={{ maxWidth: '100%', overflowX: 'auto', paddingBottom: 4 }}>{children}</div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{spec.label}</div>
          <div className="muted" style={{ fontSize: 12.5 }}>{spec.size}</div>
        </div>
        <button type="button" onClick={onDownload} disabled={busy} className="btn btn-outline btn-small">
          {busy ? 'Making…' : 'Download'}
        </button>
      </div>
    </div>
  );
}

function UploadIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--brown)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

// Same dashed upload button as "Cover image" on the Upload page.
function DashedUpload({ inputRef, accept, onChange, busy, label }) {
  return (
    <>
      <input ref={inputRef} type="file" accept={accept} onChange={onChange} style={{ display: 'none' }} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: 56,
          background: 'var(--white)',
          border: '1px dashed var(--brown-pale)',
          borderRadius: 14,
          padding: '0 18px',
          fontSize: 14.5,
          color: 'var(--text-soft)',
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <UploadIcon />
        {busy ? 'Uploading…' : label}
      </button>
    </>
  );
}

const HINT = { marginTop: 8, fontSize: 13, lineHeight: 1.5, color: 'var(--text-soft)' };

function DetailsForm({ storefront, setStorefront, session, handle, setHandle, tagline, setTagline, bio, setBio, links, setLinks, avatarPath, setAvatarPath, bannerPath, setBannerPath, name }) {
  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingAvatar(true);
    try {
      setAvatarPath(await uploadAvatar(file, session.user.id));
    } catch {
      setError("Couldn't upload that photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingBanner(true);
    try {
      setBannerPath(await uploadBanner(file, session.user.id));
    } catch {
      setError("Couldn't upload that image.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setBusy(true);
    const row = {
      auth_user_id: session.user.id,
      handle: cleanHandle(handle),
      tagline,
      bio,
      ...Object.fromEntries(SOCIALS.map((so) => [so.key, so.toValue(links[so.key])])),
      banner_path: bannerPath,
      avatar_path: avatarPath,
      updated_at: new Date().toISOString(),
    };
    const { data, error: upsertError } = await supabase.from('creator_storefronts').upsert(row).select().single();
    setBusy(false);
    if (upsertError) {
      setError(upsertError.message.includes('duplicate') ? 'That handle is already taken. Try another.' : "Couldn't save. Please try again.");
      return;
    }
    setStorefront(data);
    setHandle(data.handle || '');
    setLinks(Object.fromEntries(SOCIALS.map((so) => [so.key, formValue(so, data[so.key])])));
    setSaved(true);
  };

  const discard = () => {
    setError('');
    setSaved(false);
    setHandle(storefront?.handle || '');
    setTagline(storefront?.tagline || '');
    setBio(storefront?.bio || '');
    setAvatarPath(storefront?.avatar_path || null);
    setBannerPath(storefront?.banner_path || null);
    setLinks(Object.fromEntries(SOCIALS.map((so) => [so.key, formValue(so, storefront?.[so.key])])));
  };

  const avatar = avatarUrl(avatarPath);
  const banner = bannerUrl(bannerPath);

  return (
    <section aria-label="Your details" style={{ marginTop: 36 }}>
      <div className="sf-eyebrow" style={SECTION_LABEL}>Your details</div>
      <form onSubmit={save} style={{ ...CARD_BOX, padding: 'clamp(20px, 3vw, 32px)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px 24px' }}>
          <div style={{ minWidth: 0 }}>
            <h2 className="serif" style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>Make it yours</h2>
            <p style={{ margin: '6px 0 0', fontSize: 14.5, lineHeight: 1.5, color: 'var(--text-soft)' }}>
              Your photo, banner, words and links. Everything you change here shows in the cards above as you type.
            </p>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999, background: '#F1E4D3', color: 'var(--brown)', fontSize: 13, fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#C8923F' }} />
            Live preview
          </div>
        </div>

        <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: '32px 44px' }}>
          <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 26 }}>
            <div>
              <label className="field-label" htmlFor="brand-handle">Handle</label>
              <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 50, border: '1px solid #EADBC8', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', background: 'var(--cream)', borderRight: '1px solid #EADBC8', fontSize: 13, color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>
                  rootedtogether.club/creator/
                </span>
                <input
                  id="brand-handle"
                  required
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="zee-robinson"
                  autoComplete="off"
                  style={{ flex: 1, minWidth: 0, border: 'none', padding: '0 14px', fontSize: 15.5, color: 'var(--text)', background: 'transparent', fontFamily: 'inherit' }}
                />
              </div>
              <div style={HINT}>Letters, numbers and dashes. This is your public link.</div>
            </div>

            <div>
              <div className="field-label">Profile picture</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {avatar ? (
                  <div style={{ width: 72, height: 72, borderRadius: 999, flexShrink: 0, background: `center / cover no-repeat url(${avatar})` }} />
                ) : (
                  <div className="avatar" style={{ width: 72, height: 72, fontSize: 24, flexShrink: 0 }}>{initialsFor(name)}</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <DashedUpload inputRef={avatarInputRef} accept="image/*" onChange={handleAvatarChange} busy={uploadingAvatar} label={avatar ? 'Change photo' : 'Upload photo'} />
                </div>
              </div>
              <div style={HINT}>A clear, square picture. It shows on your storefront and on every card.</div>
            </div>

            <div>
              <div className="field-label">Banner image</div>
              <DashedUpload inputRef={bannerInputRef} accept="image/*" onChange={handleBannerChange} busy={uploadingBanner} label={banner ? 'Change banner' : 'Upload banner'} />
              {banner && <div style={{ marginTop: 10, width: '100%', aspectRatio: '16 / 5', borderRadius: 12, background: `center / cover no-repeat url(${banner})` }} />}
              <div style={HINT}>Best size 1600 by 500. It sits across the top of your storefront and the Banner card style.</div>
            </div>
          </div>

          <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 26 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label className="field-label" htmlFor="brand-tagline">Tagline</label>
                <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>{tagline.length} of 80</span>
              </div>
              <input id="brand-tagline" className="input-field" maxLength={80} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="A short line under your name" />
              <div style={HINT}>One line that says who you help. It becomes the big words on your cards.</div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label className="field-label" htmlFor="brand-about">About</label>
                <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>{bio.length} of 600</span>
              </div>
              <textarea
                id="brand-about"
                className="input-field"
                maxLength={600}
                style={{ minHeight: 130, fontFamily: 'var(--sans)', lineHeight: 1.55 }}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell visitors who you are and how you can help."
              />
            </div>

            <div>
              <div className="field-label" style={{ marginBottom: 4 }}>How people can reach you</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-soft)', marginBottom: 12 }}>
                Only the ones you fill in appear. People can always message you in the Rooted Together app.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SOCIALS.map((so) => (
                  <div key={so.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span title={so.label} style={{ width: 42, height: 42, borderRadius: 999, flexShrink: 0, border: '1px solid rgba(107,66,38,0.2)', color: 'var(--brown)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {so.icon}
                    </span>
                    <input
                      className="input-field"
                      type="text"
                      aria-label={so.label}
                      value={links[so.key]}
                      onChange={(e) => setLinks((prev) => ({ ...prev, [so.key]: e.target.value }))}
                      placeholder={`${so.label}: ${so.placeholder}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #EADBC8' }}>
          {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}
          {saved && !error && <div className="success-banner" style={{ marginBottom: 14 }}>Saved. Your public page is up to date.</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 20px' }}>
            <button type="submit" disabled={busy || uploadingAvatar || uploadingBanner} className="btn btn-primary" style={{ minHeight: 52, padding: '0 34px', fontSize: 16 }}>
              {busy ? 'Saving…' : 'Save branding'}
            </button>
            <button type="button" onClick={discard} disabled={busy} className="btn" style={{ background: 'transparent', color: 'var(--brown)' }}>
              Discard changes
            </button>
            <span style={{ fontSize: 13.5, color: 'var(--text-soft)' }}>Your public page updates the moment you save.</span>
          </div>
        </div>
      </form>
    </section>
  );
}
