import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';

// rootedtogether.club/devotional: the list of public daily devotionals, newest first.
export const revalidate = 3600;

export const metadata = {
  title: 'Daily devotionals | Rooted Together',
  description: 'A verse, a short reflection and a prayer for every morning, free from Rooted Together.',
  alternates: { canonical: '/devotional' },
};

const label = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
  timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

export default async function DevotionalIndexPage() {
  const { data } = await supabaseServer.rpc('list_public_devotionals', { p_limit: 400 });
  const rows = data || [];
  return (
    <div style={{ background: 'var(--cream)' }}>
      <div className="container" style={{ maxWidth: 720, paddingBlock: '56px 72px' }}>
        <span className="badge">DAILY DEVOTIONALS</span>
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 700, color: 'var(--brown)', lineHeight: 1.18, margin: '14px 0 10px' }}>
          A word for every morning
        </h1>
        <p className="muted" style={{ fontSize: 16.5, lineHeight: 1.65, margin: '0 0 28px' }}>
          A verse, a short reflection and a prayer. Free by email each morning.{' '}
          <Link href="/gift?campaign=devotional&utm_source=devotional&utm_medium=web" style={{ textDecoration: 'underline' }}>Get it in your inbox</Link>.
        </p>
        {rows.length === 0 ? (
          <p className="muted">The first devotionals are coming soon.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
            {rows.map((r) => (
              <li key={r.devotional_date}>
                <Link href={`/devotional/${r.devotional_date}`} className="card" style={{ display: 'block', padding: '16px 18px' }}>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>{label(r.devotional_date)}</div>
                  <div className="serif" style={{ fontSize: 19, fontWeight: 700, color: 'var(--brown)', marginBottom: 4 }}>{r.subject}</div>
                  {r.preview && <div className="muted" style={{ fontSize: 14.5, lineHeight: 1.5 }}>{r.preview}</div>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
