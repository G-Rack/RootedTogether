'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { coverUrl } from '@/lib/storage';
import { formatPrice, OFFERING_TYPE_LABELS } from '@/lib/roles';

// Promote a published offering on Instagram / TikTok: its link, ready-to-post
// captions, and downloadable share images (Story and feed-post sizes). Neither
// app lets a website post for you, so the creator downloads the image, pastes
// the caption, and puts the link in their bio or a link sticker.

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawPromo({ width, height, img, title, creator, typeLabel, priceLabel }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const pad = 90;

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#6B4226');
  bg.addColorStop(1, '#8C6A4A');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = 'top';

  // Brand line
  ctx.fillStyle = '#F3ECE3';
  ctx.font = '700 30px Georgia, serif';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
  ctx.fillText('ROOTED TOGETHER', pad, pad);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  // Cover picture (whole picture, on a soft copy of itself)
  let y = pad + 110;
  const cw = width - pad * 2;
  const ch = Math.round((cw * 9) / 16);
  ctx.save();
  roundRect(ctx, pad, y, cw, ch, 32);
  ctx.clip();
  ctx.fillStyle = '#F3ECE3';
  ctx.fillRect(pad, y, cw, ch);
  if (img) {
    if ('filter' in ctx) {
      const s2 = Math.max(cw / img.width, ch / img.height);
      ctx.filter = 'blur(24px)';
      ctx.drawImage(img, pad + (cw - img.width * s2) / 2, y + (ch - img.height * s2) / 2, img.width * s2, img.height * s2);
      ctx.filter = 'none';
    }
    const s = Math.min(cw / img.width, ch / img.height);
    ctx.drawImage(img, pad + (cw - img.width * s) / 2, y + (ch - img.height * s) / 2, img.width * s, img.height * s);
  } else {
    const g = ctx.createLinearGradient(pad, y, pad + cw, y + ch);
    g.addColorStop(0, '#C9AD8E');
    g.addColorStop(1, '#8C6A4A');
    ctx.fillStyle = g;
    ctx.fillRect(pad, y, cw, ch);
  }
  ctx.restore();
  y += ch + 70;

  // Type badge
  ctx.font = '700 28px Helvetica, Arial, sans-serif';
  const badgeText = typeLabel.toUpperCase();
  const badgeW = ctx.measureText(badgeText).width + 56;
  ctx.fillStyle = '#F3ECE3';
  roundRect(ctx, pad, y, badgeW, 54, 27);
  ctx.fill();
  ctx.fillStyle = '#6B4226';
  ctx.fillText(badgeText, pad + 28, y + 12);
  y += 54 + 34;

  // Title (shrinks to fit 3 lines)
  let size = 84;
  let lines = [];
  for (; size >= 56; size -= 8) {
    ctx.font = `700 ${size}px Georgia, serif`;
    lines = wrapLines(ctx, title, cw);
    if (lines.length <= 3) break;
  }
  lines = lines.slice(0, 3);
  ctx.fillStyle = '#FFFFFF';
  lines.forEach((line, i) => ctx.fillText(line, pad, y + i * (size * 1.15)));
  y += lines.length * size * 1.15 + 26;

  if (creator) {
    ctx.font = '400 40px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#F3ECE3';
    ctx.fillText(`with ${creator}`, pad, y);
    y += 40 + 34;
  }

  // Price
  ctx.font = '700 44px Helvetica, Arial, sans-serif';
  const priceW = ctx.measureText(priceLabel).width + 64;
  ctx.fillStyle = '#C8923F';
  roundRect(ctx, pad, y, priceW, 74, 37);
  ctx.fill();
  ctx.fillStyle = '#2E1B10';
  ctx.fillText(priceLabel, pad + 32, y + 15);

  // Call to action, pinned to the bottom
  const ctaY = height - pad - 250;
  ctx.fillStyle = '#F3ECE3';
  roundRect(ctx, pad, ctaY, cw, 130, 65);
  ctx.fill();
  ctx.fillStyle = '#6B4226';
  ctx.font = '700 44px Helvetica, Arial, sans-serif';
  const cta = 'Link in my bio';
  ctx.fillText(cta, pad + (cw - ctx.measureText(cta).width) / 2, ctaY + 40);
  ctx.fillStyle = '#F3ECE3';
  ctx.font = '400 34px Helvetica, Arial, sans-serif';
  const site = 'rootedtogether.club';
  ctx.fillText(site, pad + (cw - ctx.measureText(site).width) / 2, ctaY + 130 + 36);

  return canvas;
}

function makeImage(args) {
  try {
    return drawPromo(args).toDataURL('image/png');
  } catch {
    // The cover came from another site and the browser won't let us export it: draw without it.
    try {
      return drawPromo({ ...args, img: null }).toDataURL('image/png');
    } catch {
      return null;
    }
  }
}

function blurbFrom(text, max) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : max).trim()}…`;
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <button type="button" className="btn btn-outline btn-small" onClick={copy}>
      {copied ? 'Copied ✓' : label}
    </button>
  );
}

function ShareImage({ title, src, filename, aspect }) {
  return (
    <div style={{ flex: '1 1 200px', maxWidth: 260 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {src ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={title} style={{ width: '100%', aspectRatio: aspect, objectFit: 'cover', borderRadius: 12, border: '1px solid rgba(107,66,38,0.15)' }} />
          <a href={src} download={filename} className="btn btn-primary btn-small" style={{ marginTop: 10, display: 'inline-flex' }}>
            Download image
          </a>
        </>
      ) : (
        <div className="skeleton" style={{ width: '100%', aspectRatio: aspect, borderRadius: 12 }} />
      )}
    </div>
  );
}

function PromoteInner() {
  const { session } = useSession();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [offering, setOffering] = useState(null);
  const [creatorName, setCreatorName] = useState('');
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState({ story: null, post: null });
  const [igCaption, setIgCaption] = useState('');
  const [ttCaption, setTtCaption] = useState('');

  useEffect(() => {
    if (!session || !id) return undefined;
    let active = true;
    async function load() {
      const [{ data: o }, { data: prof }, { data: sf }] = await Promise.all([
        supabase.from('offerings').select('*').eq('id', id).eq('creator_auth_id', session.user.id).maybeSingle(),
        supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle(),
        supabase.from('creator_storefronts').select('handle').eq('auth_user_id', session.user.id).maybeSingle(),
      ]);
      if (!active) return;
      setOffering(o || null);
      setCreatorName(prof?.full_name || '');
      setHandle(sf?.handle || '');
      setLoading(false);
      if (!o) return;

      const typeLabel = OFFERING_TYPE_LABELS[o.type] || 'Offering';
      const priceLabel = o.is_free_for_family ? 'Free for Spiritual Family' : o.price_cents ? formatPrice(o.price_cents) : 'Free';
      const blurb = blurbFrom(o.description, 150);
      setIgCaption(
        `New on Rooted Together: ${o.title}\n\n${blurb ? `${blurb}\n\n` : ''}${typeLabel} · ${priceLabel}\n\nGet it at the link in my bio.\n\n#rootedtogether #faith #spiritualgrowth #prayer #christianliving`
      );
      setTtCaption(
        `${o.title}${blurb ? ` — ${blurbFrom(o.description, 90)}` : ''} Link in my bio. #faithtok #rootedtogether #prayer #christiantok #spiritualgrowth`
      );

      const img = await loadImage(coverUrl(o.cover_path));
      if (!active) return;
      const base = { img, title: o.title, creator: prof?.full_name || '', typeLabel, priceLabel };
      setImages({
        story: makeImage({ ...base, width: 1080, height: 1920 }),
        post: makeImage({ ...base, width: 1080, height: 1350 }),
      });
    }
    load();
    return () => { active = false; };
  }, [session, id]);

  if (loading) return <div className="skeleton" style={{ height: 320 }} />;

  if (!id || !offering) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div className="card" style={{ padding: 28 }}>
          <div className="muted" style={{ fontSize: 13.5, marginBottom: 14 }}>We couldn’t find that offering.</div>
          <Link href="/dashboard/offerings" className="btn btn-primary btn-small">Back to My Offerings</Link>
        </div>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://rootedtogether.club';
  const link = `${origin}/offering/${offering.id}`;
  const storefrontLink = handle ? `${origin}/creator/${handle}` : '';
  const published = offering.status === 'published';

  const section = { fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 8 };
  const textarea = { minHeight: 170, fontFamily: 'var(--sans)', fontSize: 13.5, lineHeight: 1.55 };

  return (
    <div style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', marginBottom: 6 }}>
          {published ? 'Your offering is live — now spread the word' : 'Promote your offering'}
        </div>
        <div className="muted" style={{ fontSize: 13.5 }}>
          {offering.title} · Ready-made links, captions and images for Instagram and TikTok.
        </div>
      </div>

      {!published && (
        <div className="error-banner">
          This offering is still a draft, so the link won’t work for buyers yet.{' '}
          <Link href="/dashboard/offerings" style={{ fontWeight: 700 }}>Publish it from My Offerings →</Link>
        </div>
      )}

      <div>
        <div style={section}>Your links</div>
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="muted" style={{ fontSize: 11.5 }}>This offering</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, wordBreak: 'break-all' }}>{link}</div>
            </div>
            <CopyButton text={link} label="Copy link" />
          </div>
          {storefrontLink && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTop: '1px solid rgba(107,66,38,0.08)', paddingTop: 12 }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="muted" style={{ fontSize: 11.5 }}>Your whole storefront</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, wordBreak: 'break-all' }}>{storefrontLink}</div>
              </div>
              <CopyButton text={storefrontLink} label="Copy link" />
            </div>
          )}
        </div>
      </div>

      <div>
        <div style={section}>Share images</div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <ShareImage title="Story / Reel cover (9:16)" src={images.story} filename={`${handleSafe(offering.title)}-story.png`} aspect="9 / 16" />
            <ShareImage title="Feed post (4:5)" src={images.post} filename={`${handleSafe(offering.title)}-post.png`} aspect="4 / 5" />
          </div>
        </div>
      </div>

      <div className="responsive-2col" style={{ '--col-gap': '16px', alignItems: 'start' }}>
        <div>
          <div style={section}>Instagram</div>
          <div className="card" style={{ padding: 16 }}>
            <textarea className="input-field" style={textarea} value={igCaption} onChange={(e) => setIgCaption(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <CopyButton text={igCaption} label="Copy caption" />
              <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="btn btn-outline btn-small">Open Instagram</a>
            </div>
            <ol className="muted" style={{ fontSize: 12.5, lineHeight: 1.7, paddingLeft: 18, marginTop: 12 }}>
              <li>Download an image above.</li>
              <li>Post it as a Story, Reel cover or feed post and paste the caption.</li>
              <li>Add the link to your bio (or a link sticker on a Story).</li>
            </ol>
          </div>
        </div>
        <div>
          <div style={section}>TikTok</div>
          <div className="card" style={{ padding: 16 }}>
            <textarea className="input-field" style={textarea} value={ttCaption} onChange={(e) => setTtCaption(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <CopyButton text={ttCaption} label="Copy caption" />
              <a href="https://www.tiktok.com/upload" target="_blank" rel="noreferrer" className="btn btn-outline btn-small">Open TikTok</a>
            </div>
            <ol className="muted" style={{ fontSize: 12.5, lineHeight: 1.7, paddingLeft: 18, marginTop: 12 }}>
              <li>Film a short video about what’s inside (or use the image as a slide).</li>
              <li>Paste the caption and hashtags.</li>
              <li>Put the link in your TikTok bio so people can find it.</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
        Tip: a 20–30 second video of you sharing one idea from the {OFFERING_TYPE_LABELS[offering.type]?.toLowerCase() || 'offering'} usually
        does better than a plain graphic. Post the image as a follow-up and keep the link in your bio.
      </div>

      <div>
        <Link href="/dashboard/offerings" className="btn btn-outline btn-small">Back to My Offerings</Link>
      </div>
    </div>
  );
}

function handleSafe(title) {
  return (title || 'offering').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'offering';
}

export default function PromotePage() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: 320 }} />}>
      <PromoteInner />
    </Suspense>
  );
}
