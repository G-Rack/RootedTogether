export const metadata = {
  title: 'Privacy Policy — Rooted Together',
  description:
    'How Rooted Together collects, uses, and protects your information across the Rooted Together app and marketplace.',
};

const CONTACT_EMAIL = 'admin@rootedtogether.club';
const EFFECTIVE_DATE = 'October 16, 2026';

const sections = [
  {
    title: 'Who we are',
    body: [
      'Rooted Together is a faith-based mentorship community. It includes the Rooted Together mobile app and the Rooted Together marketplace at rootedtogether.club, where creators, mothers, pastors, and spiritual leaders share courses, ebooks, routines, and one-to-one calls. This policy explains what information we collect, why we collect it, and the choices you have.',
    ],
  },
  {
    title: 'Information we collect',
    body: [
      'Account information: your name, email address, password (stored securely by our authentication provider, never in plain text), the role you choose (for example seeker, creator, or church), and your date of birth where we ask for it.',
      'Profile information: your profile photo, banner image, bio, social links, and any details you choose to add to your public profile or creator storefront. Creators may also upload certifications or other documents.',
      'Content you create: posts, comments, community posts and images, direct and group messages, and, if you use the family features, private notes, practices, and updates.',
      'Activity: who you follow, what you like, and the communities and spiritual families you join.',
      'Purchases and payouts: when you buy an offering or a creator receives earnings, payments are handled by Stripe. We receive order details such as what was bought, the amount, and status. We do not see or store your full card number. Creators who receive payouts complete identity and bank verification directly with Stripe.',
      'App subscriptions: if you subscribe to Rooted Together Premium in the mobile app, the purchase is made and billed through Google Play (or the Apple App Store on iPhone). Google or Apple handles your payment details and we never see your card number. We use a subscription management service, RevenueCat, which receives an account identifier, your subscription status, and your purchase and renewal history from the app store so we can unlock Premium features for you and keep your access up to date.',
      'Referral information: if you take part in our referral program, we record who referred whom and the resulting commissions.',
      'Support messages: anything you send us when you contact us.',
    ],
  },
  {
    title: 'How we use your information',
    body: [
      'To create and run your account, show your profile to the people you choose, and deliver the features you use, including messages, communities, and purchases.',
      'To process payments, subscriptions, and payouts, prevent fraud and misuse, and keep the community safe.',
      'To send essential messages such as email confirmation, password resets, receipts, and important changes to the service.',
      'To understand and improve how the app and marketplace work.',
      'To meet our legal obligations.',
    ],
  },
  {
    title: 'What is public and what is private',
    body: [
      'Your profile, storefront, offerings, and community posts may be visible to other members or to anyone who visits the marketplace, depending on the settings of that feature. Direct and group messages are visible to the people in that conversation. Private notes in the family features are intended for you and the people you invite. Please think carefully before sharing sensitive personal details in any public space.',
    ],
  },
  {
    title: 'Who we share information with',
    body: [
      'We do not sell your personal information.',
      'We use trusted service providers who process information on our behalf: Supabase (accounts, database, and file storage), Stripe (payments and creator payouts on our website), Google Play and the Apple App Store (app subscriptions), RevenueCat (subscription management), Vercel (hosting of our website), and email delivery providers. They may only use your information to provide their services to us.',
      'We may disclose information if required by law, to protect the rights and safety of our members, or as part of a business transfer such as a merger. If that happens, we will tell you before your information becomes subject to a different policy.',
    ],
  },
  {
    title: 'How long we keep information',
    body: [
      'We keep your information for as long as your account is active. If you ask us to delete your account, we will delete or anonymize your personal information, except where we must keep certain records, for example payment and tax records, or to resolve disputes and enforce our terms.',
    ],
  },
  {
    title: 'Your choices and rights',
    body: [
      'You can view and edit your profile in the app or on the website at any time.',
      'You can manage or cancel an app subscription at any time in your Google Play or App Store subscription settings. Deleting your account does not cancel a subscription automatically, so please cancel it in the store as well.',
      `You can ask us to access, correct, export, or delete your information, or to delete your account, by emailing ${CONTACT_EMAIL} from the email address on your account. We will respond within a reasonable time, and within any period required by law.`,
      'You can choose what you share publicly and unfollow or leave communities at any time.',
      'Depending on where you live, you may have additional rights under local law, such as the right to object to or restrict certain processing. Contact us to exercise them.',
    ],
  },
  {
    title: 'Security',
    body: [
      'We use reasonable technical and organizational measures to protect your information, including encrypted connections and access controls. No system is completely secure, so we cannot guarantee absolute security. Please use a strong, unique password and tell us right away if you suspect unauthorized access to your account.',
    ],
  },
  {
    title: 'Children',
    body: [
      'Rooted Together is not directed to children under 13, and we do not knowingly collect personal information from them. If you believe a child has given us personal information, contact us and we will delete it.',
    ],
  },
  {
    title: 'International use',
    body: [
      'Our service providers may process information in countries other than your own. When we transfer information, we rely on appropriate safeguards offered by those providers.',
    ],
  },
  {
    title: 'Changes to this policy',
    body: [
      'We may update this policy from time to time. When we make material changes we will update the date at the top of this page and, where appropriate, notify you in the app or by email.',
    ],
  },
  {
    title: 'Contact us',
    body: [`Questions about this policy or your information? Email us at ${CONTACT_EMAIL}.`],
  },
];

export default function PrivacyPage() {
  return (
    <main className="container" style={{ paddingBlock: '56px 72px' }}>
      <article style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1 className="serif" style={{ fontSize: 40, lineHeight: 1.15, color: 'var(--brown)', margin: '0 0 8px' }}>
          Privacy Policy
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
