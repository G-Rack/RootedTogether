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

// type: 'text' | 'textarea' | 'select' | 'checkboxes' (checkboxes/array columns save as a text[])
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
    { column: 'preferred_display', label: 'Preferred display name (optional)', type: 'text', helper: 'How should we show your name publicly — a nickname, first name only, or your full name?' },
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
    { column: 'amount_per_seeker', label: 'Desired amount per seeker', type: 'text', placeholder: 'e.g. $20/month' },
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
    { column: 'amount_per_seeker', label: 'Desired amount per seeker', type: 'text', placeholder: 'e.g. $20/month' },
    { column: 'anything_else', label: 'Anything else? (optional)', type: 'textarea' },
    { column: 'instagram', label: 'Instagram (optional)', type: 'text', placeholder: '@yourhandle' },
  ],
  influencer: [
    { column: 'instagram', label: 'Instagram', type: 'text', placeholder: '@yourhandle' },
    { column: 'community_size', label: 'Approximate following / community size', type: 'select', options: ['Under 1,000', '1,000–10,000', '10,000–50,000', '50,000–100,000', '100,000+'] },
    { column: 'anything_else', label: 'Anything else? (optional)', type: 'textarea' },
  ],
};

// Shared across all credentialed roles — column names match on every table.
export const CREDENTIAL_FIELDS = [
  { column: 'highest_level_of_education', label: 'Highest level of education', type: 'select', options: EDUCATION_OPTIONS },
  { column: 'licenses_certifications', label: 'Licenses & certifications', type: 'tags', placeholder: 'Separate multiple with commas' },
  { column: 'areas_of_specialty', label: 'Areas of specialty', type: 'tags', placeholder: 'Separate multiple with commas' },
];

export function splitTags(value) {
  return (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
