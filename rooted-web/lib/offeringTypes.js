// Every kind of thing a creator can sell. One list, used by the home page
// filters, the upload form, the cards and the storefront tabs, so adding a
// type is a one-place change (plus the offerings_type_check rule in the database).
//
// `accept` is the file picker filter for the file buyers receive after purchase.
// Courses and calls don't use it: courses hold lessons, calls hold a booking link.
const BROAD_ACCEPT = '.pdf,.doc,.docx,.zip,.mp3,.mp4,.epub';

export const OFFERING_TYPES = [
  {
    key: 'course',
    label: 'Course',
    plural: 'Courses',
    blurb: 'Multi-part video and written teaching series from Leaders, Mothers, and Pastors.',
    tint: '#F1E4D3',
    ink: '#6B4226',
    dot: 'var(--brown)',
  },
  {
    key: 'ebook',
    label: 'Ebook',
    plural: 'Ebooks',
    blurb: 'Devotionals, testimonies, and study guides, read on your own time.',
    accept: BROAD_ACCEPT,
    fileHint: 'a PDF or EPUB',
    tint: '#6B4226',
    ink: '#FBF6EF',
    dot: 'var(--brown-light)',
  },
  {
    key: 'printable',
    label: 'Printable',
    plural: 'Printables',
    blurb: 'Prayer journals, planners, and study sheets to print and keep.',
    accept: '.pdf,.png,.jpg,.jpeg,.zip',
    fileHint: 'a PDF, an image, or a zip of printable pages',
    tint: '#E8CDA8',
    ink: '#2E1B10',
    dot: '#C8923F',
  },
  {
    key: 'audio',
    label: 'Audiobook',
    plural: 'Audiobooks',
    blurb: 'Chapter-by-chapter audio: guided prayers, teachings, and meditations to listen to anywhere.',
    accept: '.mp3,.m4a,.wav,.aac',
    fileHint: 'your audio files',
    tint: '#8C6A4A',
    ink: '#FBF6EF',
    dot: '#8C6A4A',
  },
  {
    key: 'template',
    label: 'Template',
    plural: 'Templates',
    blurb: 'Workbooks, planners, and leader kits you can fill in and reuse.',
    accept: '.docx,.xlsx,.pptx,.pdf,.zip',
    fileHint: 'a Word, Excel, PowerPoint or PDF file',
    tint: '#F1E4D3',
    ink: '#6B4226',
    dot: '#6B4226',
  },
  {
    key: 'routine',
    label: 'Daily Routine',
    plural: 'Daily Routines',
    blurb: 'Prayer, journaling, and practice plans you can follow day to day.',
    accept: BROAD_ACCEPT,
    fileHint: 'a PDF or audio file',
    tint: '#E8CDA8',
    ink: '#2E1B10',
    dot: 'var(--brown-pale)',
  },
  {
    key: 'call',
    label: '1:1 Call',
    plural: '1:1 Calls',
    blurb: 'Book real time with a Mother, Pastor, or Leader, scheduled by the minute.',
    tint: '#2E1B10',
    ink: '#C8923F',
    dot: 'var(--text-soft)',
  },
  {
    key: 'bundle',
    label: 'Bundle',
    plural: 'Bundles',
    blurb: 'Several resources from one creator, delivered together as a single download.',
    accept: '.zip',
    fileHint: 'a zip with everything inside',
    tint: '#C8923F',
    ink: '#2E1B10',
    dot: '#2E1B10',
  },
];

export const OFFERING_TYPE_KEYS = OFFERING_TYPES.map((t) => t.key);

export const OFFERING_TYPE_BY_KEY = Object.fromEntries(OFFERING_TYPES.map((t) => [t.key, t]));

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
];
