// Creator Academy content: a list of short lessons. Each lesson has one video, one template
// and a few small actions the creator ticks off. To add a lesson, add another object to LESSONS.
//
// The lesson page looks in the private `pro-academy` storage bucket for each lesson's files:
//   videos/sell-more-from-your-storefront.mp4       the five-minute video
//   downloads/first-product-starter-kit.docx        the worksheet kit that goes with it
// A Watch or Download button appears as soon as the file is there. To replace either
// one, upload a new file under the same name in Supabase (Storage, pro-academy).

// The Getting started intro video is free for every creator (Pro or not). It comes in two
// versions, and the storage policy "pro academy read" lets any signed-in person read exactly
// these two files. Upload both under videos/ in the pro-academy bucket with these names.
export const INTRO_GUIDES = [
  { key: 'grace', name: 'Grace', path: 'videos/sell-more-from-your-storefront.mp4' },
  { key: 'samuel', name: 'Pastor Samuel', path: 'videos/sell-more-from-your-storefront-pastor-samuel.mp4' },
];

export const LESSONS = [
  {
    slug: 'getting-started',
    key: 'first-product', // progress rows are saved as `${key}-${step number}`
    cardTitle: 'Getting started: upload your first product',
    cardSubtitle: 'One short video, one template and five small actions.',
    pill: 'VIDEO COURSE',
    icon: 'course',
    cover: '/academy/getting-started.jpg', // banner shown on the lesson card and the video tile
    title: 'Sell more from your storefront',
    kind: 'VIDEO COURSE · 5 MINUTES',
    minutes: 5,
    summary: 'Five simple steps to sell your first product, and your tenth, in a way that feels like serving people instead of pushing them.',
    video: 'videos/sell-more-from-your-storefront.mp4',
    steps: [
      { n: 1, title: 'Know exactly who you serve', action: 'Write three versions of your "I help [who] with [problem]" sentence, pick the narrowest, and say it out loud to three people this week.' },
      { n: 2, title: 'Package and price your offer', action: 'Choose your first product, write its one-sentence promise, and set a price.' },
      { n: 3, title: 'An offer people understand in ten seconds', action: 'Write your offer in the five-question shape, and run the ten-second test on one person.' },
      { n: 4, title: 'Invite people without pressure', action: 'Send ten personal invitations this week, one at a time, using each person’s name.' },
      { n: 5, title: 'Follow up and keep your buyers', action: 'Write your thank-you and one-week check-in messages today, so they are ready for your first buyer.' },
    ],
    template: {
      path: 'downloads/first-product-starter-kit.docx',
      title: 'Your First Product Starter Kit',
      note: 'Word document · works in Google Docs and Pages',
      summary: 'One worksheet for each step in the video. Fill it in as you go, and you finish with your first product described, priced and ready to share.',
      inside: [
        'Your “I help [who] with [problem]” sentence',
        'A one-page plan for your first product and its price',
        'The five questions and the ten-second test',
        'A ready-to-use invitation and a list of your first ten people',
        'Your thank-you and one-week check-in messages',
      ],
    },
  },
];

for (const l of LESSONS) for (const s of l.steps) s.key = `${l.key}-${s.n}`;

export function getLesson(slug) {
  return LESSONS.find((l) => l.slug === slug) || null;
}

export function lessonStepKeys(lesson) {
  return lesson.steps.map((s) => s.key);
}
