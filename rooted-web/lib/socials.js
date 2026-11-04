import React from 'react';

// Creator contact / social links. Each entry maps to a column on
// creator_storefronts. `toValue` cleans what a creator types into what we
// store; `toHref` turns the stored value into a link for the storefront.
const clean = (v) => (v || '').trim();
const withHttps = (v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);
const stripAt = (v) => v.replace(/^@/, '');

const icon = (children, fill) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

// Creators can be reached through Instagram, TikTok, or by message in the
// Rooted Together app. Those are the only contact options on a storefront, so
// the list is deliberately short.
export const SOCIALS = [
  {
    key: 'instagram_url',
    label: 'Instagram',
    placeholder: '@yourhandle or instagram.com/…',
    toValue: (v) => {
      v = clean(v);
      if (!v) return null;
      if (/^https?:\/\//i.test(v) || v.includes('instagram.com')) return withHttps(v);
      return `https://instagram.com/${stripAt(v)}`;
    },
    toHref: (v) => v,
    icon: icon(<><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" /></>),
  },
  {
    key: 'tiktok_url',
    label: 'TikTok',
    placeholder: '@yourhandle or tiktok.com/@…',
    toValue: (v) => {
      v = clean(v);
      if (!v) return null;
      if (/^https?:\/\//i.test(v) || v.includes('tiktok.com')) return withHttps(v);
      return `https://www.tiktok.com/@${stripAt(v)}`;
    },
    toHref: (v) => v,
    icon: icon(<path d="M16.6 5.8A4.3 4.3 0 0115.5 3h-3.1v12.4a2.6 2.6 0 11-1.8-2.5V9.7a5.7 5.7 0 105 5.7V9.1a7.3 7.3 0 004.3 1.4V7.4a4.3 4.3 0 01-3.3-1.6z" />, true),
  },
];

// Which socials a storefront row actually has filled in.
export function activeSocials(storefront) {
  if (!storefront) return [];
  return SOCIALS.filter((s) => storefront[s.key]).map((s) => ({
    ...s,
    value: storefront[s.key],
    href: s.toHref(storefront[s.key]),
    text: s.display ? s.display(storefront[s.key]) : s.label,
  }));
}

// A storefront's stored value shown back in the edit form.
export function formValue(s, stored) {
  if (!stored) return '';
  return stored;
}
