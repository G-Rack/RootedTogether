import { APP_STORE_URL, PLAY_STORE_URL, USE_OFFICIAL_BADGES } from '@/lib/config';

// Original store-style download buttons (not the official Apple / Google
// badge artwork). Before launch, swap in the official badges from Apple's
// and Google's marketing-resources pages if you want the exact marks.
// Styles live in globals.css under ".store-badge".
function Badge({ href, small, big, icon }) {
  const live = !!href;
  const inner = (
    <>
      {icon}
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
        <span style={{ fontSize: 11.5, letterSpacing: 0.2 }}>{small}</span>
        <span style={{ fontSize: 25, fontWeight: 600, letterSpacing: -0.5, marginTop: 1 }}>{big}</span>
      </span>
    </>
  );
  return live ? (
    <a href={href} target="_blank" rel="noreferrer" className="store-badge" aria-label={`${small} ${big}`}>
      {inner}
    </a>
  ) : (
    <span className="store-badge store-badge-soon" aria-label={`${big}, coming soon`}>
      {inner}
    </span>
  );
}

// Plain white glyphs (no tile), like the official badge layout.
const iosIcon = (
  <svg width="30" height="34" viewBox="0 0 30 34" fill="none" aria-hidden="true">
    <rect x="5" y="2" width="20" height="30" rx="4.5" stroke="#fff" strokeWidth="2.4" />
    <path d="M12 6h6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M15 12v10M10.8 18l4.2 4.2 4.2-4.2" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const androidIcon = (
  <svg width="30" height="34" viewBox="0 0 30 34" fill="none" aria-hidden="true">
    <path d="M5 3.8v26.4c0 1.4 1.5 2.2 2.7 1.5l20-13.2c1-.7 1-2.2 0-2.9L7.7 2.3C6.5 1.6 5 2.4 5 3.8z" fill="#fff" />
  </svg>
);

// Official badge artwork, used when USE_OFFICIAL_BADGES is true. Download the
// files from Apple's and Google's badge pages and save them as
// public/badges/app-store.svg and public/badges/google-play.png.
function OfficialBadge({ href, src, alt, height, trim = 0 }) {
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={src} alt={alt} style={{ height, display: 'block', margin: trim }} />;
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" aria-label={alt} style={{ display: 'inline-flex' }}>
      {img}
    </a>
  ) : (
    <span style={{ display: 'inline-flex', opacity: 0.9 }} title="Coming soon">
      {img}
    </span>
  );
}

export default function StoreBadges({ align = 'flex-start', showNote = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: align }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: align }}>
        {USE_OFFICIAL_BADGES ? (
          <>
            <OfficialBadge href={APP_STORE_URL} src="/badges/app-store.svg" alt="Download on the App Store" height={54} />
            <OfficialBadge href={PLAY_STORE_URL} src="/badges/google-play.png" alt="Get it on Google Play" height={80} trim="-13px" />
          </>
        ) : (
          <>
            <Badge href={APP_STORE_URL} small="Download on the" big="App Store" icon={iosIcon} />
            <Badge href={PLAY_STORE_URL} small="Get it on" big="Google Play" icon={androidIcon} />
          </>
        )}
      </div>
      {showNote && <div style={{ fontSize: 12.5, opacity: 0.85 }}>{APP_STORE_URL || PLAY_STORE_URL ? 'Free to download. iPhone and Android.' : 'Coming soon. Free to download on iPhone and Android.'}</div>}
    </div>
  );
}
