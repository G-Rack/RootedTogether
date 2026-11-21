'use client';

import { forwardRef } from 'react';
import { initialsFor } from '@/lib/roles';

// The cards a creator posts to bring people to their storefront. Three looks (warm, bold, banner)
// in three shapes (post, story, link). Everything is sized in "em" from the card's width, so one
// card looks the same at any size and can be saved as a sharp picture.
export const CARD_STYLES = [
  { key: 'warm', label: 'Warm', note: 'Soft cream, easy to read', swatch: { background: '#FBF6EF', color: '#6B4226', border: '1px solid #E8CDA8' } },
  { key: 'bold', label: 'Bold', note: 'Dark brown, big statement', swatch: { background: 'linear-gradient(160deg,#2E1B10,#4A2E1C)', color: '#C8923F' } },
  { key: 'banner', label: 'Banner', note: 'Uses your banner photo', swatch: { background: 'linear-gradient(160deg,#6B4226,#8C6A4A)', color: '#FBF6EF' } },
];

export const CARD_FORMATS = {
  post: { label: 'Instagram post', size: '1080 by 1080', px: 1080, em: 24, file: 'post' },
  story: { label: 'Story or Reel cover', size: '1080 by 1920', px: 1080, em: 42.667, file: 'story' },
  link: { label: 'Link preview', size: 'Shows when your link is shared', px: 1200, em: 12.57, file: 'link-preview' },
};

const SERIF = "var(--serif, 'Playfair Display', Georgia, serif)";
const FILL = { position: 'absolute', inset: 0 };
const BAND = 'radial-gradient(60% 120% at 88% -10%, rgba(200,146,63,0.6), transparent 60%), radial-gradient(40% 80% at 10% 120%, rgba(251,246,239,0.12), transparent 70%), linear-gradient(160deg, #6B4226, #8C6A4A)';

function Sprout({ size = '1.5em' }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: size, height: size, flex: 'none' }} fill="currentColor" aria-hidden="true">
      <path d="M12 12C12 8 8.5 6.5 4 7c0 4 3.2 6 8 5z" />
      <path d="M12 12c0-3.6 3-5.4 8-5.2 0 3.8-3 5.8-8 5.2z" />
      <rect x="11" y="12" width="2" height="9" rx="1" />
    </svg>
  );
}

// The profile picture, or their initials until they upload one. `size` is in card em.
function Avatar({ photo, initials, size, ring, border }) {
  return (
    <div
      style={{
        width: `${size}em`,
        height: `${size}em`,
        flex: 'none',
        boxSizing: 'border-box',
        borderRadius: '50%',
        background: photo ? `center / cover no-repeat url("${photo}")` : '#6B4226',
        color: '#FBF6EF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: SERIF,
        fontWeight: 700,
        boxShadow: ring,
        border,
      }}
    >
      {!photo && <span style={{ fontSize: `${size * 0.33}em` }}>{initials}</span>}
    </div>
  );
}

function Role({ children, color = '#8A5E14', size = 0.62, style }) {
  return <div style={{ fontSize: `${size}em`, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color, ...style }}>{children}</div>;
}

// Long taglines get a little smaller so they always fit the card.
function fit(text, big) {
  const n = (text || '').length;
  return n <= 38 ? big : n <= 58 ? big * 0.86 : big * 0.74;
}

function Clamp({ lines, children, style }) {
  return (
    <div style={{ display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden', ...style }}>{children}</div>
  );
}

function Pill({ children, bg, color, size = 0.8, pad = '0.75em 1.4em' }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', padding: pad, borderRadius: '99em', background: bg, color, fontWeight: 700, fontSize: `${size}em`, whiteSpace: 'nowrap' }}>{children}</div>
  );
}

function Warm({ format, d }) {
  const ring = '0 0 0 .2em #FBF6EF, 0 0 0 .3em #E8CDA8';
  if (format === 'story') {
    return (
      <div style={{ ...FILL, padding: '3.4em 2em 3.6em', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', textAlign: 'center', color: '#2E1B10' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5em', color: '#6B4226', fontWeight: 700, fontSize: '.8em', letterSpacing: '.04em' }}><Sprout />Rooted Together</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '100%' }}>
          <Avatar photo={d.avatar} initials={d.initials} size={7.4} ring={'0 0 0 .28em #FBF6EF, 0 0 0 .4em #E8CDA8'} />
          <div style={{ marginTop: '1.4em', fontFamily: SERIF, fontWeight: 700, fontSize: '2em', lineHeight: 1.1 }}>{d.name}</div>
          <Role style={{ marginTop: '.6em' }} size={0.68}>{d.role}</Role>
          <div style={{ width: '2.6em', height: '.18em', background: '#C8923F', borderRadius: '1em', margin: '1.4em 0' }} />
          <Clamp lines={5} style={{ fontFamily: SERIF, fontWeight: 700, fontSize: `${fit(d.tagline, 2.2)}em`, lineHeight: 1.22, letterSpacing: '-.01em' }}>{d.tagline}</Clamp>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.7em' }}>
          <div style={{ fontSize: '.7em', fontWeight: 600, color: '#6F5846' }}>Tap the link</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.6em', padding: '.9em 1.5em', borderRadius: '1.2em', background: '#fff', border: '1px solid #E8CDA8', boxShadow: '0 .4em 1.2em rgba(46,27,16,.1)', fontSize: '.8em', fontWeight: 700, color: '#6B4226' }}>
            {d.url}
          </div>
        </div>
      </div>
    );
  }
  if (format === 'link') {
    return (
      <div style={{ ...FILL, padding: '1.6em 1.8em', display: 'flex', alignItems: 'center', gap: '1.4em', color: '#2E1B10' }}>
        <Avatar photo={d.avatar} initials={d.initials} size={5.6} ring={ring} />
        <div style={{ minWidth: 0 }}>
          <Role size={0.6}>{d.role}</Role>
          <div style={{ marginTop: '.3em', fontFamily: SERIF, fontWeight: 700, fontSize: '1.6em', lineHeight: 1.1 }}>{d.name}</div>
          <Clamp lines={2} style={{ marginTop: '.5em', fontSize: '.78em', lineHeight: 1.45, color: '#6F5846' }}>{d.tagline}</Clamp>
          <div style={{ marginTop: '.8em', fontSize: '.62em', fontWeight: 700, color: '#6B4226' }}>{d.url}</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...FILL, padding: '2em', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#2E1B10' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.9em' }}>
        <Avatar photo={d.avatar} initials={d.initials} size={3.4} ring={ring} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: '1.3em', lineHeight: 1.15 }}>{d.name}</div>
          <Role style={{ marginTop: '.4em' }}>{d.role}</Role>
        </div>
      </div>
      <div>
        <div style={{ width: '2.4em', height: '.18em', background: '#C8923F', borderRadius: '1em', marginBottom: '1em' }} />
        <Clamp lines={5} style={{ fontFamily: SERIF, fontWeight: 700, fontSize: `${fit(d.tagline, 2.1)}em`, lineHeight: 1.2, letterSpacing: '-.01em' }}>{d.tagline}</Clamp>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1em' }}>
        <Pill bg="#6B4226" color="#FBF6EF">Shop my offerings</Pill>
        <div style={{ fontSize: '.62em', color: '#6F5846', fontWeight: 600, textAlign: 'right', lineHeight: 1.5 }}>{d.url}</div>
      </div>
    </div>
  );
}

function Bold({ format, d }) {
  const brand = { display: 'flex', alignItems: 'center', gap: '.5em', color: '#C8923F', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase' };
  if (format === 'story') {
    return (
      <div style={{ ...FILL, padding: '3.4em 2em 3.6em', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', textAlign: 'center', color: '#FBF6EF' }}>
        <div style={{ ...brand, fontSize: '.7em' }}><Sprout size="1.6em" />Rooted Together</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '100%' }}>
          <Avatar photo={d.avatar} initials={d.initials} size={6.6} ring={'0 0 0 .22em #2E1B10, 0 0 0 .38em #C8923F'} />
          <div style={{ marginTop: '1.3em', fontFamily: SERIF, fontWeight: 700, fontSize: '1.9em', lineHeight: 1.1 }}>{d.name}</div>
          <Role style={{ marginTop: '.6em' }} size={0.66} color="#C8923F">{d.role}</Role>
          <Clamp lines={5} style={{ marginTop: '1.8em', fontFamily: SERIF, fontWeight: 700, fontSize: `${fit(d.tagline, 2.35)}em`, lineHeight: 1.2, letterSpacing: '-.015em' }}>{d.tagline}</Clamp>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1em' }}>
          <Pill bg="#C8923F" color="#2E1B10" size={0.9} pad="1em 2.2em">Shop my offerings</Pill>
          <div style={{ fontSize: '.66em', fontWeight: 600, color: '#E8CDA8' }}>{d.url}</div>
        </div>
      </div>
    );
  }
  if (format === 'link') {
    return (
      <div style={{ ...FILL, padding: '1.6em 1.8em', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.2em', color: '#FBF6EF' }}>
        <div style={{ minWidth: 0 }}>
          <Role size={0.58} color="#C8923F">{d.role}</Role>
          <div style={{ marginTop: '.3em', fontFamily: SERIF, fontWeight: 700, fontSize: '1.7em', lineHeight: 1.1 }}>{d.name}</div>
          <Clamp lines={2} style={{ marginTop: '.5em', fontSize: '.78em', lineHeight: 1.45, color: '#E8CDA8' }}>{d.tagline}</Clamp>
          <div style={{ marginTop: '.8em', fontSize: '.62em', fontWeight: 700, color: '#C8923F' }}>{d.url}</div>
        </div>
        <Avatar photo={d.avatar} initials={d.initials} size={5.8} ring={'0 0 0 .18em #2E1B10, 0 0 0 .3em #C8923F'} />
      </div>
    );
  }
  return (
    <div style={{ ...FILL, padding: '2em', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#FBF6EF' }}>
      <div style={{ ...brand, fontSize: '.64em' }}><Sprout size="1.6em" />Rooted Together</div>
      <Clamp lines={5} style={{ fontFamily: SERIF, fontWeight: 700, fontSize: `${fit(d.tagline, 2.4)}em`, lineHeight: 1.16, letterSpacing: '-.015em' }}>{d.tagline}</Clamp>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1em' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.8em', minWidth: 0 }}>
          <Avatar photo={d.avatar} initials={d.initials} size={3} ring={'0 0 0 .14em #2E1B10, 0 0 0 .26em #C8923F'} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '.92em' }}>{d.name}</div>
            <Role size={0.6} color="#E8CDA8" style={{ marginTop: '.2em', letterSpacing: '.12em' }}>{d.role}</Role>
          </div>
        </div>
        <Pill bg="#C8923F" color="#2E1B10" size={0.78} pad=".8em 1.3em">Shop now</Pill>
      </div>
    </div>
  );
}

function Banner({ format, d }) {
  const band = d.banner ? `linear-gradient(180deg, rgba(46,27,16,0.05), rgba(46,27,16,0.25)), center / cover no-repeat url("${d.banner}")` : BAND;
  if (format === 'story') {
    return (
      <div style={{ ...FILL, color: '#2E1B10' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '16em', background: band }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: '3.6em', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '.5em', color: 'rgba(251,246,239,.92)', fontWeight: 700, fontSize: '.74em', letterSpacing: '.16em', textTransform: 'uppercase' }}><Sprout size="1.6em" />Rooted Together</div>
        <div style={{ position: 'absolute', left: '50%', top: '11.8em', marginLeft: '-4.2em' }}>
          <Avatar photo={d.avatar} initials={d.initials} size={8.4} border=".3em solid #fff" ring="0 .5em 1.2em rgba(46,27,16,.25)" />
        </div>
        <div style={{ position: 'absolute', left: '2em', right: '2em', top: '21.6em', textAlign: 'center' }}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: '2em', lineHeight: 1.12 }}>{d.name}</div>
          <Role style={{ marginTop: '.6em' }} size={0.66}>{d.role}</Role>
          <Clamp lines={4} style={{ marginTop: '1.4em', fontFamily: SERIF, fontWeight: 700, fontSize: `${fit(d.tagline, 1.5)}em`, lineHeight: 1.28 }}>{d.tagline}</Clamp>
        </div>
        <div style={{ position: 'absolute', left: '2em', right: '2em', bottom: '3.6em', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1em' }}>
          <Pill bg="#6B4226" color="#FBF6EF" size={0.9} pad="1em 2.2em">Shop my offerings</Pill>
          <div style={{ fontSize: '.66em', fontWeight: 600, color: '#6F5846' }}>{d.url}</div>
        </div>
      </div>
    );
  }
  if (format === 'link') {
    return (
      <div style={{ ...FILL, display: 'flex', color: '#2E1B10' }}>
        <div style={{ width: '8.4em', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: band }}>
          <Avatar photo={d.avatar} initials={d.initials} size={5.2} border=".22em solid #fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: '1.4em 1.5em', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Role size={0.58}>{d.role}</Role>
          <div style={{ marginTop: '.3em', fontFamily: SERIF, fontWeight: 700, fontSize: '1.5em', lineHeight: 1.1 }}>{d.name}</div>
          <Clamp lines={2} style={{ marginTop: '.5em', fontSize: '.76em', lineHeight: 1.45, color: '#6F5846' }}>{d.tagline}</Clamp>
          <div style={{ marginTop: '.8em', fontSize: '.62em', fontWeight: 700, color: '#6B4226' }}>{d.url}</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...FILL, color: '#2E1B10' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '8.4em', background: band }} />
      <div style={{ position: 'absolute', right: '1.6em', top: '1.4em', color: 'rgba(251,246,239,.9)', fontWeight: 700, fontSize: '.62em', letterSpacing: '.16em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '.5em' }}><Sprout size="1.8em" />Rooted Together</div>
      <div style={{ position: 'absolute', left: '2em', top: '5.7em' }}>
        <Avatar photo={d.avatar} initials={d.initials} size={5.4} border=".25em solid #fff" ring="0 .4em 1em rgba(46,27,16,.25)" />
      </div>
      <div style={{ position: 'absolute', left: '2em', right: '2em', top: '11.7em' }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: '1.5em', lineHeight: 1.15 }}>{d.name}</div>
        <Role style={{ marginTop: '.4em' }}>{d.role}</Role>
        <Clamp lines={3} style={{ marginTop: '.8em', fontSize: '.92em', lineHeight: 1.5, color: '#6F5846' }}>{d.tagline}</Clamp>
      </div>
      <div style={{ position: 'absolute', left: '2em', right: '2em', bottom: '1.7em', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1em' }}>
        <Pill bg="#6B4226" color="#FBF6EF">Shop my offerings</Pill>
        <div style={{ fontSize: '.62em', color: '#6F5846', fontWeight: 600, textAlign: 'right' }}>{d.url}</div>
      </div>
    </div>
  );
}

const ShareCard = forwardRef(function ShareCard({ variant = 'warm', format = 'post', width = 300, name, role, handle, tagline, avatar, banner }, ref) {
  const base = width / 24;
  const f = CARD_FORMATS[format] || CARD_FORMATS.post;
  const d = {
    name: name || 'Your name',
    role: role || '',
    tagline: (tagline || '').trim() || 'Your tagline appears here',
    initials: initialsFor(name || 'Your name'),
    url: `rootedtogether.club/creator/${handle || 'your-handle'}`,
    avatar,
    banner,
  };
  const skin =
    variant === 'bold'
      ? { background: 'linear-gradient(160deg,#2E1B10 0%,#4A2E1C 100%)' }
      : variant === 'banner'
        ? { background: '#FFFFFF', border: '1px solid #EADBC8' }
        : { background: '#FBF6EF', border: '1px solid #E8CDA8' };
  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        flex: 'none',
        width,
        height: Math.round(f.em * base),
        fontSize: base,
        fontFamily: 'var(--sans, Inter, system-ui, sans-serif)',
        borderRadius: (format === 'link' ? 0.9 : 1.2) * base,
        boxShadow: `0 ${base * 0.5}px ${base * 1.6}px rgba(46,27,16,.14)`,
        ...skin,
      }}
    >
      {variant === 'bold' ? <Bold format={format} d={d} /> : variant === 'banner' ? <Banner format={format} d={d} /> : <Warm format={format} d={d} />}
    </div>
  );
});

export default ShareCard;
