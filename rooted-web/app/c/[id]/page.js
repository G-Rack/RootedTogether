import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import { communityImageUrl } from '@/lib/storage';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/config';

// The public page for one in-app community, at rootedtogether.club/c/<id>. This is the link a
// creator puts on an Instagram post or in their bio: anyone can open it, see what the community
// is, and find out how to join in the Rooted Together app. Only the safe public fields come back
// from the database (public_community), never member names or posts.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getCommunity(id) {
  if (!UUID.test(id)) return null;
  const { data } = await supabaseServer.rpc('public_community', { p_id: id });
  return Array.isArray(data) && data.length ? data[0] : null;
}

function blurb(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : max).trim()}…`;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const c = await getCommunity(id);
  if (!c) return { title: 'Community | Rooted Together' };
  const title = `${c.name} | Rooted Together community`;
  const description = blurb(c.description, 155) || `Join ${c.name}, a community on Rooted Together.`;
  const image = communityImageUrl(c.image_path);
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function CommunityPublicPage({ params }) {
  const { id } = await params;
  const c = await getCommunity(id);
  if (!c) notFound();

  const image = communityImageUrl(c.image_path);
  const members = Number(c.member_count) || 0;
  const hasStores = !!(APP_STORE_URL || PLAY_STORE_URL);

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '28px 16px 56px' }}>
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ aspectRatio: '16 / 7', background: 'linear-gradient(135deg, #6B4226, #8C6A4A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>
            <span aria-hidden="true">{c.icon || '🌱'}</span>
          </div>
        )}
        <div style={{ padding: '24px 22px 28px' }}>
          <div className="muted" style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>Community on Rooted Together</div>
          <h1 className="serif" style={{ margin: '6px 0 6px', fontSize: 'clamp(26px, 5vw, 34px)', color: 'var(--brown)', lineHeight: 1.15 }}>{c.name}</h1>
          <div className="muted" style={{ fontSize: 14.5, marginBottom: 16 }}>
            {c.creator_name ? <>Led by {c.creator_handle ? <Link href={`/creator/${c.creator_handle}`}>{c.creator_name}</Link> : c.creator_name} · </> : null}
            {members} {members === 1 ? 'member' : 'members'}
          </div>
          {c.description ? <p style={{ lineHeight: 1.7, fontSize: 16, margin: '0 0 22px', whiteSpace: 'pre-line' }}>{c.description}</p> : null}

          <h2 className="serif" style={{ fontSize: 19, color: 'var(--brown)', margin: '0 0 8px' }}>How to join</h2>
          <ol style={{ margin: '0 0 18px', paddingLeft: 20, lineHeight: 1.8, fontSize: 15.5 }}>
            <li>Get the free Rooted Together app and create your account.</li>
            <li>Tap the leaf icon at the top of Explore to browse communities.</li>
            <li>Find <strong>{c.name}</strong> and tap Join.</li>
          </ol>

          {hasStores ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {APP_STORE_URL ? <a className="btn btn-primary" href={APP_STORE_URL} style={{ minHeight: 48 }}>Get it on the App Store</a> : null}
              {PLAY_STORE_URL ? <a className="btn btn-primary" href={PLAY_STORE_URL} style={{ minHeight: 48 }}>Get it on Google Play</a> : null}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, lineHeight: 1.6, fontSize: 14.5 }}>
              The app is coming soon to the App Store and Google Play. Come back to this page when it is live.
            </p>
          )}
          {c.creator_handle ? (
            <p style={{ margin: '20px 0 0', fontSize: 14.5 }}>
              <Link href={`/creator/${c.creator_handle}`}>See {c.creator_name ? `${c.creator_name}’s` : 'their'} shop →</Link>
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
