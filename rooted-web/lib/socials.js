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
    key: 'x_url',
    label: 'X (Twitter)',
    placeholder: '@yourhandle or x.com/…',
    toValue: (v) => {
      v = clean(v);
      if (!v) return null;
      if (/^https?:\/\//i.test(v) || /(x|twitter)\.com/i.test(v)) return withHttps(v);
      return `https://x.com/${stripAt(v)}`;
    },
    toHref: (v) => v,
    icon: icon(<path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.5 22H1.4l8.2-9.3L1 2h7.2l5 6.6zM17.6 20h1.7L6.5 3.9H4.7z" />, true),
  },
  {
    key: 'facebook_url',
    label: 'Facebook',
    placeholder: 'facebook.com/yourpage',
    toValue: (v) => {
      v = clean(v);
      if (!v) return null;
      if (/^https?:\/\//i.test(v) || v.includes('facebook.com') || v.includes('fb.com')) return withHttps(v);
      return `https://facebook.com/${stripAt(v)}`;
    },
    toHref: (v) => v,
    icon: icon(<path d="M13.5 21v-8.1h2.7l.4-3.2h-3.1V7.7c0-.9.3-1.6 1.6-1.6h1.7V3.2C16.5 3.1 15.4 3 14.2 3c-2.6 0-4.4 1.6-4.4 4.5v2.2H7.1v3.2h2.7V21z" />, true),
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    placeholder: 'Phone number with country code, e.g. +1 555 123 4567',
    // Stored as plain digits (no +, spaces or dashes) so wa.me works.
    toValue: (v) => {
      const digits = clean(v).replace(/\D/g, '');
      return digits || null;
    },
    toHref: (v) => `https://wa.me/${v}`,
    display: (v) => `+${v}`,
    icon: icon(<path d="M12 2a10 10 0 00-8.6 15L2 22l5.2-1.4A10 10 0 1012 2zm5.8 14.3c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.6-.6-2.9-1.3-4.8-4.2-5-4.4-.1-.2-1.2-1.6-1.2-3s.8-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5s.8 2 .9 2.1c.1.2.1.4 0 .6-.1.2-.2.3-.4.5-.2.2-.4.4-.5.6-.2.2-.4.4-.2.7.2.3.9 1.5 1.9 2.4 1.3 1.2 2.4 1.5 2.7 1.7.3.2.5.1.7-.1.2-.2.9-1 1.1-1.4.2-.4.4-.3.7-.2.3.1 2 .9 2.3 1.1.3.2.5.2.6.4.1.2.1.9-.1 1.5z" />, true),
  },
  {
    key: 'contact_email',
    label: 'Email',
    placeholder: 'you@example.com',
    toValue: (v) => clean(v) || null,
    toHref: (v) => `mailto:${v}`,
    display: (v) => v,
    icon: icon(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>),
  },
  {
    key: 'website_url',
    label: 'Website',
    placeholder: 'yourwebsite.com',
    toValue: (v) => {
      v = clean(v);
      return v ? withHttps(v) : null;
    },
    toHref: (v) => v,
    icon: icon(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" /></>),
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

// A storefront's stored value shown back in the edit form. Social URLs are
// shown as stored; WhatsApp digits get their leading +.
export function formValue(s, stored) {
  if (!stored) return '';
  return s.key === 'whatsapp' ? `+${stored}` : stored;
}
