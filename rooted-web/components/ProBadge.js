// The gold "Rooted Pro" badge shown on Creator Pro storefronts and cards.
export default function ProBadge({ small = false, style }) {
  return (
    <span
      title="Rooted Pro creator"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: small ? '2px 8px 2px 6px' : '4px 11px 4px 8px',
        borderRadius: 999,
        background: '#C8923F',
        color: '#2E1B10',
        fontSize: small ? 10.5 : 12,
        fontWeight: 700,
        letterSpacing: 0.2,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
        ...style,
      }}
    >
      <svg width={small ? 11 : 13} height={small ? 11 : 13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />
      </svg>
      Rooted Pro
    </span>
  );
}
