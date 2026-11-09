// The Creative hub's picture maker. Draws post-ready images for Instagram and
// TikTok on a canvas in the browser, so nothing is uploaded anywhere.
//
// makeCreative(spec) returns a PNG data URL. `spec` says what to draw:
//   kind:    'storefront' | 'offering' | 'collage' | 'quote' | 'community'
//   format:  'story' | 'post' | 'square'
//   theme:   a key of THEMES
//   creator: { name, role, initials, avatar, banner, usePhoto }
//   headline, sub, typesText, fromPrice          (storefront and collage words)
//   offering: { title, typeLabel, priceLabel, img, tint, ink }   (offering)
//   collage:  [{ title, img, tint, ink }]                         (collage)
//   quote:    { body, reviewer, offeringTitle, rating }           (quote)
//   community: { name, blurb, icon, img, memberLabel }            (community)
//   ctaLabel, linkText

export const FORMATS = {
  story: { key: 'story', w: 1080, h: 1920, pad: 90, ctaH: 130, label: 'Story, Reel or TikTok (9:16)', ratio: '9 / 16' },
  post: { key: 'post', w: 1080, h: 1350, pad: 90, ctaH: 130, label: 'Feed post (4:5)', ratio: '4 / 5' },
  square: { key: 'square', w: 1080, h: 1080, pad: 70, ctaH: 104, label: 'Square (1:1)', ratio: '1 / 1' },
};

export const FORMATS_BY_PLATFORM = {
  instagram: ['story', 'post', 'square'],
  tiktok: ['story', 'square'],
};

export const THEMES = {
  brown: { label: 'Rooted brown', bg: ['#6B4226', '#8C6A4A'], ink: '#FFFFFF', soft: '#F3ECE3', accent: '#C8923F', accentInk: '#2E1B10', pillBg: '#F3ECE3', pillInk: '#6B4226', overlay: 'rgba(46,27,16,0.8)' },
  midnight: { label: 'Midnight', bg: ['#2E1B10', '#4A3322'], ink: '#FBF6EF', soft: '#E8CDA8', accent: '#C8923F', accentInk: '#2E1B10', pillBg: '#C8923F', pillInk: '#2E1B10', overlay: 'rgba(30,17,9,0.82)' },
  cream: { label: 'Cream', bg: ['#FBF6EF', '#F1E4D3'], ink: '#2E1B10', soft: '#6F5846', accent: '#6B4226', accentInk: '#FBF6EF', pillBg: '#6B4226', pillInk: '#FBF6EF', overlay: 'rgba(251,246,239,0.88)' },
  gold: { label: 'Gold', bg: ['#C8923F', '#E0B56A'], ink: '#2E1B10', soft: '#4A3322', accent: '#2E1B10', accentInk: '#FBF6EF', pillBg: '#2E1B10', pillInk: '#FBF6EF', overlay: 'rgba(224,181,106,0.85)' },
};

const SERIF = 'Georgia, serif';
const SANS = 'Helvetica, Arial, sans-serif';

export function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ---- drawing helpers -------------------------------------------------------

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
  const words = String(text || '').split(/\s+/).filter(Boolean);
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

// Largest text size (from `size` down to `minSize`) that fits in maxLines.
// Leaves the canvas font set to the chosen size.
function fitText(ctx, text, { maxW, maxLines, size, minSize, weight = '700', family = SERIF }) {
  let s = size;
  let lines = [];
  for (; s >= minSize; s -= 4) {
    ctx.font = `${weight} ${s}px ${family}`;
    lines = wrapLines(ctx, text, maxW);
    if (lines.length <= maxLines) return { size: s, lines };
  }
  s = minSize;
  ctx.font = `${weight} ${s}px ${family}`;
  lines = wrapLines(ctx, text, maxW);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1).trimEnd();
    lines[maxLines - 1] = `${last}…`;
  }
  return { size: s, lines };
}

function drawAt(ctx, text, x, y, align) {
  const wd = ctx.measureText(text).width;
  ctx.fillText(text, align === 'center' ? x - wd / 2 : x, y);
}

function coverFit(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
}

// Shows a picture whole, on a soft blurred copy of itself.
function containOnBlur(ctx, img, x, y, w, h) {
  if ('filter' in ctx) {
    ctx.filter = 'blur(24px)';
    coverFit(ctx, img, x - 20, y - 20, w + 40, h + 40);
    ctx.filter = 'none';
  } else {
    coverFit(ctx, img, x, y, w, h);
  }
  const s = Math.min(w / img.width, h / img.height);
  ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
}

// A rounded picture slot. With no picture: a calm tile in the offering's colours.
function photoSlot(ctx, item, x, y, w, h, r, mode) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  if (item && item.img) {
    if (mode === 'cover') coverFit(ctx, item.img, x, y, w, h);
    else containOnBlur(ctx, item.img, x, y, w, h);
  } else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, (item && item.tint) || '#C9AD8E');
    g.addColorStop(1, '#8C6A4A');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function pill(ctx, text, x, y, { font, h, padX, bg, ink, align = 'left', right }) {
  ctx.font = font;
  const wd = ctx.measureText(text).width + padX * 2;
  const px = align === 'right' ? right - wd : x;
  ctx.fillStyle = bg;
  roundRect(ctx, px, y, wd, h, h / 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.fillText(text, px + padX, y + (h - parseInt(font.match(/(\d+)px/)[1], 10)) / 2 - 2);
  return wd;
}

// ---- shared frame ----------------------------------------------------------

function setup(spec) {
  const f = FORMATS[spec.format] || FORMATS.post;
  const canvas = document.createElement('canvas');
  canvas.width = f.w;
  canvas.height = f.h;
  const ctx = canvas.getContext('2d');
  const theme = THEMES[spec.theme] || THEMES.brown;
  const s = { canvas, ctx, f, format: f.key, w: f.w, h: f.h, pad: f.pad, cw: f.w - f.pad * 2, theme };
  s.ctaY = s.h - s.pad - f.ctaH - 56;
  s.top = s.pad + (f.key === 'square' ? 74 : 120);
  s.bottom = s.ctaY - 36;

  const bg = ctx.createLinearGradient(0, 0, s.w, s.h);
  bg.addColorStop(0, theme.bg[0]);
  bg.addColorStop(1, theme.bg[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, s.w, s.h);
  const photo = spec.kind === 'storefront' && spec.creator && spec.creator.usePhoto ? spec.creator.banner : null;
  if (photo) {
    coverFit(ctx, photo, 0, 0, s.w, s.h);
    ctx.fillStyle = theme.overlay;
    ctx.fillRect(0, 0, s.w, s.h);
  }
  ctx.textBaseline = 'top';

  // Brand line
  ctx.fillStyle = theme.soft;
  ctx.font = `700 30px ${SERIF}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
  drawAt(ctx, 'ROOTED TOGETHER', s.w / 2, s.pad, 'center');
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  return s;
}

function drawCta(s, label, linkText) {
  const { ctx, pad, cw, theme, f } = s;
  ctx.fillStyle = theme.pillBg;
  roundRect(ctx, pad, s.ctaY, cw, f.ctaH, f.ctaH / 2);
  ctx.fill();
  const size = s.format === 'square' ? 40 : 46;
  ctx.fillStyle = theme.pillInk;
  ctx.font = `700 ${size}px ${SANS}`;
  drawAt(ctx, label, s.w / 2, s.ctaY + (f.ctaH - size) / 2 - 4, 'center');
  let fs = 34;
  ctx.font = `400 ${fs}px ${SANS}`;
  while (ctx.measureText(linkText).width > cw && fs > 20) {
    fs -= 2;
    ctx.font = `400 ${fs}px ${SANS}`;
  }
  ctx.fillStyle = theme.soft;
  drawAt(ctx, linkText, s.w / 2, s.ctaY + f.ctaH + (56 - fs) / 2 + 2, 'center');
}

// ---- templates -------------------------------------------------------------

function storefront(s, spec) {
  const { ctx, w, cw, theme } = s;
  const c = spec.creator;
  const cx = w / 2;
  let y = s.top;
  const dia = s.format === 'story' ? 330 : s.format === 'post' ? 250 : 180;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, y + dia / 2, dia / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (c.avatar) {
    coverFit(ctx, c.avatar, cx - dia / 2, y, dia, dia);
  } else {
    ctx.fillStyle = theme.pillBg;
    ctx.fillRect(cx - dia / 2, y, dia, dia);
    ctx.fillStyle = theme.pillInk;
    ctx.font = `700 ${Math.round(dia * 0.36)}px ${SERIF}`;
    drawAt(ctx, c.initials || '', cx, y + dia * 0.32, 'center');
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, y + dia / 2, dia / 2 + 6, 0, Math.PI * 2);
  ctx.lineWidth = 10;
  ctx.strokeStyle = theme.accent;
  ctx.stroke();
  y += dia + (s.format === 'story' ? 64 : 44);

  const hl = fitText(ctx, spec.headline || c.name, { maxW: cw, maxLines: 2, size: s.format === 'story' ? 96 : s.format === 'post' ? 84 : 72, minSize: 50 });
  ctx.fillStyle = theme.ink;
  hl.lines.forEach((line, i) => drawAt(ctx, line, cx, y + i * hl.size * 1.12, 'center'));
  y += hl.lines.length * hl.size * 1.12 + 14;

  if (c.role && s.format !== 'square') {
    ctx.font = `600 40px ${SANS}`;
    ctx.fillStyle = theme.soft;
    drawAt(ctx, c.role, cx, y, 'center');
    y += 74;
  }
  if (spec.sub) {
    const sub = fitText(ctx, spec.sub, { maxW: cw - 40, maxLines: s.format === 'story' ? 3 : 2, size: 46, minSize: 34, weight: '400' });
    ctx.fillStyle = theme.soft;
    sub.lines.forEach((line, i) => drawAt(ctx, line, cx, y + i * 60, 'center'));
    y += sub.lines.length * 60 + 30;
  }
  if (spec.typesText && y + 100 <= s.bottom) {
    ctx.font = `700 34px ${SANS}`;
    ctx.fillStyle = theme.accent;
    const tl = wrapLines(ctx, spec.typesText, cw).slice(0, 2);
    tl.forEach((line, i) => drawAt(ctx, line, cx, y + i * 48, 'center'));
    y += tl.length * 48 + 18;
  }
  if (spec.fromPrice && y + 50 <= s.bottom) {
    ctx.font = `400 36px ${SANS}`;
    ctx.fillStyle = theme.soft;
    drawAt(ctx, `From ${spec.fromPrice}`, cx, y, 'center');
    y += 50;
  }
  return y;
}

function offeringPost(s, spec) {
  const { ctx, pad, cw, theme } = s;
  const o = spec.offering;
  let y = s.top;
  const frameH = Math.round(cw * (s.format === 'story' ? 0.95 : s.format === 'post' ? 0.56 : 0.36));
  photoSlot(ctx, o, pad, y, cw, frameH, 32, 'contain');
  y += frameH + (s.format === 'story' ? 56 : 36);

  const rowH = s.format === 'square' ? 50 : 56;
  pill(ctx, (o.typeLabel || '').toUpperCase(), pad, y, { font: `700 26px ${SANS}`, h: rowH, padX: 26, bg: theme.pillBg, ink: theme.pillInk });
  if (o.priceLabel) {
    pill(ctx, o.priceLabel, 0, y, { font: `700 36px ${SANS}`, h: rowH + 8, padX: 30, bg: theme.accent, ink: theme.accentInk, align: 'right', right: pad + cw });
  }
  y += rowH + (s.format === 'square' ? 30 : 36);

  const t = fitText(ctx, o.title, { maxW: cw, maxLines: s.format === 'story' ? 3 : 2, size: s.format === 'story' ? 84 : s.format === 'post' ? 72 : 60, minSize: 42 });
  ctx.fillStyle = theme.ink;
  t.lines.forEach((line, i) => ctx.fillText(line, pad, y + i * t.size * 1.15));
  y += t.lines.length * t.size * 1.15 + 18;

  if (spec.creator.name && y + 50 <= s.bottom) {
    ctx.font = `400 38px ${SANS}`;
    ctx.fillStyle = theme.soft;
    ctx.fillText(`with ${spec.creator.name}`, pad, y);
    y += 50;
  }
  return y;
}

function collagePost(s, spec) {
  const { ctx, pad, cw, w, theme } = s;
  const cx = w / 2;
  let y = s.top - (s.format === 'square' ? 20 : 0);
  const hl = fitText(ctx, spec.headline || 'Shop my offerings', { maxW: cw, maxLines: 2, size: s.format === 'story' ? 88 : s.format === 'post' ? 76 : 64, minSize: 46 });
  ctx.fillStyle = theme.ink;
  hl.lines.forEach((line, i) => drawAt(ctx, line, cx, y + i * hl.size * 1.12, 'center'));
  y += hl.lines.length * hl.size * 1.12 + 14;
  if (spec.sub) {
    ctx.font = `400 36px ${SANS}`;
    ctx.fillStyle = theme.soft;
    const sl = wrapLines(ctx, spec.sub, cw).slice(0, 1);
    drawAt(ctx, sl[0], cx, y, 'center');
    y += 56;
  } else {
    y += 20;
  }

  const items = (spec.collage || []).slice(0, s.format === 'square' ? 2 : 4);
  const rows = s.format === 'square' ? 1 : items.length > 2 ? 2 : 1;
  const gap = 24;
  const rowCounts = rows === 1 ? [items.length] : [2, items.length - 2];
  const region = s.bottom - y;
  const tileH = Math.min((region - gap * (rows - 1)) / rows, cw * 0.62 + (s.format === 'story' ? 160 : 0));
  let idx = 0;
  rowCounts.forEach((count, r) => {
    if (count <= 0) return;
    const tw = (cw - gap * (count - 1)) / count;
    for (let i = 0; i < count; i += 1) {
      const it = items[idx];
      idx += 1;
      const x = pad + i * (tw + gap);
      const ty = y + r * (tileH + gap);
      photoSlot(ctx, it, x, ty, tw, tileH, 28, 'cover');
      ctx.save();
      roundRect(ctx, x, ty, tw, tileH, 28);
      ctx.clip();
      const g = ctx.createLinearGradient(0, ty + tileH * 0.5, 0, ty + tileH);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.72)');
      ctx.fillStyle = g;
      ctx.fillRect(x, ty + tileH * 0.5, tw, tileH * 0.5);
      ctx.restore();
      const t = fitText(ctx, it.title, { maxW: tw - 44, maxLines: 2, size: 36, minSize: 26, family: SERIF });
      ctx.fillStyle = '#FFFFFF';
      const startY = ty + tileH - 24 - t.lines.length * t.size * 1.15;
      t.lines.forEach((line, k) => ctx.fillText(line, x + 22, startY + k * t.size * 1.15));
    }
  });
}

function quotePost(s, spec) {
  const { ctx, w, cw, theme } = s;
  const q = spec.quote;
  const cx = w / 2;
  const markGap = s.format === 'square' ? 120 : 170;

  const reserve = 210;
  const maxLines = s.format === 'story' ? 11 : s.format === 'post' ? 7 : 5;
  const qt = fitText(ctx, q.body, { maxW: cw - 20, maxLines, size: 64, minSize: 34, weight: 'italic 400' });
  const lh = qt.size * 1.35;
  const maxBlock = s.bottom - reserve - (s.top - 30);
  const block = Math.min(qt.lines.length * lh + markGap, maxBlock);
  const markY = s.top - 30 + Math.max(0, (maxBlock - block) / 2);
  ctx.font = `700 220px ${SERIF}`;
  ctx.fillStyle = theme.accent;
  drawAt(ctx, '“', cx, markY, 'center');
  ctx.font = `italic 400 ${qt.size}px ${SERIF}`;
  ctx.fillStyle = theme.ink;
  qt.lines.forEach((line, i) => drawAt(ctx, line, cx, markY + markGap + i * lh, 'center'));

  let by = s.bottom - 170;
  ctx.fillStyle = theme.accent;
  const n = Math.max(1, Math.min(5, Math.round(q.rating || 5)));
  const sz = 22;
  const total = n * sz * 2.4;
  for (let i = 0; i < n; i += 1) star(ctx, cx - total / 2 + sz * 1.2 + i * sz * 2.4, by + sz, sz);
  by += 62;
  ctx.font = `700 40px ${SANS}`;
  ctx.fillStyle = theme.ink;
  drawAt(ctx, q.reviewer || 'A student', cx, by, 'center');
  if (q.offeringTitle) {
    ctx.font = `400 32px ${SANS}`;
    ctx.fillStyle = theme.soft;
    const on = fitText(ctx, `on ${q.offeringTitle}`, { maxW: cw, maxLines: 1, size: 32, minSize: 24, weight: '400', family: SANS });
    drawAt(ctx, on.lines[0], cx, by + 54, 'center');
  }
}

function communityPost(s, spec) {
  const { ctx, pad, cw, w, theme } = s;
  const c = spec.community;
  const cx = w / 2;
  let y = s.top;
  const frameH = Math.round(cw * (s.format === 'story' ? 0.8 : s.format === 'post' ? 0.5 : 0.34));
  photoSlot(ctx, { img: c.img, tint: theme.accent }, pad, y, cw, frameH, 32, 'cover');
  if (!c.img && c.icon) {
    ctx.font = `${Math.round(frameH * 0.42)}px ${SANS}`;
    ctx.fillStyle = '#FFFFFF';
    drawAt(ctx, c.icon, cx, y + frameH * 0.28, 'center');
  }
  y += frameH + (s.format === 'story' ? 56 : 36);

  const rowH = s.format === 'square' ? 50 : 56;
  if (c.memberLabel) {
    pill(ctx, c.memberLabel.toUpperCase(), pad, y, { font: `700 26px ${SANS}`, h: rowH, padX: 26, bg: theme.pillBg, ink: theme.pillInk });
  }
  pill(ctx, 'FREE TO JOIN', 0, y, { font: `700 26px ${SANS}`, h: rowH, padX: 26, bg: theme.accent, ink: theme.accentInk, align: 'right', right: pad + cw });
  y += rowH + (s.format === 'square' ? 26 : 32);

  const t = fitText(ctx, c.name, { maxW: cw, maxLines: s.format === 'story' ? 3 : 2, size: s.format === 'story' ? 84 : s.format === 'post' ? 72 : 60, minSize: 42 });
  ctx.fillStyle = theme.ink;
  t.lines.forEach((line, i) => ctx.fillText(line, pad, y + i * t.size * 1.15));
  y += t.lines.length * t.size * 1.15 + 18;

  if (c.blurb && y + 60 <= s.bottom) {
    const d = fitText(ctx, c.blurb, { maxW: cw, maxLines: s.format === 'story' ? 4 : s.format === 'post' ? 3 : 2, size: 40, minSize: 30, weight: '400', family: SANS });
    ctx.fillStyle = theme.soft;
    d.lines.forEach((line, i) => ctx.fillText(line, pad, y + i * d.size * 1.4));
    y += d.lines.length * d.size * 1.4 + 16;
  }
  if (spec.creator && spec.creator.name && y + 50 <= s.bottom) {
    ctx.font = `600 36px ${SANS}`;
    ctx.fillStyle = theme.accent;
    ctx.fillText(`Led by ${spec.creator.name}`, pad, y);
    y += 50;
  }
  return y;
}

function drawBody(s, spec) {
  if (spec.kind === 'offering' && spec.offering) return offeringPost(s, spec);
  if (spec.kind === 'collage') return collagePost(s, spec);
  if (spec.kind === 'quote' && spec.quote) return quotePost(s, spec);
  if (spec.kind === 'community' && spec.community) return communityPost(s, spec);
  return storefront(s, spec);
}

function render(spec) {
  // First pass on a scratch canvas to learn how tall the content is, so the
  // real pass can centre it between the top line and the button.
  let shift = 0;
  if (spec.kind === 'storefront' || spec.kind === 'offering' || spec.kind === 'community') {
    const probe = setup(spec);
    const end = drawBody(probe, spec);
    if (typeof end === 'number') shift = Math.max(0, Math.min((probe.bottom - end) * 0.5, 420));
  }
  const s = setup(spec);
  s.ctx.save();
  s.ctx.translate(0, shift);
  drawBody(s, spec);
  s.ctx.restore();
  drawCta(s, spec.ctaLabel || 'Shop my offerings', spec.linkText || 'rootedtogether.club');
  return s.canvas;
}

// A PNG data URL, or null if the browser won't export it.
export function makeCreative(spec) {
  const stripPhotos = (sp) => ({
    ...sp,
    creator: sp.creator && { ...sp.creator, avatar: null, banner: null },
    offering: sp.offering && { ...sp.offering, img: null },
    collage: (sp.collage || []).map((c) => ({ ...c, img: null })),
    community: sp.community && { ...sp.community, img: null },
  });
  try {
    return render(spec).toDataURL('image/png');
  } catch {
    // A picture from another site can taint the canvas: draw without the photos.
    try {
      return render(stripPhotos(spec)).toDataURL('image/png');
    } catch {
      return null;
    }
  }
}
