'use client';

// Generic field renderer shared by the "Complete your profile" page. Handles
// the field `type`s used in lib/roleProfileFields.js: text, textarea, select,
// checkboxes (saved as a text[] column), and tags (free-typed comma list,
// also saved as a text[] column via splitTags()).
export default function ProfileField({ field, value, onChange }) {
  const { type, label, helper, placeholder, options } = field;
  return (
    <div>
      <label className="field-label">{label}</label>
      {type === 'text' && (
        <input className="input-field" placeholder={placeholder} value={value || ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {type === 'textarea' && (
        <textarea className="input-field" rows={3} placeholder={placeholder} value={value || ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {type === 'tags' && (
        <input className="input-field" placeholder={placeholder} value={value || ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {type === 'select' && (
        <select className="input-field" value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )}
      {type === 'checkboxes' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {options.map((o) => {
            const arr = Array.isArray(value) ? value : [];
            const checked = arr.includes(o);
            return (
              <label
                key={o}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12.5,
                  background: checked ? 'var(--cream-dark)' : 'transparent',
                  border: '1px solid rgba(107,66,38,0.18)',
                  borderRadius: 999,
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(checked ? arr.filter((x) => x !== o) : [...arr, o])}
                  style={{ margin: 0 }}
                />
                {o}
              </label>
            );
          })}
        </div>
      )}
      {helper && <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>{helper}</div>}
    </div>
  );
}
