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

// Multi-chapter courses. Each chapter is its own PDF guide under downloads/ in the pro-academy bucket;
// a chapter whose PDF has not been uploaded yet shows "coming soon". `minutes` is the reading time.
// One tick per chapter is saved as `${key}-ch${n}`. The workbook is the one PDF that goes with the course.
const WORKBOOK = {
  path: 'downloads/social-media-workbook.pdf',
  title: 'Social Media That Serves and Sells: Workbook',
  note: 'PDF · print it or fill it in on screen',
  summary: 'One page for each chapter\'s action: your plan, a profile checklist, a hook bank, invitation messages, a four-week content calendar, a weekly review and the ads checklists.',
  inside: [
    'Your "I help" sentence, three themes and posting days',
    'Instagram profile checklist and a bank of 20 hooks',
    'Creative hub checklist, caption formula and the five-question invitation post',
    'Ten personal invitations, with thank-you and check-in messages',
    'A four-week content calendar and a Sunday ten-minute review',
    'Meta and Google test checklists',
  ],
};

export const COURSES = [
  {
    slug: 'social-media-that-sells',
    cover: '/academy/social-media-that-sells.jpg',
    key: 'social',
    cardTitle: 'Social media that serves and sells',
    cardSubtitle: 'Eight short guides on Instagram, TikTok, the Creative hub and posting.',
    pill: 'COURSE',
    icon: 'course',
    title: 'Social media that serves and sells',
    kind: 'COURSE · 8 CHAPTERS',
    summary: 'Build a simple plan, then show up on Instagram, TikTok and the places your people already are, turn followers into buyers, and learn what is working. One workbook goes with it.',
    template: WORKBOOK,
    chapters: [
      { n: 1, title: 'Your plan', minutes: 4, file: 'downloads/social-01-your-plan.pdf', summary: 'One audience, three kinds of posts and a weekly rhythm you can keep.', action: 'Write your "I help" sentence three ways, pick the narrowest, and choose your three themes and posting days.' },
      { n: 2, title: 'Instagram', minutes: 5, file: 'downloads/social-02-instagram.pdf', summary: 'Set up your profile and use Reels, carousels and Stories well.', action: 'Update your profile with the checklist, post one Reel and share three Stories.' },
      { n: 3, title: 'TikTok', minutes: 5, file: 'downloads/social-03-tiktok.pdf', summary: 'Hooks, the first three seconds, and what to film.', action: 'Film five hooks in one sitting and post two of them.' },
      { n: 4, title: 'Facebook, YouTube Shorts and WhatsApp', minutes: 4, file: 'downloads/social-04-other-places.pdf', summary: 'Make it once, share it in several places, and use groups kindly.', action: 'Repost one video in two new places and share your link with one group you already belong to.' },
      { n: 5, title: 'Using the Rooted Creative hub', minutes: 4, file: 'downloads/social-05-creative-hub.pdf', summary: 'Turn your shop, offerings and reviews into ready-to-post pictures and captions.', action: 'Make two posts in different looks, post one and save the other.' },
      { n: 6, title: 'Posting tips', minutes: 5, file: 'downloads/social-06-posting-tips.pdf', summary: 'Captions, hashtags, comments, messages and the invitation post.', action: 'Write one invitation post and reply to every comment for seven days.' },
      { n: 7, title: 'Turning followers into buyers', minutes: 4, file: 'downloads/social-07-followers-to-buyers.pdf', summary: 'A ready storefront, your link everywhere, one first offer and ten personal invitations.', action: 'Check your storefront, add your link to every profile and send ten personal invitations.' },
      { n: 8, title: 'Reading your numbers', minutes: 3, file: 'downloads/social-08-your-numbers.pdf', summary: 'Four numbers and three questions, in ten minutes a week.', action: 'Put a ten-minute review in your calendar every Sunday for four weeks.' },
    ],
  },
  {
    slug: 'create-content-with-ai',
    cover: '/academy/create-content-with-ai.jpg',
    key: 'ai',
    cardTitle: 'Create content with AI',
    cardSubtitle: 'Seven short guides on writing, images and video with AI, including Higgsfield.',
    pill: 'COURSE',
    icon: 'course',
    title: 'Create content with AI',
    kind: 'COURSE · 7 CHAPTERS',
    summary: 'Use AI to write your captions, make pictures and short video clips, and connect tools like Higgsfield to Claude so you can ask in plain English, while keeping your own voice and staying honest with your community.',
    template: {
      path: 'downloads/ai-content-prompt-library.pdf',
      title: 'AI Content Prompt Library',
      note: 'PDF · copy and paste the prompts',
      summary: 'Ready-to-use prompts for writing, images, video and the Claude plus Higgsfield connection, with a voice file, a weekly batch plan and a pre-posting checklist.',
      inside: [],
    },
    chapters: [
      { n: 1, title: 'The AI content workflow', minutes: 4, file: 'downloads/ai-01-workflow.pdf', summary: 'Where AI helps, where you stay in charge, and a weekly routine.', action: 'Choose one teaching from your own life and say it in your own words in three or four sentences.' },
      { n: 2, title: 'Writing with AI', minutes: 6, file: 'downloads/ai-02-writing.pdf', summary: 'Prompts that give you captions and scripts in your own voice.', action: 'Write a six-part prompt, get a caption, edit it until it sounds like you, and save your voice file.' },
      { n: 3, title: 'Images and graphics', minutes: 5, file: 'downloads/ai-03-images.pdf', summary: 'Describe a picture clearly and keep a consistent look.', action: 'Make three images in your colours and use your favourite this week.' },
      { n: 4, title: 'Video with Higgsfield', minutes: 6, file: 'downloads/ai-04-video.pdf', summary: 'Type a prompt, or bring a photo to life, and get a short clip back.', action: 'Make three short clips for one teaching and join them with your own voiceover.' },
      { n: 5, title: 'Connect Higgsfield to Claude', minutes: 5, file: 'downloads/ai-05-connect-higgsfield.pdf', summary: 'Ask in plain English and get the words and the visuals in one conversation.', action: 'Connect Higgsfield to Claude and ask for one caption and three clips.' },
      { n: 6, title: 'Schedule, repurpose and boost', minutes: 4, file: 'downloads/ai-06-schedule-boost.pdf', summary: 'Batch a week, turn one idea into five pieces, and boost what works.', action: 'Prepare and schedule one full week of posts in a single sitting.' },
      { n: 7, title: 'Using AI well', minutes: 4, file: 'downloads/ai-07-using-ai-well.pdf', summary: 'Stay honest, protect people, check your facts and keep your voice.', action: 'Write your own three AI rules and keep them where you work.' },
    ],
  },
  {
    slug: 'grow-with-your-community',
    key: 'comm',
    cardTitle: 'Grow with your community',
    cardSubtitle: 'Five short chapters on building a community in the app and growing your following from Instagram.',
    pill: 'COURSE',
    icon: 'course',
    title: 'Grow with your community',
    kind: 'COURSE · 5 CHAPTERS',
    summary: 'Start a community in the Rooted Together app, welcome people and keep them talking, invite people from Instagram with the Creative hub, grow your following and, when you are ready, share what you offer. No promises of income, just steady, honest steps.',
    template: {
      path: 'downloads/community-workbook.pdf',
      title: 'Community Growth Workbook',
      note: 'PDF · five pages to fill in',
      summary: 'Your purpose and first ten members, a weekly posting rhythm, your Instagram plan, a weekly tracker and a template for your first invitation.',
      inside: [],
    },
    chapters: [
      { n: 1, title: 'Start your community', minutes: 5, file: 'downloads/community-01-start.pdf', summary: 'A clear purpose, a name, a picture and your first ten members.', action: 'Write your purpose sentence, create the community in the app and invite ten people personally.' },
      { n: 2, title: 'Welcome people and keep them talking', minutes: 5, file: 'downloads/community-02-welcome.pdf', summary: 'A weekly rhythm of three simple posts and a habit of welcoming by name.', action: 'Choose your three weekly posts, post this week\'s question and reply to every comment.' },
      { n: 3, title: 'Grow your community from Instagram', minutes: 5, file: 'downloads/community-03-instagram.pdf', summary: 'Use the Creative hub picture, caption and community link to invite people.', action: 'Make a community picture in the Creative hub and post it with your link in your bio.' },
      { n: 4, title: 'Grow your following through your community', minutes: 5, file: 'downloads/community-04-following.pdf', summary: 'Let your community feed your content, and be useful in other communities.', action: 'Finish your profile, add a Story a day for five days and answer three questions kindly.' },
      { n: 5, title: 'From members to people you serve', minutes: 4, file: 'downloads/community-05-buyers.pdf', summary: 'Serve first, invite second, and keep it honest.', action: 'Write the need your members mention most and draft one honest invitation.' },
    ],
  },
  {
    slug: 'paid-ads-for-creators',
    cover: '/academy/paid-ads-for-creators.jpg',
    key: 'ads',
    cardTitle: 'Paid ads for creators (optional)',
    cardSubtitle: 'A careful first test on Meta and on Google, with the faith-content rules.',
    pill: 'COURSE',
    icon: 'course',
    title: 'Paid ads for creators',
    kind: 'COURSE · 2 CHAPTERS · OPTIONAL',
    summary: 'For when your organic posts are working. Run one small, capped test on Meta or Google without risking money you cannot spare, and without breaking the rules for faith content.',
    template: WORKBOOK,
    chapters: [
      { n: 1, title: 'Meta ads: Instagram and Facebook', minutes: 6, file: 'downloads/ads-01-meta.pdf', summary: 'When to start, what the rules say, and how to boost a post safely.', action: 'If your organic posts are working, run one small capped test with the checklist.' },
      { n: 2, title: 'Google ads: Search', minutes: 6, file: 'downloads/ads-02-google.pdf', summary: 'Reach people who are already searching for the help you offer.', action: 'If people search for your offering, plan one Search test with a fixed budget.' },
    ],
  },
];

for (const c of COURSES) for (const ch of c.chapters) ch.key = `${c.key}-ch${ch.n}`;


// Everything shown in the Academy list: the single lessons first, then the multi-chapter courses.
export const ALL_ITEMS = [...LESSONS, ...COURSES];

export function getLesson(slug) {
  return ALL_ITEMS.find((l) => l.slug === slug) || null;
}

// The tick-boxes of a lesson (its steps) or of a course (its chapters).
export function lessonStepKeys(lesson) {
  return (lesson.chapters || lesson.steps).map((s) => s.key);
}

export function lessonMinutes(lesson) {
  return lesson.minutes ?? lesson.chapters.reduce((t, c) => t + c.minutes, 0);
}
