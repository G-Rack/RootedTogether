'use client';

// The "Send me the daily devotional" tickbox. Always starts unticked: nobody is signed up for
// marketing email unless they tick it themselves.
export default function DevotionalOptIn({ checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, lineHeight: 1.4, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 18, height: 18, accentColor: 'var(--brown)', flex: 'none' }}
      />
      <span>Send me the daily devotional</span>
    </label>
  );
}
