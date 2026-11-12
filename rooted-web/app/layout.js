import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GoogleTag from '@/components/GoogleTag';
import Pixels from '@/components/Pixels';
import ConsentBanner from '@/components/ConsentBanner';

// Same typefaces as the onboarding site, exposed as CSS variables (see globals.css).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-playfair', display: 'swap' });

const SITE_URL = 'https://rootedtogether.club';
const SITE_TITLE = 'Rooted Together — Marketplace';
const SITE_DESCRIPTION =
  'Courses, ebooks, printables, audiobooks, templates, routines, and 1:1 calls from Rooted Together Mothers, Pastors, and Spiritual Leaders.';

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

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FFFFFF',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <GoogleTag />
        <Pixels />
        <SessionProvider>
          <Header />
          {children}
          <Footer />
        </SessionProvider>
        <ConsentBanner />
      </body>
    </html>
  );
}
