// Caption writer for the Creative hub. Plain functions, no network: every call
// gives the same caption for the same inputs, and `variant` (0, 1, 2, ...)
// walks through different openings so "Another idea" really is different.

export function blurbFrom(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${cut.slice(0, at > 40 ? at : max).trim()}…`;
}

const IG_TAGS = '#rootedtogether #faith #spiritualgrowth #prayer #christianliving #faithjourney';
const TT_TAGS = '#faithtok #rootedtogether #prayer #christiantok #spiritualgrowth';

function pick(list, variant) {
  return list[((variant % list.length) + list.length) % list.length];
}

function listText(items) {
  const clean = (items || []).filter(Boolean);
  if (clean.length <= 1) return clean.join('');
  return `${clean.slice(0, -1).join(', ')} and ${clean[clean.length - 1]}`;
}

// info: { kind, platform, url, name, tagline, bio, types: ['Courses', ...],
//         fromPrice, offering: {title, typeLabel, priceLabel, description},
//         quote: {body, reviewer, offeringTitle}, community: {name, description, memberCount}, count }
export function buildCaption(info, variant = 0) {
  const { kind, platform, url } = info;
  const ig = platform === 'instagram';
  const tags = ig ? IG_TAGS : TT_TAGS;
  const linkLine = ig ? `Link in my bio, or go straight here: ${url}` : `Link in my bio: ${url}`;
  const types = listText((info.types || []).slice(0, 4)).toLowerCase();
  const intro = info.tagline || blurbFrom(info.bio, 130);
  const from = info.fromPrice ? `, from ${info.fromPrice}` : '';

  if (kind === 'community' && info.community) {
    const cm = info.community;
    const blurb = blurbFrom(cm.description, ig ? 200 : 110);
    const joinLine = ig ? `Join here (link in my bio, or go straight to it): ${url}` : `Join: ${url}`;
    const count = cm.memberCount > 1 ? `${cm.memberCount} of us are already inside.` : '';
    const hooks = [
      `I started a community for you: ${cm.name}.`,
      `There is a seat for you in ${cm.name}.`,
      `Come and pray, share and grow with us in ${cm.name}.`,
      `You do not have to walk this alone. Join ${cm.name}.`,
    ];
    const hook = pick(hooks, variant);
    const how = 'It is free. Download the Rooted Together app, tap the leaf at the top of Explore, find us and tap Join.';
    if (!ig) return `${hook} ${blurb ? `${blurb} ` : ''}${count} ${joinLine} ${tags}`.replace(/\s+/g, ' ').trim();
    return `${hook}\n\n${blurb ? `${blurb}\n\n` : ''}${count ? `${count}\n\n` : ''}${how}\n\n${joinLine}\n\n${tags}`;
  }

  if (kind === 'offering' && info.offering) {
    const o = info.offering;
    const blurb = blurbFrom(o.description, ig ? 170 : 100);
    const hooks = [
      `New on Rooted Together: ${o.title}.`,
      `This one is close to my heart: ${o.title}.`,
      `If you have been looking for a place to start, try ${o.title}.`,
      `${o.title} is ready for you.`,
    ];
    const hook = pick(hooks, variant);
    const detail = `${o.typeLabel} · ${o.priceLabel}`;
    if (!ig) return `${hook} ${blurb ? `${blurb} ` : ''}${detail}. ${linkLine} ${tags}`.replace(/\s+/g, ' ').trim();
    return `${hook}\n\n${blurb ? `${blurb}\n\n` : ''}${detail}\n\n${linkLine}\n\n${tags}`;
  }

  if (kind === 'quote' && info.quote) {
    const q = info.quote;
    const body = blurbFrom(q.body, ig ? 220 : 130);
    const hooks = [
      'Kind words from someone who tried it:',
      'This made my day.',
      'A note I wanted to share with you.',
    ];
    const hook = pick(hooks, variant);
    const who = `${q.reviewer || 'A student'}${q.offeringTitle ? `, on ${q.offeringTitle}` : ''}`;
    if (!ig) return `${hook} “${body}” (${who}) ${linkLine} ${tags}`.replace(/\s+/g, ' ').trim();
    return `${hook}\n\n“${body}”\n${who}\n\nThank you. If you would like to try it too:\n${linkLine}\n\n${tags}`;
  }

  if (kind === 'collage') {
    const hooks = [
      `Everything I have made for you, in one place.`,
      `A little peek at what is inside my shop.`,
      `Here is what you can find on my Rooted Together shop.`,
      `Looking for something for your faith journey? Start here.`,
    ];
    const hook = pick(hooks, variant);
    const inside = types ? `Inside: ${types}${from}.` : '';
    if (!ig) return `${hook} ${inside} ${linkLine} ${tags}`.replace(/\s+/g, ' ').trim();
    return `${hook}\n\n${intro ? `${intro}\n\n` : ''}${inside ? `${inside}\n\n` : ''}${linkLine}\n\n${tags}`;
  }

  // storefront
  const hooks = [
    `My shop is open on Rooted Together.`,
    `Come and see what I have been building for you.`,
    `Welcome. This is my home on Rooted Together.`,
    `Everything I offer, in one link.`,
  ];
  const hook = pick(hooks, variant);
  const inside = types ? `Inside: ${types}${from}.` : '';
  if (!ig) return `${hook} ${inside} ${linkLine} ${tags}`.replace(/\s+/g, ' ').trim();
  return `${hook}\n\n${intro ? `${intro}\n\n` : ''}${inside ? `${inside}\n\n` : ''}${linkLine}\n\n${tags}`;
}

export const CAPTION_VARIANTS = 4;
