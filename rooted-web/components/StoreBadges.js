import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/config';

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
        <span style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.82 }}>{small}</span>
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3, marginTop: 3 }}>{big}</span>
      </span>
      {!live && <span className="store-badge-tag">Soon</span>}
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

// iPhone: cream tile with a phone receiving a download arrow.
const iosIcon = (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="38" height="38" rx="11" fill="#FBF6EF" />
    <rect x="12.5" y="7.5" width="15" height="25" rx="3.6" stroke="#6B4226" strokeWidth="2" />
    <path d="M17.5 10.5h5" stroke="#6B4226" strokeWidth="2" strokeLinecap="round" />
    <path d="M20 15.5v8M16.6 20.4l3.4 3.4 3.4-3.4" stroke="#6B4226" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Android: gold tile with a play triangle.
const androidIcon = (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="38" height="38" rx="11" fill="#C8923F" />
    <path d="M15 11.5v17c0 .9 1 1.4 1.7.9l13-8.5c.6-.4.6-1.3 0-1.8l-13-8.5c-.7-.5-1.7 0-1.7.9z" fill="#1B100A" />
    <path d="M15.4 11.9l10.4 8.1" stroke="#C8923F" strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
  </svg>
);

export default function StoreBadges({ align = 'flex-start', showNote = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: align }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: align }}>
        <Badge href={APP_STORE_URL} small="Download on the" big="App Store" icon={iosIcon} />
        <Badge href={PLAY_STORE_URL} small="Get it on" big="Google Play" icon={androidIcon} />
      </div>
      {showNote && <div style={{ fontSize: 12.5, opacity: 0.8 }}>Free to download. iPhone and Android.</div>}
    </div>
  );
}
