// "Rooted Together Originals": courses made by the Rooted Together team.
// The database sets offering.is_original from the creator's team-account flag, so creators can't add it themselves.
export default function OriginalsTag({ small = false }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: small ? '2px 8px' : '3px 10px',
        borderRadius: 999,
        background: '#2E1B10',
        color: '#E8C48A',
        fontSize: small ? 10.5 : 11.5,
        fontWeight: 700,
        letterSpacing: 0.3,
        whiteSpace: 'nowrap',
      }}
    >
      Rooted Together Originals
    </span>
  );
}
