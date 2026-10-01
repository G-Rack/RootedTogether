'use client';

// Shared star display + input. `value` can be a fraction (e.g. 4.3) for
// read-only display — it fills stars proportionally. Pass `onChange` to
// turn it into a clickable 1–5 input.
export default function StarRating({ value = 0, size = 15, onChange, color = '#D9A441' }) {
  const stars = [1, 2, 3, 4, 5];
  const interactive = typeof onChange === 'function';

  return (
    <div style={{ display: 'inline-flex', gap: 2 }}>
      {stars.map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)));
        return (
          <span
            key={n}
            onClick={interactive ? () => onChange(n) : undefined}
            style={{ position: 'relative', width: size, height: size, cursor: interactive ? 'pointer' : 'default', lineHeight: 0 }}
          >
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(107,66,38,0.25)" strokeWidth="1.5">
              <path d="M12 2.5l2.9 6.2 6.7.7-5 4.6 1.4 6.6L12 17.3l-5.9 3.3 1.3-6.6-5-4.6 6.7-.7z" />
            </svg>
            {fill > 0 && (
              <span style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: `${fill * 100}%` }}>
                <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5">
                  <path d="M12 2.5l2.9 6.2 6.7.7-5 4.6 1.4 6.6L12 17.3l-5.9 3.3 1.3-6.6-5-4.6 6.7-.7z" />
                </svg>
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
