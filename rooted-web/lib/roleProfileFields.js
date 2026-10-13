// Field definitions for the "Complete your profile" page — everything that
// used to live directly in the signup form before signup was simplified back
// down to a role picker + a few common fields. These are keyed by the SAME
// role spelling `profiles.role` and the role tables use (seeker / assistant /
// mother / pastor / influencer) — NOT the submit-signup Edge Function's flow
// key, which spells Priest/Pastor "priest" (see app/login/page.js for that
// translation). Each field's `column` is the exact column name on the
// matching table in ROLE_TABLES, confirmed against the live schema.

export const ROLE_TABLES = {
  seeker: 'seekers',
  assistant: 'assistants',
  mother: 'mothers',
  pastor: 'pastors',
  influencer: 'influencers',
  church: 'churches',
};

export const EXPERIENCE_OPTIONS = ['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years'];
export const SPIRITUAL_GIFTS_OPTIONS = [
  'Prayer & intercession', 'Teaching', 'Counseling', 'Worship', 'Healing', 'Discernment', 'Hospitality', 'Administration', 'Other',
];
export const EDUCATION_OPTIONS = [
  'High school', 'Associate degree', "Bachelor's degree", "Master's degree", 'Doctorate / PhD', 'Seminary / ministry training', 'Other',
];

// Mother, Pastor, and Spiritual Leader can optionally document credentials —
// mirrors the app's "Has Relevant Credentials" step. The three fields below
// only get saved when the answer is "Yes, I do".
export const CREDENTIALED_ROLES = new Set(['mother', 'pastor', 'influencer']);

// type: 'text' | 'number' | 'textarea' | 'select' | 'checkboxes' (checkboxes/array columns save as a text[])
// Any field may carry a `section` label; the page shows it as a heading above the first field of that section.
export const ROLE_PROFILE_FIELDS = {
  seeker: [
    { column: 'signing_up_for', label: 'Who is this for?', type: 'select', options: ['Myself', 'My child'] },
    { column: 'child_age', label: "Child's age", type: 'text', showIf: (v) => v.signing_up_for === 'My child' },
    {
      column: 'support_needs',
      label: 'What kind of support are you looking for?',
      type: 'checkboxes',
      options: ['Prayer', 'Meditation & mindfulness', '1:1 mentorship', 'Community & connection', 'Grief & loss support', 'Family & relationships', 'Addiction recovery', 'Other'],
    },
    { column: 'faith_background', label: 'Faith background', type: 'text' },
    { column: 'nickname', label: 'Nickname (optional)', type: 'text' },
    {
      column: 'preferred_display',
      label: 'Preferred display name (optional)',
      type: 'select',
      // Used to be a free-text field with a helper that described these same
      // three choices in prose — people kept typing the word "Nickname"
      // itself instead of their actual nickname, so their public card ended
      // up literally reading "Nickname" rather than their name. A dropdown
      // of the exact choices, resolved by resolveSeekerDisplayName() below,
      // removes that ambiguity.
      options: ['Nickname', 'First name only', 'Full name'],
      helper: 'Choose what people see when you send a request — your email and birthday are never shown.',
    },
    { column: 'your_story', label: 'Your story (optional)', type: 'textarea' },
    { column: 'country', label: 'Country', type: 'text' },
    { column: 'instagram', label: 'Instagram (optional)', type: 'text', placeholder: '@yourhandle' },
  ],
  assistant: [
    { column: 'faith_tradition_church', label: 'Faith tradition / church', type: 'text' },
    { column: 'story_testimony', label: 'Your story / testimony', type: 'textarea' },
    { column: 'spiritual_gifts', label: 'Spiritual gifts & areas of focus', type: 'checkboxes', options: SPIRITUAL_GIFTS_OPTIONS },
    { column: 'years_experience', label: 'Years of experience', type: 'select', options: EXPERIENCE_OPTIONS },
    { column: 'church_pastoral_reference', label: 'Church or pastoral reference (optional)', type: 'text' },
    { column: 'anything_else', label: 'Anything else? (optional)', type: 'textarea' },
    { column: 'instagram', label: 'Instagram (optional)', type: 'text', placeholder: '@yourhandle' },
  ],
  mother: [
    { column: 'faith_tradition_church', label: 'Faith tradition / church', type: 'text' },
    { column: 'story_testimony', label: 'Your story / testimony', type: 'textarea' },
    { column: 'spiritual_gifts', label: 'Spiritual gifts & areas of focus', type: 'checkboxes', options: SPIRITUAL_GIFTS_OPTIONS },
    { column: 'years_experience', label: 'Years of experience', type: 'select', options: EXPERIENCE_OPTIONS },
    { column: 'capacity', label: 'How many people can you support?', type: 'text', placeholder: 'e.g. 10' },
    { column: 'assistant_preference', label: 'Would you like an assistant to help manage requests?', type: 'select', options: ["Yes, I'd like an assistant", "No, I'll manage it myself", 'Not sure yet'] },
    { column: 'church_pastoral_reference', label: 'Church or pastoral reference (optional)', type: 'text' },
    { column: 'anything_else', label: 'Anything else? (optional)', type: 'textarea' },
    { column: 'instagram', label: 'Instagram (optional)', type: 'text', placeholder: '@yourhandle' },
  ],
  pastor: [
    { column: 'church_parish_name', label: 'Church / parish name', type: 'text' },
    { column: 'denomination', label: 'Denomination', type: 'text' },
    { column: 'church_location', label: 'Church location', type: 'text', placeholder: 'City, State / Country' },
    { column: 'story_testimony', label: 'Your story / testimony', type: 'textarea' },
    { column: 'how_theyd_like_to_help', label: "How you'd like to help", type: 'checkboxes', options: ['Prayer requests', '1:1 mentorship calls', 'Teaching & courses', 'Community events', 'Counseling', 'Other'] },
    { column: 'years_in_ministry', label: 'Years in ministry', type: 'select', options: EXPERIENCE_OPTIONS },
    { column: 'anything_else', label: 'Anything else? (optional)', type: 'textarea' },
    { column: 'instagram', label: 'Instagram (optional)', type: 'text', placeholder: '@yourhandle' },
  ],
  church: [
    { column: 'founded_year', label: 'Year founded (optional)', type: 'number', placeholder: 'e.g. 1998', section: 'Organisation basics' },
    { column: 'congregation_size', label: 'Approximate size of your community', type: 'select', options: CHURCH_SIZE_OPTIONS },
    { column: 'story_testimony', label: 'About / mission', type: 'textarea', placeholder: 'Who you are and who you serve' },
    { column: 'focus_areas', label: 'Ministries and focus areas', type: 'checkboxes', options: CHURCH_FOCUS_OPTIONS },
    { column: 'meeting_format', label: 'How do you meet?', type: 'select', options: CHURCH_MEETING_OPTIONS },
    { column: 'region', label: 'State / region (optional)', type: 'text', section: 'Online presence' },
    { column: 'website', label: 'Website (optional)', type: 'text', placeholder: 'https://' },
    { column: 'instagram', label: 'Instagram (optional)', type: 'text', placeholder: '@yourhandle' },
    { column: 'leader_name', label: 'Lead pastor / leader name', type: 'text', section: 'Trust and verification' },
    { column: 'leader_title', label: 'Leader title', type: 'text', placeholder: 'e.g. Senior Pastor' },
    { column: 'registration_type', label: 'Registration status', type: 'select', options: CHURCH_REGISTRATION_OPTIONS },
    { column: 'registration_number', label: 'Registration / charity number (optional)', type: 'text' },
    { column: 'affiliated_body', label: 'Denominational network or association (optional)', type: 'text' },
    { column: 'anything_else', label: 'Anything else? (optional)', type: 'textarea' },
  ],
  influencer: [
    { column: 'instagram', label: 'Instagram', type: 'text', placeholder: '@yourhandle' },
    { column: 'community_size', label: 'Approximate following / community size', type: 'select', options: ['Under 1,000', '1,000–10,000', '10,000–50,000', '50,000–100,000', '100,000+'] },
    { column: 'anything_else', label: 'Anything else? (optional)', type: 'textarea' },
  ],
};


// ---- Churches & Ministries --------------------------------------------------
// A church's details are split in two so nothing sensitive is ever publicly
// readable: ROLE_PROFILE_FIELDS.church saves to the public-safe `churches`
// table, ROLE_PRIVATE_FIELDS.church saves to the owner-only `church_private`
// table (contact, address and reference details). Same split is mirrored in
// the submit-signup Edge Function (FIELD_MAP / PRIVATE_FIELD_MAP).
export const ROLE_PRIVATE_TABLES = {
  church: 'church_private',
};

export const CHURCH_TYPE_OPTIONS = ['Church', 'Ministry', 'Parachurch / non-profit', 'Fellowship / small group', 'Other'];
export const CHURCH_SIZE_OPTIONS = ['Under 50', '50–150', '150–500', '500–2,000', '2,000+'];
export const CHURCH_FOCUS_OPTIONS = [
  'Prayer', 'Teaching & discipleship', 'Worship', 'Youth & young adults', 'Women', 'Men', 'Marriage & family',
  'Counselling & care', 'Outreach & missions', 'Recovery & healing', 'Online ministry', 'Other',
];
export const CHURCH_MEETING_OPTIONS = ['In person', 'Online', 'Both in person and online'];
export const CHURCH_REGISTRATION_OPTIONS = [
  'Registered charity / non-profit', 'Incorporated church or ministry', 'Part of a denomination or network', 'Not formally registered',
];

// Shared across all credentialed roles — column names match on every table.
export const CREDENTIAL_FIELDS = [
  { column: 'highest_level_of_education', label: 'Highest level of education', type: 'select', options: EDUCATION_OPTIONS },
  { column: 'licenses_certifications', label: 'Licenses & certifications', type: 'tags', placeholder: 'Separate multiple with commas' },
  { column: 'areas_of_specialty', label: 'Areas of specialty', type: 'tags', placeholder: 'Separate multiple with commas' },
];


// Owner-only church fields (saved to `church_private`, never shown publicly).
export const ROLE_PRIVATE_FIELDS = {
  church: [
    { column: 'phone', label: 'Phone (optional)', type: 'text', section: 'Contact details — private' },
    { column: 'street_address', label: 'Street address (optional)', type: 'text' },
    { column: 'postcode', label: 'Postcode / ZIP (optional)', type: 'text' },
    { column: 'reference_name', label: 'Reference — name', type: 'text', section: 'Reference — private', helper: 'Someone outside your organisation who can vouch for it, such as a denominational leader or another pastor. Never shown publicly.' },
    { column: 'reference_relationship', label: 'Reference — relationship to you', type: 'text', placeholder: 'e.g. Regional overseer' },
    { column: 'reference_contact', label: 'Reference — email or phone', type: 'text' },
  ],
};

export function splitTags(value) {
  return (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Resolves a seeker's row + their `preferred_display` choice into the
// actual string to show publicly (on their request card, etc). Falls back
// gracefully for rows saved before preferred_display was a dropdown — if it
// holds something other than one of the three known choices, it's old
// free-typed text, so it's shown as-is rather than discarded.
export function resolveSeekerDisplayName(row) {
  if (!row) return 'You';
  const firstName = row.name?.split(' ')[0];
  switch (row.preferred_display) {
    case 'Nickname':
      return row.nickname || firstName || row.name || 'You';
    case 'First name only':
      return firstName || row.name || 'You';
    case 'Full name':
      return row.name || 'You';
    default:
      return row.preferred_display || row.nickname || firstName || row.name || 'You';
  }
}
