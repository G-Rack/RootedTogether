'use client';

import { useMemo } from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysIn(month, year) {
  if (!month) return 31;
  // Year 2000 is a leap year, so February shows 29 days until a real year is picked.
  return new Date(year ? Number(year) : 2000, Number(month), 0).getDate();
}

// Month / day / year dropdowns instead of the browser's calendar popup: faster for
// birthdays (no scrolling month by month) and it looks the same in every browser.
// `value` and `onChange` use the same 'YYYY-MM-DD' string a date input would.
export default function DateOfBirthField({ value, onChange, required }) {
  const [year = '', month = '', day = ''] = value ? value.split('-') : [];
  const thisYear = new Date().getFullYear();
  const years = useMemo(() => {
    const list = [];
    for (let y = thisYear; y >= thisYear - 110; y -= 1) list.push(y);
    return list;
  }, [thisYear]);

  const pad = (n) => String(n).padStart(2, '0');

  // Keep the parts the person has picked even before all three are set, by
  // storing them in the same string with empty segments ("1990--").
  const emit = (y, m, d) => {
    if (!y && !m && !d) return onChange('');
    const maxDay = daysIn(m, y);
    const safeDay = d && Number(d) > maxDay ? String(maxDay) : d;
    onChange(`${y}-${m}-${safeDay}`);
  };

  const complete = year && month && day;
  const dayCount = daysIn(month, year);

  return (
    <div className="dob-field" role="group" aria-label="Date of birth">
      <select
        className="select-field"
        aria-label="Month"
        required={required}
        value={month}
        onChange={(e) => emit(year, e.target.value ? pad(e.target.value) : '', day)}
      >
        <option value="">Month</option>
        {MONTHS.map((name, i) => (
          <option key={name} value={pad(i + 1)}>{name}</option>
        ))}
      </select>
      <select
        className="select-field"
        aria-label="Day"
        required={required}
        value={day}
        onChange={(e) => emit(year, month, e.target.value ? pad(e.target.value) : '')}
      >
        <option value="">Day</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={pad(d)} disabled={d > dayCount}>{d}</option>
        ))}
      </select>
      <select
        className="select-field"
        aria-label="Year"
        required={required}
        value={year}
        onChange={(e) => emit(e.target.value, month, day)}
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>
      {/* Lets the form's own validation see one value: empty until all three parts are chosen. */}
      <input
        tabIndex={-1}
        aria-hidden="true"
        required={required}
        value={complete ? value : ''}
        onChange={() => {}}
        style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}
