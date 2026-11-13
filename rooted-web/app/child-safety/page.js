// Child safety standards, at rootedtogether.club/child-safety. Google Play requires social apps to
// publish these (Play Console > App content > Child safety standards).

export const metadata = {
  title: 'Child Safety Standards | Rooted Together',
  description:
    'How Rooted Together prevents child sexual abuse and exploitation (CSAE), how to report a concern, and what we do about it.',
};

const CONTACT_EMAIL = 'admin@rootedtogether.club';
const EFFECTIVE_DATE = 'November 13, 2026';

const sections = [
  {
    title: 'Our commitment',
    body: [
      'Rooted Together is a faith-based community for adults. You must be at least 18 years old to create an account. We have zero tolerance for child sexual abuse and exploitation (CSAE), including child sexual abuse material (CSAM), on the Rooted Together app and website.',
    ],
  },
  {
    title: 'What is not allowed',
    body: [
      'Anything that sexualises, exploits, endangers or abuses a child. This includes sexual or exploitative images, video, text or messages involving a minor, grooming, enticing or sextortion of a minor, trafficking, and any attempt to share, request, trade or link to this material. Accounts and content that break this rule are removed, and the people behind them are banned.',
    ],
  },
  {
    title: 'How to report a concern',
    body: [
      'In the app, you can report any post, comment, message or profile from its menu, and you can block any user. Reports go straight to us.',
      `You can also email us at ${CONTACT_EMAIL} with a description and, if you can, a link to the content. If a child is in immediate danger, contact your local emergency services first.`,
    ],
  },
  {
    title: 'What we do when we receive a report',
    body: [
      'We review reports, remove content that breaks these standards, and suspend or permanently ban the accounts involved. We keep the records the law requires us to keep.',
      'We report apparent child sexual abuse material to the relevant authorities, including the National Center for Missing & Exploited Children (NCMEC) in the United States and the appropriate regional or national authorities elsewhere, and we cooperate with law enforcement.',
    ],
  },
  {
    title: 'Following the law',
    body: [
      'Rooted Together complies with the child safety laws that apply to our service, and we review these standards from time to time as the rules change.',
    ],
  },
  {
    title: 'Contact',
    body: [`Our designated point of contact for child safety is ${CONTACT_EMAIL}. Questions about these standards are welcome there.`],
  },
];

export default function ChildSafetyPage() {
  return (
    <main className="container" style={{ paddingBlock: '56px 72px' }}>
      <article style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1 className="serif" style={{ fontSize: 40, lineHeight: 1.15, color: 'var(--brown)', margin: '0 0 8px' }}>
          Child Safety Standards
        </h1>
        <p className="muted" style={{ fontSize: 14, margin: '0 0 32px' }}>
          Effective {EFFECTIVE_DATE}
        </p>
        {sections.map((s) => (
          <section key={s.title} style={{ marginBottom: 28 }}>
            <h2 className="serif" style={{ fontSize: 22, color: 'var(--brown)', margin: '0 0 10px' }}>
              {s.title}
            </h2>
            {s.body.map((p, i) => (
              <p key={i} style={{ fontSize: 15.5, lineHeight: 1.7, margin: '0 0 12px' }}>
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
