// Ready-to-post pictures for a creator's whole storefront (Instagram Story /
// feed post, TikTok slide). Drawn in the browser on a canvas, so nothing is uploaded.

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

function centered(ctx, width, text, y) {
  ctx.fillText(text, (width - ctx.measureText(text).width) / 2, y);
}

function coverFit(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
}

function initialsOf(name) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

function drawStorefront({ width, height, banner, avatar, name, role, tagline, typesText, fromPrice, linkText }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const pad = 90;
  const cw = width - pad * 2;
  const tall = height > 1600;

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#6B4226');
  bg.addColorStop(1, '#8C6A4A');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  if (banner) {
    coverFit(ctx, banner, 0, 0, width, height);
    ctx.fillStyle = 'rgba(46,27,16,0.8)';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.textBaseline = 'top';

  // Brand line
  ctx.fillStyle = '#F3ECE3';
  ctx.font = '700 30px Georgia, serif';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
  centered(ctx, width, 'ROOTED TOGETHER', pad);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  // Avatar
  const d = tall ? 340 : 270;
  const cx = width / 2;
  let y = pad + (tall ? 150 : 110);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, y + d / 2, d / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (avatar) {
    coverFit(ctx, avatar, cx - d / 2, y, d, d);
  } else {
    ctx.fillStyle = '#2E1B10';
    ctx.fillRect(cx - d / 2, y, d, d);
    ctx.fillStyle = '#E8CDA8';
    ctx.font = `700 ${Math.round(d * 0.36)}px Georgia, serif`;
    centered(ctx, width, initialsOf(name), y + d * 0.32);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, y + d / 2, d / 2 + 6, 0, Math.PI * 2);
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#C8923F';
  ctx.stroke();
  y += d + (tall ? 70 : 56);

  // Name (shrinks to fit two lines)
  let size = 96;
  let lines = [];
  for (; size >= 56; size -= 8) {
    ctx.font = `700 ${size}px Georgia, serif`;
    lines = wrapLines(ctx, name, cw);
    if (lines.length <= 2) break;
  }
  lines = lines.slice(0, 2);
  ctx.fillStyle = '#FFFFFF';
  lines.forEach((line, i) => centered(ctx, width, line, y + i * size * 1.12));
  y += lines.length * size * 1.12 + 18;

  if (role) {
    ctx.font = '600 42px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#E8CDA8';
    centered(ctx, width, role, y);
    y += 42 + 40;
  }

  if (tagline) {
    ctx.font = '400 46px Georgia, serif';
    ctx.fillStyle = '#F3ECE3';
    const tl = wrapLines(ctx, tagline, cw - 40).slice(0, tall ? 3 : 2);
    tl.forEach((line, i) => centered(ctx, width, i === tl.length - 1 && tl.length === (tall ? 3 : 2) && wrapLines(ctx, tagline, cw - 40).length > tl.length ? `${line}…` : line, y + i * 62));
    y += tl.length * 62 + 36;
  }

  if (typesText) {
    ctx.font = '700 36px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#C8923F';
    wrapLines(ctx, typesText, cw).slice(0, 2).forEach((line, i) => centered(ctx, width, line, y + i * 50));
    y += Math.min(2, wrapLines(ctx, typesText, cw).length) * 50 + 20;
  }
  if (fromPrice) {
    ctx.font = '400 36px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#F3ECE3';
    centered(ctx, width, `From ${fromPrice}`, y);
  }

  // Call to action, pinned to the bottom
  const ctaY = height - pad - 250;
  ctx.fillStyle = '#F3ECE3';
  roundRect(ctx, pad, ctaY, cw, 130, 65);
  ctx.fill();
  ctx.fillStyle = '#6B4226';
  ctx.font = '700 46px Helvetica, Arial, sans-serif';
  centered(ctx, width, 'Shop my offerings', ctaY + 38);
  let fs = 34;
  ctx.font = `400 ${fs}px Helvetica, Arial, sans-serif`;
  while (ctx.measureText(linkText).width > cw && fs > 20) {
    fs -= 2;
    ctx.font = `400 ${fs}px Helvetica, Arial, sans-serif`;
  }
  ctx.fillStyle = '#F3ECE3';
  centered(ctx, width, linkText, ctaY + 130 + 34);

  return canvas;
}

// A data: URL for the picture, or null if the browser refuses to export it.
export function makeStorefrontImage(args) {
  try {
    return drawStorefront(args).toDataURL('image/png');
  } catch {
    // A picture from another site can taint the canvas: draw without the photos.
    try {
      return drawStorefront({ ...args, banner: null, avatar: null }).toDataURL('image/png');
    } catch {
      return null;
    }
  }
}

export function blurbFrom(text, max) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : max).trim()}…`;
}
