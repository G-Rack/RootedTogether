// Small line icons for the course guide, drawn to match the app's icon style.
const PATHS = {
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  sunrise: <><path d="M4 18h16M7 18a5 5 0 0 1 10 0" /><path d="M12 5v3M5.6 9.6l1.4 1.4M18.4 9.6 17 11" /></>,
  ear: <><path d="M8 9a4 4 0 1 1 8 0c0 3-3 3.5-3 6a2.5 2.5 0 0 1-5 0" /><path d="M10.5 10a1.5 1.5 0 0 1 3 0" /></>,
  leaf: <><path d="M5 19c0-8 6-13 14-13 0 8-5 14-13 14" /><path d="M5 19 12 12" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.2a4.5 4.5 0 0 1 4.5 4.8" /></>,
  user: <><circle cx="12" cy="8" r="3.4" /><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14" rx="2.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>,
  compass: <><circle cx="12" cy="12" r="8" /><path d="m15 9-1.8 4.2L9 15l1.8-4.2z" /></>,
  hand: <><path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11M11 10V5a1.5 1.5 0 0 1 3 0v6M14 10.5V7a1.5 1.5 0 0 1 3 0v6.5a6 6 0 0 1-6 6h-.5a5.5 5.5 0 0 1-4.6-2.5L4 13.8a1.4 1.4 0 0 1 2.3-1.6L8 14" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4.2l2.8 1.8" /></>,
  play: <><circle cx="12" cy="12" r="8" /><path d="m10.5 9 4.5 3-4.5 3z" /></>,
  book: <><path d="M12 7c-1.8-1.3-4.3-1.8-7-1.5v12c2.7-.3 5.2.2 7 1.5 1.8-1.3 4.3-1.8 7-1.5v-12c-2.7-.3-5.2.2-7 1.5z" /><path d="M12 7v12" /></>,
  chat: <path d="M5 17.5V7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.5z" />,
  sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4" /></>,
  list: <><path d="M9 7h10M9 12h10M9 17h10" /><circle cx="5" cy="7" r=".8" /><circle cx="5" cy="12" r=".8" /><circle cx="5" cy="17" r=".8" /></>,
  eye: <><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" /><circle cx="12" cy="12" r="2.5" /></>,
  seed: <><path d="M12 20v-7" /><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6zM12 15c0-3-2.5-5-6-5 0 3 2.5 5 6 5z" /></>,
  star: <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />,
  headphones: <><path d="M4.5 15v-3a7.5 7.5 0 0 1 15 0v3" /><rect x="4" y="14" width="4" height="6" rx="1.5" /><rect x="16" y="14" width="4" height="6" rx="1.5" /></>,
  gift: <><rect x="4" y="9" width="16" height="11" rx="2" /><path d="M4 13h16M12 9v11M12 9c-1.5-3-5-3.5-5-1.5S10 9 12 9zm0 0c1.5-3 5-3.5 5-1.5S14 9 12 9z" /></>,
  tag: <><path d="M4 12.5V5.5A1.5 1.5 0 0 1 5.5 4h7l7.5 7.5-8.5 8.5z" /><circle cx="8.5" cy="8.5" r="1.3" /></>,
  back: <path d="m15 5-7 7 7 7" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
};

export default function AdvisorIcon({ name, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name] || PATHS.star}
    </svg>
  );
}
