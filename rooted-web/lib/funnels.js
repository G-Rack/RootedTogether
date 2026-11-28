// The two free-sample pages that ads send people to:
//   /lesson-1  Lesson 1 of "Hearing God in the Quiet" (watch it on the page)
//   /night-1   Night 1 of "The Night Prayer Routine" (read it and listen on the page)
// Each asks for an email, then shows the sample and, right below it, the paid offer. The email also
// starts an email series (see the send-email-sequences function) that stops on its own when the person buys.
// Everything said about the paid products here is taken from the offerings themselves (their description,
// their lesson list and the PDF), nothing is invented.

export const FUNNELS = {
  'lesson-1': {
    slug: 'lesson-1',
    offeringId: '1be447fd-d6aa-49bb-a6b0-ecc057bf2180',
    leadSource: 'lesson_1_page',
    eyebrow: 'FREE LESSON 1',
    headline: 'Too busy to pray? Watch Lesson 1 free.',
    caption: 'Hearing God in the Quiet · about 3 minutes',
    label: 'Your email',
    button: 'Watch Lesson 1 free',
    notice: 'Free, no payment needed. We will email you the lesson and a short series about the course, then our free daily devotional. Unsubscribe any time.',
    disclosure: 'A Rooted Together team course. Presenter is AI-generated.',
    offerEyebrow: 'THE FULL COURSE',
    offerLine: 'Lessons 2 to 7 take you from making space to living from the quiet, each with one simple practice to take into your day.',
    items: [
      '7 short video lessons (Lesson 1 is yours free)',
      'About 20 minutes in total',
      'One simple practice to take away from every lesson',
      'Lifetime access, yours to keep',
      'Works on your phone',
    ],
    buyLabel: (price) => `Get the full course – ${price}`,
    sentLine: 'We have also emailed you a link to Lesson 1, so you can come back to it any time. If you do not see it, check your spam folder.',
  },
  'night-1': {
    slug: 'night-1',
    offeringId: 'ac33a855-9989-425e-9f6f-a219c7122fd7',
    leadSource: 'night_1_page',
    eyebrow: 'FREE NIGHT 1',
    headline: 'End your day in peace. Try Night 1 free.',
    caption: 'The Night Prayer Routine · about 10 minutes',
    label: 'Your email',
    button: 'Send me Night 1 free',
    notice: 'Free, no payment needed. We will email you Night 1 and a short series about the routine, then our free daily devotional. Unsubscribe any time.',
    disclosure: 'The narration of Night 1 is AI-generated.',
    offerEyebrow: 'THE FULL ROUTINE',
    offerLine: 'Six more nights, each with one short verse, a written prayer, one line to write and a simple checklist.',
    items: [
      '7 nights, about 10 minutes each',
      'A weekly tracker and a closing reflection',
      'Phone-friendly pages with tappable checkboxes, or print and use a pen',
      'Lifetime access, yours to keep',
    ],
    buyLabel: (price) => `Get all 7 nights – ${price}`,
    sentLine: 'We have also emailed Night 1 to you, so you have it by your bed tonight. If you do not see it, check your spam folder.',
  },
};

// Night 1 of The Night Prayer Routine (the first night of the PDF; verses are King James Version, public domain).
// The same text is used in the first email (send-email-sequences function).
export const NIGHT_1 = {
  title: 'Lay it down',
  subtitle: 'Release the day',
  verse: 'I will both lay me down in peace, and sleep: for thou, LORD, only makest me dwell in safety.',
  verseRef: 'Psalm 4:8 (KJV)',
  reflect: 'Whatever happened today is finished. You cannot fix it tonight, and you were never meant to carry it into your sleep. Hand it over, one thing at a time.',
  prayer: 'Father, the day is done and I am tired. I lay down what I carried: the unfinished work, the words I wish I had said, the worries I cannot fix. You care for me, so I trust them to You. Quiet my mind and let me sleep in peace. Amen.',
  write: 'What is one thing I am handing over tonight?',
  checklist: [
    'Phone down, lights low',
    'Read tonight’s verse twice',
    'Say the prayer out loud',
    'Write one line',
    'Name one worry out loud and hand it over',
  ],
  audioUrl: '/audio/night-1.mp3',
};
