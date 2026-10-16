export const metadata = {
  title: 'Delete Your Account — Rooted Together',
  description:
    'How to delete your Rooted Together account and associated data, and what happens to your information when you do.',
};

const CONTACT_EMAIL = 'admin@rootedtogether.club';

const sections = [
  {
    title: 'Delete your account in the app',
    body: [
      'This is the fastest way. Open the Rooted Together app, go to the Profile tab, tap the settings (gear) icon, then tap Delete Account and confirm. Your account is deleted straight away and you are signed out.',
    ],
  },
  {
    title: 'Can’t use the app? Request deletion by email',
    body: [
      `Email ${CONTACT_EMAIL} from the email address on your account with the subject “Delete my account”. We will confirm the request and delete your account, normally within 30 days.`,
      'If you do not have access to that email address, tell us the name and role on the account and we will verify ownership with you before deleting anything.',
    ],
  },
  {
    title: 'What is deleted',
    body: [
      'Your sign-in details, your profile (name, bio, photos, links), and the content you created, such as posts, comments, community posts, and messages, are deleted or anonymized so they no longer identify you. Your follows, likes, and community and family memberships are removed.',
    ],
  },
  {
    title: 'What we may keep',
    body: [
      'Where the law requires it, or to resolve disputes and prevent fraud, we keep limited records, such as payment, order, and payout records handled through Stripe. We keep these only for as long as required, and they are not used for anything else.',
      'Messages you sent may remain visible to the people you sent them to in an anonymized form. Reports you have made or that were made about you may be kept for community safety.',
    ],
  },
  {
    title: 'If you have a Premium subscription',
    body: [
      'Deleting your account does not automatically cancel a subscription that was bought through Google Play or the Apple App Store. Please cancel it in your Google Play or App Store subscription settings so you are not charged again.',
    ],
  },
  {
    title: 'More information',
    body: [
      `You can read how we handle information in our Privacy Policy at rootedtogether.club/privacy. Questions? Email ${CONTACT_EMAIL}.`,
    ],
  },
];

export default function DeleteAccountPage() {
  return (
    <main className="container" style={{ paddingBlock: '56px 72px' }}>
      <article style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1 className="serif" style={{ fontSize: 40, lineHeight: 1.15, color: 'var(--brown)', margin: '0 0 8px' }}>
          Delete Your Account
        </h1>
        <p className="muted" style={{ fontSize: 14, margin: '0 0 32px' }}>
          Rooted Together
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
