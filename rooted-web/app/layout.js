import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SITE_URL = 'https://rooted-together-website1.vercel.app';
const SITE_TITLE = 'Rooted Together — Marketplace';
const SITE_DESCRIPTION =
  'Courses, ebooks, routines, and 1:1 calls from Rooted Together Mothers, Pastors, and Spiritual Leaders.';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s',
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: 'Rooted Together',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <Header />
          {children}
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
