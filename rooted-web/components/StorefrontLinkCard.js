'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { avatarUrl, bannerUrl } from '@/lib/storage';
import { formatPrice, ROLE_LABELS } from '@/lib/roles';
import { OFFERING_TYPES } from '@/lib/offeringTypes';
import { loadImage, makeStorefrontImage, blurbFrom } from '@/lib/storefrontPromo';

function CopyButton({ text, label, primary = false }) {
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
    <button type="button" className={primary ? 'btn btn-primary' : 'btn btn-outline btn-small'} onClick={copy} style={primary ? { minHeight: 48 } : undefined}>
      {copied ? 'Copied ✓' : label}
    </button>
  );
}

// The creator's storefront link on the dashboard overview, with a ready-to-post
// kit for Instagram and TikTok: pictures of the storefront and a caption that
// already contains the link.
export default function StorefrontLinkCard({ storefront, name, role, offerings }) {
  const handle = storefront.handle;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://rootedtogether.club';
  const url = `${origin}/creator/${handle}`;
  const shortLink = url.replace(/^https?:\/\//, '').replace(/^www\./, '');

  const live = useMemo(() => (offerings || []).filter((o) => o.status === 'published'), [offerings]);
  const typesText = useMemo(() => {
    const present = new Set(live.map((o) => o.type));
    return OFFERING_TYPES.filter((t) => present.has(t.key)).map((t) => t.plural).slice(0, 4).join(' · ');
  }, [live]);
  const fromPrice = useMemo(() => {
    const paid = live.filter((o) => !o.is_free_for_family && o.price_cents > 0).map((o) => o.price_cents);
    return paid.length ? formatPrice(Math.min(...paid)) : '';
  }, [live]);

  const intro = storefront.tagline || blurbFrom(storefront.bio, 140);
  const typesList = typesText.split(' · ').filter(Boolean).join(', ');

  const defaultIg = `Shop my offerings on Rooted Together.\n\n${intro ? `${intro}\n\n` : ''}${typesList ? `Inside: ${typesList}${fromPrice ? `, from ${fromPrice}` : ''}.\n\n` : ''}Shop here: ${url}\n(The link is also in my bio.)\n\n#rootedtogether #faith #spiritualgrowth #prayer #christianliving`;
  const defaultTt = `Shop my offerings on Rooted Together${typesList ? `: ${typesList}` : ''}. ${url} #faithtok #rootedtogether #prayer #christiantok #spiritualgrowth`;

  const [platform, setPlatform] = useState('instagram');
  const [igCaption, setIgCaption] = useState(defaultIg);
  const [ttCaption, setTtCaption] = useState(defaultTt);
  const [images, setImages] = useState({ story: null, post: null });

  useEffect(() => {
    let active = true;
    (async () => {
      const [banner, avatar] = await Promise.all([loadImage(bannerUrl(storefront.banner_path)), loadImage(avatarUrl(storefront.avatar_path))]);
      if (!active) return;
      const base = { banner, avatar, name: name || '', role: ROLE_LABELS[role] || '', tagline: intro, typesText, fromPrice, linkText: shortLink };
      setImages({
        story: makeStorefrontImage({ ...base, width: 1080, height: 1920 }),
        post: makeStorefrontImage({ ...base, width: 1080, height: 1350 }),
      });
    })();
    return () => { active = false; };
  }, [storefront.banner_path, storefront.avatar_path, name, role, intro, typesText, fromPrice, shortLink]);

  const caption = platform === 'instagram' ? igCaption : ttCaption;
  const setCaption = platform === 'instagram' ? setIgCaption : setTtCaption;
  const safe = (handle || 'storefront').replace(/[^a-z0-9-]/gi, '');

  return (
    <div className="card" style={{ padding: 'clamp(18px, 3vw, 24px)', marginBottom: 20, border: '1.5px solid #C8923F', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8923F' }}>Your storefront link</div>
          <div className="serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--brown)', marginTop: 4 }}>Share this and people can shop your offerings</div>
        </div>
        <Link href={`/creator/${handle}`} className="btn btn-outline btn-small">Preview storefront</Link>
      </div>
      <p className="muted" style={{ margin: '8px 0 14px', fontSize: 13.5, lineHeight: 1.55 }}>
        Put it in your Instagram and TikTok bio. Anyone who opens it can browse and buy everything you sell.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0, padding: '12px 16px', borderRadius: 14, background: 'var(--cream)', border: '1px solid #EADBC8', fontSize: 14.5, fontWeight: 600, color: 'var(--text)', overflowWrap: 'anywhere', userSelect: 'all' }}>
          {url}
        </div>
        <CopyButton text={url} label="Copy link" primary />
      </div>

      {/* Post it */}
      <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #EADBC8' }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>Post your storefront</div>
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
          Download a picture, copy the caption, and post it. The caption already has your link.
        </div>
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 14, flex: '0 0 auto' }}>
            {[{ key: 'story', label: 'Story or Reel (9:16)', aspect: '9 / 16', w: 120 }, { key: 'post', label: 'Feed post (4:5)', aspect: '4 / 5', w: 150 }].map((im) => (
              <div key={im.key} style={{ width: im.w }}>
                {images[im.key] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={images[im.key]} alt={im.label} style={{ width: '100%', aspectRatio: im.aspect, objectFit: 'cover', borderRadius: 12, border: '1px solid rgba(107,66,38,0.15)', display: 'block' }} />
                ) : (
                  <div className="skeleton" style={{ width: '100%', aspectRatio: im.aspect, borderRadius: 12 }} />
                )}
                <div className="muted" style={{ fontSize: 11.5, margin: '6px 0' }}>{im.label}</div>
                {images[im.key] && (
                  <a href={images[im.key]} download={`${safe}-${im.key}.png`} className="btn btn-primary btn-small" style={{ display: 'inline-flex' }}>Download</a>
                )}
              </div>
            ))}
          </div>

          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <div role="tablist" aria-label="Where to post" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {[['instagram', 'Instagram'], ['tiktok', 'TikTok']].map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={platform === k} onClick={() => setPlatform(k)} className={platform === k ? 'btn btn-primary btn-small' : 'btn btn-outline btn-small'}>
                  {label}
                </button>
              ))}
            </div>
            <textarea
              className="input-field"
              aria-label={`${platform === 'instagram' ? 'Instagram' : 'TikTok'} caption`}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              style={{ minHeight: 190, fontFamily: 'var(--sans)', fontSize: 13.5, lineHeight: 1.55 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <CopyButton text={caption} label="Copy caption" />
              {platform === 'instagram' ? (
                <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="btn btn-outline btn-small">Open Instagram</a>
              ) : (
                <a href="https://www.tiktok.com/upload" target="_blank" rel="noreferrer" className="btn btn-outline btn-small">Open TikTok</a>
              )}
            </div>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 10 }}>
              {platform === 'instagram'
                ? 'Post the picture as a Story, Reel cover or feed post, paste the caption, and add the link to your bio (or a link sticker on a Story). Links in captions are not tappable on Instagram.'
                : 'Use the picture as a slide or film a short video about what you offer, paste the caption, and keep the link in your TikTok bio.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
