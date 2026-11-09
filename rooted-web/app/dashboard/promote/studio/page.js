'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { avatarUrl, bannerUrl, coverUrl, communityImageUrl } from '@/lib/storage';
import { formatPrice, initialsFor, OFFERING_TYPE_LABELS, ROLE_LABELS } from '@/lib/roles';
import { OFFERING_TYPES, OFFERING_TYPE_BY_KEY } from '@/lib/offeringTypes';
import { fetchCreatorReviews } from '@/lib/reviews';
import { FORMATS, FORMATS_BY_PLATFORM, THEMES, loadImage, makeCreative } from '@/lib/creativeHub';
import { blurbFrom, buildCaption, CAPTION_VARIANTS } from '@/lib/creativeCaptions';

// Creative hub: turns a creator's own profile picture, banner, offering covers
// and reviews into post-ready pictures and captions for Instagram and TikTok.
// Neither app lets a website post for you, so the creator downloads the picture,
// copies the caption, and posts it. Everything is drawn in the browser.

const KINDS = [
  { key: 'storefront', label: 'My shop', hint: 'Your photo, your name and what you offer' },
  { key: 'offering', label: 'One offering', hint: 'Show a single course, ebook or routine' },
  { key: 'collage', label: 'Collage', hint: 'Covers of several offerings together' },
  { key: 'quote', label: 'Kind words', hint: 'A review from someone you helped' },
  { key: 'community', label: 'My community', hint: 'Invite people to join your in-app community' },
];

const CTA_OPTIONS = ['Shop my offerings', 'Link in my bio', 'Tap the link to shop'];
const COMMUNITY_CTA_OPTIONS = ['Join my community', 'Link in my bio', 'Tap the link to join'];

function CopyButton({ text, label, primary = false, disabled = false }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard can be unavailable; the text is on screen to select by hand.
    }
  };
  return (
    <button type="button" disabled={disabled} className={primary ? 'btn btn-primary btn-small' : 'btn btn-outline btn-small'} onClick={copy}>
      {copied ? 'Copied ✓' : label}
    </button>
  );
}

function Step({ n, title, children }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--brown)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{n}</span>
        <h2 className="serif" style={{ margin: 0, fontSize: 19, color: 'var(--brown)' }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function dataUrlToFile(dataUrl, name) {
  const [head, b64] = dataUrl.split(',');
  const mime = (head.match(/:(.*?);/) || [])[1] || 'image/png';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}

function StudioInner() {
  const { session, profile } = useSession();
  const searchParams = useSearchParams();
  const startPlatform = searchParams.get('platform') === 'tiktok' ? 'tiktok' : 'instagram';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const [platform, setPlatform] = useState(startPlatform);
  const [kind, setKind] = useState('storefront');
  const [theme, setTheme] = useState('brown');
  const [formatPick, setFormatPick] = useState('story');
  const [offeringId, setOfferingId] = useState(null);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [communityId, setCommunityId] = useState(null);
  const [usePhoto, setUsePhoto] = useState(true);
  const [ctaLabel, setCtaLabel] = useState(CTA_OPTIONS[0]);
  const [headlineEdit, setHeadlineEdit] = useState({});
  const [subEdit, setSubEdit] = useState({});
  const [variant, setVariant] = useState(0);
  const [captionEdit, setCaptionEdit] = useState(null);
  const [shareMsg, setShareMsg] = useState('');

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    async function load() {
      const [{ data: sf }, { data: offeringRows }, reviewRows, { data: communityRows }] = await Promise.all([
        supabase.from('creator_storefronts').select('*').eq('auth_user_id', userId).maybeSingle(),
        supabase.from('offerings').select('*').eq('creator_auth_id', userId).eq('status', 'published').order('sort_order'),
        fetchCreatorReviews(userId, 8),
        supabase.from('community_listing').select('*').eq('creator_auth_id', userId).order('created_at', { ascending: false }),
      ]);
      if (!active) return;
      if (!sf) {
        setData({ missing: true });
        setLoading(false);
        return;
      }
      const offerings = offeringRows || [];
      const communities = communityRows || [];
      const [avatar, banner, communityImgs, ...covers] = await Promise.all([
        loadImage(avatarUrl(sf.avatar_path)),
        loadImage(bannerUrl(sf.banner_path)),
        Promise.all(communities.slice(0, 6).map((c) => loadImage(communityImageUrl(c.image_path)))),
        ...offerings.slice(0, 12).map((o) => loadImage(coverUrl(o.cover_path))),
      ]);
      if (!active) return;
      const coverMap = {};
      offerings.slice(0, 12).forEach((o, i) => { coverMap[o.id] = covers[i]; });
      const communityList = communities.slice(0, 6).map((c, i) => ({ ...c, img: communityImgs[i] || null }));
      setData({ sf, offerings, reviews: (reviewRows || []).filter((r) => r.body && r.body.trim().length > 8), avatar, banner, coverMap, communityList });
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [userId]);

  const derived = useMemo(() => {
    if (!data || data.missing) return null;
    const { sf, offerings, reviews, avatar, banner, coverMap, communityList } = data;
    const name = profile?.full_name || sf.display_name || '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://rootedtogether.club';
    const url = `${origin}/creator/${sf.handle}`;
    const shortLink = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    const present = new Set(offerings.map((o) => o.type));
    const types = OFFERING_TYPES.filter((t) => present.has(t.key)).map((t) => t.plural);
    const paid = offerings.filter((o) => !o.is_free_for_family && o.price_cents > 0).map((o) => o.price_cents);
    const fromPrice = paid.length ? formatPrice(Math.min(...paid)) : '';
    const intro = sf.tagline || blurbFrom(sf.bio, 110);
    const toItem = (o) => ({
      id: o.id,
      title: o.title,
      img: coverMap[o.id] || null,
      tint: OFFERING_TYPE_BY_KEY[o.type]?.tint,
      ink: OFFERING_TYPE_BY_KEY[o.type]?.ink,
      typeLabel: OFFERING_TYPE_LABELS[o.type] || 'Offering',
      priceLabel: o.is_free_for_family ? 'Free for Spiritual Family' : o.price_cents ? formatPrice(o.price_cents) : 'Free',
      description: o.description,
    });
    const items = offerings.map(toItem);
    // Pictures first, so the collage shows real covers when there are some.
    const collageItems = [...items].sort((a, b) => Number(!!b.img) - Number(!!a.img)).slice(0, 4);
    const communities = (communityList || []).map((c) => ({
      id: c.id,
      name: c.name,
      blurb: blurbFrom(c.description, 150),
      description: c.description,
      icon: c.icon,
      img: c.img,
      members: Number(c.member_count) || 0,
      memberLabel: `${Number(c.member_count) || 0} ${Number(c.member_count) === 1 ? 'member' : 'members'}`,
      url: `${origin}/c/${c.id}`,
    }));
    return {
      sf, name, url, shortLink, types, fromPrice, intro, items, collageItems, reviews, avatar, banner, communities,
      role: ROLE_LABELS[profile?.role] || '',
      available: {
        storefront: true,
        offering: items.length >= 1,
        collage: items.length >= 2,
        quote: reviews.length >= 1,
        community: communities.length >= 1,
      },
    };
  }, [data, profile]);

  const allowedFormats = FORMATS_BY_PLATFORM[platform];
  const format = allowedFormats.includes(formatPick) ? formatPick : allowedFormats[0];

  const view = useMemo(() => {
    if (!derived) return null;
    const d = derived;
    const activeKind = d.available[kind] ? kind : 'storefront';
    const offering = d.items.find((o) => o.id === offeringId) || d.items[0] || null;
    const review = d.reviews[Math.min(quoteIdx, Math.max(0, d.reviews.length - 1))] || null;
    const community = d.communities.find((c) => c.id === communityId) || d.communities[0] || null;
    const ctaChoices = activeKind === 'community' ? COMMUNITY_CTA_OPTIONS : CTA_OPTIONS;
    const ctaValue = ctaChoices.includes(ctaLabel) ? ctaLabel : ctaChoices[0];
    const headline = headlineEdit[activeKind] ?? (activeKind === 'collage' ? 'Shop my offerings' : d.name);
    const sub = subEdit[activeKind] ?? (activeKind === 'collage' ? d.types.slice(0, 3).join(' · ') : d.intro);
    const spec = {
      kind: activeKind,
      format,
      theme,
      creator: { name: d.name, role: d.role, initials: initialsFor(d.name), avatar: d.avatar, banner: d.banner, usePhoto: usePhoto && !!d.banner },
      headline,
      sub,
      typesText: d.types.slice(0, 4).join(' · '),
      fromPrice: d.fromPrice,
      offering,
      collage: d.collageItems,
      quote: review && { body: review.body, reviewer: review.reviewer_name, offeringTitle: review.offering_title, rating: review.rating },
      community: community && { name: community.name, blurb: community.blurb, icon: community.icon, img: community.img, memberLabel: community.memberLabel },
      ctaLabel: ctaValue,
      linkText: activeKind === 'community' ? 'Free in the Rooted Together app' : d.shortLink,
    };
    return { activeKind, offering, review, community, ctaChoices, ctaValue, headline, sub, spec };
  }, [derived, kind, offeringId, quoteIdx, communityId, headlineEdit, subEdit, format, theme, usePhoto, ctaLabel]);

  const preview = useMemo(() => (view && typeof document !== 'undefined' ? makeCreative(view.spec) : null), [view]);

  const captionKey = view ? `${platform}|${view.activeKind}|${view.offering?.id}|${quoteIdx}|${view.community?.id}|${variant}` : '';
  const generated = useMemo(() => {
    if (!view || !derived) return '';
    return buildCaption({
      kind: view.activeKind,
      platform,
      url: view.activeKind === 'community' && view.community ? view.community.url : derived.url,
      name: derived.name,
      tagline: derived.sf.tagline,
      bio: derived.sf.bio,
      types: derived.types,
      fromPrice: derived.fromPrice,
      offering: view.offering,
      quote: view.review && { body: view.review.body, reviewer: view.review.reviewer_name, offeringTitle: view.review.offering_title },
      community: view.community && { name: view.community.name, description: view.community.description, memberCount: view.community.members },
    }, variant);
  }, [view, derived, platform, variant]);
  const caption = captionEdit && captionEdit.key === captionKey ? captionEdit.text : generated;

  if (!session || loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 36, width: 220, borderRadius: 10, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 420, borderRadius: 16 }} />
      </div>
    );
  }

  if (!derived || !view) {
    return (
      <div className="card" style={{ padding: 28, maxWidth: 560 }}>
        <h1 className="serif" style={{ marginTop: 0, color: 'var(--brown)' }}>Creative hub</h1>
        <p className="muted" style={{ lineHeight: 1.6 }}>Set up your storefront first, then come back here to make posts from your photo and offerings.</p>
        <Link href="/dashboard/branding" className="btn btn-primary">Set up my storefront</Link>
      </div>
    );
  }

  const safe = (derived.sf.handle || 'post').replace(/[^a-z0-9-]/gi, '');
  const fileName = `${safe}-${view.activeKind}-${format}.png`;
  const fmt = FORMATS[format];
  const platformName = platform === 'instagram' ? 'Instagram' : 'TikTok';
  const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function';

  const shareToPhone = async () => {
    if (!preview) return;
    try {
      const file = dataUrlToFile(preview, fileName);
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
        setShareMsg('');
      } else {
        setShareMsg('Sharing is not available here. Use Download instead.');
      }
    } catch {
      // The person closed the share sheet.
    }
  };

  const chip = (active) => ({
    padding: '9px 14px', borderRadius: 999, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
    border: active ? '2px solid var(--brown)' : '1.5px solid #EADBC8',
    background: active ? 'var(--brown)' : '#fff', color: active ? '#fff' : 'var(--text)',
  });

  return (
    <div>
      <style>{'@media (min-width: 900px) { .hub-preview { position: sticky; top: 12px; } }'}</style>
      <Link href="/dashboard" className="muted" style={{ fontSize: 13.5, textDecoration: 'none' }}>← Back to overview</Link>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '8px 0 6px' }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 34px)', color: 'var(--brown)' }}>Creative hub</h1>
        <div role="tablist" aria-label="Where to post" style={{ display: 'flex', gap: 8 }}>
          {[['instagram', 'Instagram'], ['tiktok', 'TikTok']].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={platform === k} onClick={() => { setPlatform(k); setCaptionEdit(null); }} style={chip(platform === k)}>{label}</button>
          ))}
        </div>
      </div>
      <p className="muted" style={{ margin: '0 0 22px', lineHeight: 1.6, maxWidth: 640 }}>
        Make a post from your own photo and offerings, then download it and copy the caption. You only need to post it once, then your link in your bio does the rest.
      </p>

      <div style={{ display: 'flex', gap: 'clamp(20px, 4vw, 40px)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Preview */}
        <div className="hub-preview" style={{ flex: '1 1 280px', maxWidth: 360, minWidth: 0, margin: '0 auto' }}>
          <div className="card" style={{ padding: 12 }}>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={`${view.activeKind} post preview`} style={{ width: '100%', aspectRatio: fmt.ratio, objectFit: 'cover', borderRadius: 12, display: 'block', maxHeight: '70vh', objectPosition: 'top' }} />
            ) : (
              <div className="skeleton" style={{ width: '100%', aspectRatio: fmt.ratio, borderRadius: 12 }} />
            )}
          </div>
          <div className="muted" style={{ fontSize: 12.5, margin: '8px 2px 10px', textAlign: 'center' }}>{fmt.label}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {preview && <a href={preview} download={fileName} className="btn btn-primary" style={{ minHeight: 48 }}>Download picture</a>}
            {preview && canShareFiles && <button type="button" className="btn btn-outline" onClick={shareToPhone} style={{ minHeight: 48 }}>Share from phone</button>}
          </div>
          {shareMsg && <div className="muted" style={{ fontSize: 12.5, marginTop: 8, textAlign: 'center' }}>{shareMsg}</div>}
        </div>

        {/* Controls */}
        <div style={{ flex: '2 1 360px', minWidth: 0 }}>
          <Step n="1" title="What do you want to post?">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              {KINDS.map((k) => {
                const on = view.activeKind === k.key;
                const ok = derived.available[k.key];
                return (
                  <button
                    key={k.key}
                    type="button"
                    disabled={!ok}
                    aria-pressed={on}
                    onClick={() => { setKind(k.key); setVariant(0); }}
                    style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 14, cursor: ok ? 'pointer' : 'not-allowed', opacity: ok ? 1 : 0.5, background: on ? '#FBF6EF' : '#fff', border: on ? '2px solid var(--brown)' : '1.5px solid #EADBC8', font: 'inherit', color: 'var(--text)' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--brown)' }}>{k.label}</div>
                    <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.4, marginTop: 2 }}>
                      {ok ? k.hint : k.key === 'quote' ? 'Appears once someone reviews you' : k.key === 'collage' ? 'Needs two live offerings' : k.key === 'community' ? 'Create a community in the app first' : 'Needs a live offering'}
                    </div>
                  </button>
                );
              })}
            </div>

            {view.activeKind === 'offering' && derived.items.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <label className="field-label" htmlFor="hub-offering">Which offering?</label>
                <select id="hub-offering" className="input-field" value={view.offering?.id || ''} onChange={(e) => { setOfferingId(e.target.value); setVariant(0); }}>
                  {derived.items.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                </select>
              </div>
            )}
            {view.activeKind === 'community' && derived.communities.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <label className="field-label" htmlFor="hub-community">Which community?</label>
                <select id="hub-community" className="input-field" value={view.community?.id || ''} onChange={(e) => { setCommunityId(e.target.value); setVariant(0); }}>
                  {derived.communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {view.activeKind === 'quote' && derived.reviews.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <label className="field-label" htmlFor="hub-review">Which review?</label>
                <select id="hub-review" className="input-field" value={quoteIdx} onChange={(e) => { setQuoteIdx(Number(e.target.value)); setVariant(0); }}>
                  {derived.reviews.map((r, i) => <option key={i} value={i}>{r.reviewer_name}: {blurbFrom(r.body, 50)}</option>)}
                </select>
              </div>
            )}
          </Step>

          <Step n="2" title="Pick a look">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              {Object.entries(THEMES).map(([key, t]) => (
                <button key={key} type="button" aria-pressed={theme === key} onClick={() => setTheme(key)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 6px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600, background: '#fff', color: 'var(--text)', border: theme === key ? '2px solid var(--brown)' : '1.5px solid #EADBC8' }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: `linear-gradient(135deg, ${t.bg[0]}, ${t.bg[1]})`, border: '1px solid rgba(0,0,0,0.12)' }} />
                  {t.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {allowedFormats.map((k) => (
                <button key={k} type="button" aria-pressed={format === k} onClick={() => setFormatPick(k)} style={chip(format === k)}>{FORMATS[k].label}</button>
              ))}
            </div>
            {view.activeKind === 'storefront' && derived.banner && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={usePhoto} onChange={(e) => setUsePhoto(e.target.checked)} />
                Use my banner photo as the background
              </label>
            )}
          </Step>

          <Step n="3" title="Your words">
            {(view.activeKind === 'storefront' || view.activeKind === 'collage') && (
              <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
                <div>
                  <label className="field-label" htmlFor="hub-headline">Big words</label>
                  <input id="hub-headline" className="input-field" maxLength={60} value={view.headline} onChange={(e) => setHeadlineEdit((p) => ({ ...p, [view.activeKind]: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label" htmlFor="hub-sub">Smaller line</label>
                  <input id="hub-sub" className="input-field" maxLength={120} value={view.sub} onChange={(e) => setSubEdit((p) => ({ ...p, [view.activeKind]: e.target.value }))} />
                </div>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label className="field-label" htmlFor="hub-cta">Button on the picture</label>
              <select id="hub-cta" className="input-field" value={view.ctaValue} onChange={(e) => setCtaLabel(e.target.value)}>
                {view.ctaChoices.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <label className="field-label" htmlFor="hub-caption">{platformName} caption</label>
            <textarea
              id="hub-caption"
              className="input-field"
              value={caption}
              onChange={(e) => setCaptionEdit({ key: captionKey, text: e.target.value })}
              style={{ minHeight: platform === 'instagram' ? 220 : 130, fontFamily: 'var(--sans)', fontSize: 14, lineHeight: 1.55 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <CopyButton text={caption} label="Copy caption" primary />
              <button type="button" className="btn btn-outline btn-small" onClick={() => { setVariant((v) => (v + 1) % CAPTION_VARIANTS); setCaptionEdit(null); }}>Another idea</button>
              <CopyButton text={view.activeKind === 'community' && view.community ? view.community.url : derived.url} label="Copy link" />
            </div>
          </Step>

          <Step n="4" title={`Post it on ${platformName}`}>
            <ol style={{ margin: '0 0 14px', paddingLeft: 20, lineHeight: 1.75, fontSize: 14.5 }}>
              <li>Download the picture (on your phone, use Share from phone).</li>
              <li>Open {platformName} and start a new {platform === 'instagram' ? 'post or story' : 'post'} with that picture.</li>
              <li>Paste the caption, then post.</li>
              <li>{platform === 'instagram' ? 'Put your link in your Instagram bio once, and it keeps working for every post.' : 'Put your link in your TikTok bio once, and it keeps working for every post.'}</li>
            </ol>
            <a href={platform === 'instagram' ? 'https://www.instagram.com/' : 'https://www.tiktok.com/upload'} target="_blank" rel="noreferrer" className="btn btn-outline btn-small">Open {platformName}</a>
          </Step>
        </div>
      </div>
    </div>
  );
}

export default function CreativeHubPage() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: 420, borderRadius: 16 }} />}>
      <StudioInner />
    </Suspense>
  );
}
