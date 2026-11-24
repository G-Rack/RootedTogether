import { SITE_URL } from '@/lib/seo';

// rootedtogether.club/robots.txt: public pages are open to search engines; account and admin pages are not.
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard', '/login', '/complete-profile', '/finish-account', '/my-profile', '/delete-account', '/reset-password', '/insights', '/thanks', '/unsubscribe'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
