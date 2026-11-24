// Small helpers for search-engine pages: the public address, tidy text for titles and descriptions,
// and safe JSON-LD (structured data) for a page.

// The address the site really lives on (rootedtogether.club sends visitors to www).
export const SITE_URL = 'https://www.rootedtogether.club';

// Plain one-line text, cut at a word boundary with an ellipsis if it is longer than max.
export function clip(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.\-–—]+$/, '')}…`;
}

// JSON-LD ready to put inside a <script type="application/ld+json">. The "<" is escaped so text
// from the database can never close the script early.
export function jsonLdString(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
