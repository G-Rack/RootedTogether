import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import { SITE_URL, clip, jsonLdString } from '@/lib/seo';

// rootedtogether.club/devotional/YYYY-MM-DD: the daily devotional as a public web page, for search engines
// and for sharing. Only devotionals that are approved (or already emailed) and whose day has come are shown.
export const revalidate = 3600;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function getDevotional(date) {
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return null;
  const { data } = await supabaseServer.rpc('get_public_devotional', { p_date: date });
  return (Array.isArray(data) ? data[0] : data) || null;
}

const longDate = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
  timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});
const shortDate = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
  timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric',
});

export async function generateMetadata({ params }) {
  const { date } = await params;
  const d = await getDevotional(date);
  if (!d) return { title: 'Daily devotional | Rooted Together', robots: { index: false, follow: false } };
  const withBrand = `${d.subject} | Daily devotional, ${shortDate(date)} | Rooted Together`;
  const title = withBrand.length <= 72 ? withBrand : clip(`${d.subject} | Daily devotional | Rooted Together`, 72);
  const firstParagraph = String(d.reflection || '').split(/\n\s*\n/)[0];
  const description = clip(d.preview || firstParagraph || d.verse_text, 158);
  return {
    title,
    description,
    alternates: { canonical: `/devotional/${date}` },
    openGraph: { title, description, type: 'article', url: `/devotional/${date}`, publishedTime: `${date}T00:00:00Z` },
    twitter: { card: 'summary', title, description },
  };
}

const para = { fontSize: 17, lineHeight: 1.75, margin: '0 0 16px', color: 'var(--text, #2E1B10)' };

export default async function DevotionalPage({ params }) {
  const { date } = await params;
  const d = await getDevotional(date);
  if (!d) notFound();

  // Neighbouring days, for the "Yesterday / Tomorrow" links.
  const { data: all } = await supabaseServer.rpc('list_public_devotionals', { p_limit: 400 });
  const days = (all || []).map((r) => r.devotional_date).sort();
  const at = days.indexOf(date);
  const prev = at > 0 ? days[at - 1] : null;
  const next = at >= 0 && at < days.length - 1 ? days[at + 1] : null;

  const paragraphs = String(d.reflection || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const quizHref = `/advisor?utm_source=devotional&utm_medium=web&utm_campaign=${date}`;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: d.subject,
    description: clip(d.preview || paragraphs[0] || '', 200),
    datePublished: `${date}T00:00:00Z`,
    inLanguage: 'en',
    mainEntityOfPage: `${SITE_URL}/devotional/${date}`,
    author: { '@type': 'Organization', name: 'Rooted Together', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'Rooted Together', url: SITE_URL },
  };

  return (
    <div style={{ background: 'var(--cream)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }} />
      <article className="container" style={{ maxWidth: 720, paddingBlock: '56px 48px' }}>
        <span className="badge">DAILY DEVOTIONAL</span>
        <p className="muted" style={{ fontSize: 14, margin: '14px 0 6px' }}>{longDate(date)}</p>
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 700, color: 'var(--brown)', lineHeight: 1.18, margin: '0 0 28px' }}>
          {d.subject}
        </h1>

        <blockquote
          className="serif"
          style={{ margin: '0 0 30px', padding: '18px 22px', borderLeft: '4px solid var(--brown-pale)', background: 'var(--cream-dark)', borderRadius: 12 }}
        >
          <p style={{ fontSize: 19, lineHeight: 1.65, margin: '0 0 8px', color: 'var(--brown)' }}>&ldquo;{d.verse_text}&rdquo;</p>
          <footer style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.4, color: 'var(--brown-light)' }}>{d.verse_ref}</footer>
        </blockquote>

        {paragraphs.map((p, i) => <p key={i} style={para}>{p}</p>)}

        {d.prayer && (
          <section style={{ marginTop: 28 }}>
            <h2 className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)', margin: '0 0 10px' }}>A prayer</h2>
            <p style={{ ...para, fontStyle: 'italic' }}>{d.prayer}</p>
          </section>
        )}

        <div className="card" style={{ padding: 24, margin: '40px 0 24px', textAlign: 'center' }}>
          <h2 className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', margin: '0 0 8px' }}>Find your next step with God</h2>
          <p className="muted" style={{ fontSize: 15.5, lineHeight: 1.6, margin: '0 auto 18px', maxWidth: 480 }}>
            Answer six quick questions and we will suggest the course, book or call that fits where you are today. A free gift at the end.
          </p>
          <Link href={quizHref} className="btn btn-primary">Take the 90-second quiz</Link>
        </div>

        <p className="muted" style={{ fontSize: 14.5, textAlign: 'center', margin: '0 0 28px' }}>
          Want this in your inbox each morning?{' '}
          <Link href="/gift?campaign=devotional&utm_source=devotional&utm_medium=web" style={{ textDecoration: 'underline' }}>Get the free daily devotional</Link>
        </p>

        <nav aria-label="More devotionals" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 14.5 }}>
          {prev ? <Link href={`/devotional/${prev}`}>&larr; {shortDate(prev)}</Link> : <span />}
          <Link href="/devotional">All devotionals</Link>
          {next ? <Link href={`/devotional/${next}`}>{shortDate(next)} &rarr;</Link> : <span />}
        </nav>
      </article>
    </div>
  );
}
