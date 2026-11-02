// Creator Academy content. The lesson text lives in the training documents; this file is the
// map the Academy page uses: which lessons exist, the one action each ends with, and which
// files to look for in the private `pro-academy` storage bucket.
//
// To add a video to a lesson, upload it to the bucket under videos/ using the file name
// shown in `video` below (for example videos/sell-more-1.mp4). To add a download, upload
// it under downloads/ with the file name shown in DOWNLOADS. Nothing else needs changing:
// the page checks the bucket and shows a Watch or Download button once the file is there.

export const COURSES = [
  {
    key: 'sell-more',
    title: 'Sell more from your storefront',
    kind: 'VIDEO COURSE · 5 LESSONS',
    minutes: 90,
    summary: 'How to sell your first product, and your tenth, in a way that feels like serving people instead of pushing them.',
    lessons: [
      { n: 1, title: 'Know exactly who you serve', action: 'Write three versions of your "I help [who] with [problem]" sentence, pick the narrowest, and say it to three people.' },
      { n: 2, title: 'Package and price your offer', action: 'Choose your first product, write its one-sentence promise, and set a price.' },
      { n: 3, title: 'Write an offer people understand in ten seconds', action: 'Write your offer in the five-question shape, then run the ten-second test on one person.' },
      { n: 4, title: 'Invite people without pressure', action: 'Send ten personal invitations this week, one at a time, using each person’s name.' },
      { n: 5, title: 'Follow up and keep your buyers', action: 'Write your thank-you message and your one-week check-in message now, so they are ready for your first buyer.' },
    ],
  },
  {
    key: 'social',
    title: 'Instagram and TikTok for creators',
    kind: 'VIDEO COURSE · 5 LESSONS',
    minutes: 75,
    summary: 'How to be found, be trusted, and send people to your storefront, with habits that outlast any one feature.',
    lessons: [
      { n: 1, title: 'Set up your profile so people know what you offer', action: 'Rewrite your name field, bio and link today, then pin your three posts.' },
      { n: 2, title: 'Four kinds of posts that serve people', action: 'Write down eight post ideas, two teach, two tell, two show and two invite.' },
      { n: 3, title: 'Short video scripts you can film in ten minutes', action: 'Film one teach video and one tell video this week. Do not edit them. Post them.' },
      { n: 4, title: 'A weekly posting rhythm you can keep', action: 'Choose your three posting days and put a 45-minute filming block on your calendar.' },
      { n: 5, title: 'Comments and DMs that turn followers into buyers', action: 'Answer every comment and message from the last week, and ask a question back in at least five of them.' },
    ],
  },
];

for (const c of COURSES) {
  for (const l of c.lessons) {
    l.key = `${c.key}-${l.n}`;
    l.video = `videos/${c.key}-${l.n}.mp4`;
  }
}

export const DOWNLOADS = [
  { file: 'storefront-content-guide.pdf', title: 'Storefront content guide', note: 'PDF guide' },
  { file: '30-day-launch-plan.pdf', title: '30-day launch plan', note: 'PDF checklist' },
  { file: 'post-and-story-templates.zip', title: 'Post and story templates', note: 'Editable files' },
  { file: 'swipe-file.pdf', title: 'Swipe file: captions, offers and follow-ups', note: 'PDF' },
];

export const ALL_LESSON_KEYS = COURSES.flatMap((c) => c.lessons.map((l) => l.key));
