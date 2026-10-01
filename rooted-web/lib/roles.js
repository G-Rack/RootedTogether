// Mirrors src/roleLabels.js in the Expo app — same wording everywhere
// someone's role shows up, on the app or the website.
export const ROLE_LABELS = {
  seeker: 'Spiritual Seeker',
  assistant: 'Spiritual Assistant',
  mother: 'Spiritual Mother',
  pastor: 'Priest / Pastor',
  influencer: 'Spiritual Leader',
};

export function initialsFor(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function formatPrice(cents) {
  if (!cents) return 'Free';
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export const OFFERING_TYPE_LABELS = {
  course: 'Course',
  ebook: 'Ebook',
  routine: 'Daily Routine',
  call: '1:1 Call',
};
