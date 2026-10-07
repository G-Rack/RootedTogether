import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/config';

// Original store-style download buttons (not the official Apple / Google
// badge artwork). Before launch, swap in the official badges from Apple's
// and Google's marketing-resources pages if you want the exact marks.
function Badge({ href, small, big, icon }) {
  const live = !!href;
  const inner = (
    <>
      <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
        <span style={{ fontSize: 10.5, letterSpacing: 0.3, opacity: 0.85 }}>{live ? small : 'Coming soon on'}</span>
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.2, marginTop: 2 }}>{big}</span>
      </span>
    </>
  );
  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 20px 10px 16px',
    minHeight: 54,
    borderRadius: 14,
    background: '#1B100A',
    color: '#FBF6EF',
    border: '1px solid rgba(251,246,239,0.28)',
    textDecoration: 'none',
    opacity: live ? 1 : 0.92,
    cursor: live ? 'pointer' : 'default',
  };
  return live ? (
    <a href={href} target="_blank" rel="noreferrer" style={style} aria-label={`${small} ${big}`}>
      {inner}
    </a>
  ) : (
    <span style={style} aria-label={`${big}, coming soon`}>
      {inner}
    </span>
  );
}

const iosIcon = (
  <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="28" height="28" rx="8" fill="#FBF6EF" />
    <path d="M16 8.5v10M11.5 14.5l4.5 4.5 4.5-4.5M9.5 23h13" stroke="#6B4226" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const androidIcon = (
  <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="28" height="28" rx="8" fill="#C8923F" />
    <path d="M12 9.5v13l11-6.5z" fill="#1B100A" />
  </svg>
);

export default function StoreBadges({ align = 'flex-start' }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: align }}>
      <Badge href={APP_STORE_URL} small="Download on the" big="App Store" icon={iosIcon} />
      <Badge href={PLAY_STORE_URL} small="Get it on" big="Google Play" icon={androidIcon} />
    </div>
  );
}
