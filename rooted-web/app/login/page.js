'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { SUBMIT_ENDPOINT, SUPABASE_ANON_KEY } from '@/lib/config';
import { ROLE_LABELS } from '@/lib/roles';
import PasswordField from '@/components/PasswordField';

// The signup flow's role keys match what the submit-signup Edge Function
// expects in `TABLES` / `FIELD_MAP` there. Note "priest" here, not
// "pastor" — the rest of the app (profiles.role, ROLE_LABELS) spells the
// Priest/Pastor role "pastor", but the Edge Function's flow key has always
// been "priest" (inherited from the original Airtable field naming), so
// this is the one place that translation has to happen.
const ROLE_OPTIONS = [
  { key: 'seeker', label: ROLE_LABELS.seeker, blurb: 'Request prayer, meditation, and guidance from Spiritual Mothers, Pastors, and Leaders.' },
  { key: 'assistant', label: ROLE_LABELS.assistant, blurb: 'Support a Spiritual Mother or Pastor in caring for the people they serve.' },
  { key: 'mother', label: ROLE_LABELS.mother, blurb: 'Offer prayer, mentorship, and guidance to seekers who need you.' },
  { key: 'priest', label: ROLE_LABELS.pastor, blurb: 'Offer prayer, mentorship, and guidance to seekers who need you.' },
  { key: 'influencer', label: ROLE_LABELS.influencer, blurb: 'Share your voice and ministry with a wider community. Reviewed before going live.' },
];

const EXPERIENCE_OPTIONS = ['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years'];
const SPIRITUAL_GIFTS_OPTIONS = [
  'Prayer & intercession', 'Teaching', 'Counseling', 'Worship', 'Healing', 'Discernment', 'Hospitality', 'Administration', 'Other',
];
const EDUCATION_OPTIONS = [
  'High school', 'Associate degree', "Bachelor's degree", "Master's degree", 'Doctorate / PhD', 'Seminary / ministry training', 'Other',
];

// Per-role field config. Each `key` is the exact human-readable field name
// the submit-signup Edge Function's FIELD_MAP expects for that role — keep
// these in sync with that function if its FIELD_MAP ever changes. Name,
// Email, and Date of Birth are handled as common fields outside this list.
const ROLE_FIELD_CONFIGS = {
  seeker: [
    { key: 'Religion', label: 'Religion', type: 'text', required: true },
    { key: 'Signing Up For', label: 'Who is this for?', type: 'select', options: ['Myself', 'My child'] },
    { key: 'Child Age', label: "Child's age", type: 'text', showIf: (v) => v['Signing Up For'] === 'My child' },
    {
      key: 'What Kind of Support Are You Looking For',
      label: 'What kind of support are you looking for?',
      type: 'checkboxes',
      options: ['Prayer', 'Meditation & mindfulness', '1:1 mentorship', 'Community & connection', 'Grief & loss support', 'Family & relationships', 'Addiction recovery', 'Other'],
    },
    { key: 'Faith Background', label: 'Faith background', type: 'text' },
    { key: 'Nickname', label: 'Nickname (optional)', type: 'text' },
    { key: 'Preferred Display', label: 'Preferred display name (optional)', type: 'text', helper: 'How should we show your name publicly — a nickname, first name only, or your full name?' },
    { key: 'Your Story', label: 'Your story (optional)', type: 'textarea' },
    { key: 'Country', label: 'Country', type: 'text' },
    { key: 'Instagram', label: 'Instagram (optional)', type: 'text', placeholder: '@yourhandle' },
  ],
  assistant: [
    { key: 'Faith Tradition / Church', label: 'Faith tradition / church', type: 'text' },
    { key: 'Your Story / Testimony', label: 'Your story / testimony', type: 'textarea' },
    { key: 'Spiritual Gifts & Areas of Focus', label: 'Spiritual gifts & areas of focus', type: 'checkboxes', options: SPIRITUAL_GIFTS_OPTIONS },
    { key: 'Years of Experience', label: 'Years of experience', type: 'select', options: EXPERIENCE_OPTIONS },
    { key: 'Church or Pastoral Reference', label: 'Church or pastoral reference (optional)', type: 'text' },
    { key: 'Anything Else', label: 'Anything else? (optional)', type: 'textarea' },
    { key: 'Instagram', label: 'Instagram (optional)', type: 'text', placeholder: '@yourhandle' },
  ],
  mother: [
    { key: 'Faith Tradition / Church', label: 'Faith tradition / church', type: 'text' },
    { key: 'Your Story / Testimony', label: 'Your story / testimony', type: 'textarea' },
    { key: 'Spiritual Gifts & Areas of Focus', label: 'Spiritual gifts & areas of focus', type: 'checkboxes', options: SPIRITUAL_GIFTS_OPTIONS },
    { key: 'Years of Experience', label: 'Years of experience', type: 'select', options: EXPERIENCE_OPTIONS },
    { key: 'Capacity (How Many People)', label: 'How many people can you support?', type: 'text', placeholder: 'e.g. 10' },
    { key: 'Assistant Preference', label: 'Would you like an assistant to help manage requests?', type: 'select', options: ["Yes, I'd like an assistant", "No, I'll manage it myself", 'Not sure yet'] },
    { key: 'Desired Amount Per Seeker', label: 'Desired amount per seeker', type: 'text', placeholder: 'e.g. $20/month' },
    { key: 'Church or Pastoral Reference', label: 'Church or pastoral reference (optional)', type: 'text' },
    { key: 'Anything Else', label: 'Anything else? (optional)', type: 'textarea' },
    { key: 'Instagram', label: 'Instagram (optional)', type: 'text', placeholder: '@yourhandle' },
  ],
  priest: [
    { key: 'Church / Parish Name', label: 'Church / parish name', type: 'text' },
    { key: 'Denomination', label: 'Denomination', type: 'text' },
    { key: 'Church Location', label: 'Church location', type: 'text', placeholder: 'City, State / Country' },
    { key: 'Your Story / Testimony', label: 'Your story / testimony', type: 'textarea' },
    { key: "How They'd Like to Help", label: "How you'd like to help", type: 'checkboxes', options: ['Prayer requests', '1:1 mentorship calls', 'Teaching & courses', 'Community events', 'Counseling', 'Other'] },
    { key: 'Years in Ministry', label: 'Years in ministry', type: 'select', options: EXPERIENCE_OPTIONS },
    { key: 'Desired Amount Per Seeker', label: 'Desired amount per seeker', type: 'text', placeholder: 'e.g. $20/month' },
    { key: 'Anything Else', label: 'Anything else? (optional)', type: 'textarea' },
    { key: 'Instagram', label: 'Instagram (optional)', type: 'text', placeholder: '@yourhandle' },
  ],
  influencer: [
    { key: 'Instagram', label: 'Instagram', type: 'text', placeholder: '@yourhandle' },
    { key: 'Approximate Following / Community Size', label: 'Approximate following / community size', type: 'select', options: ['Under 1,000', '1,000–10,000', '10,000–50,000', '50,000–100,000', '100,000+'] },
    { key: 'Anything Else', label: 'Anything else? (optional)', type: 'textarea' },
  ],
};

// Mother, Pastor, and Leader can optionally document credentials — this
// mirrors the app's "Has Relevant Credentials" step, which only sends
// Highest Level of Education / Licenses & Certifications / Areas of
// Specialty (plus the certification file) through when the answer is
// "Yes, I do" (see submit-signup's FIELD_MAP and v9 changelog note).
const CREDENTIALED_ROLES = new Set(['mother', 'priest', 'influencer']);

function splitTags(value) {
  return (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1] || '';
      resolve({ base64, filename: file.name, contentType: file.type || 'application/octet-stream' });
    };
    reader.readAsDataURL(file);
  });
}

function Field({ field, value, onChange }) {
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

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'signup' ? 'signup' : 'login');

  return (
    <div className="login-shell" style={{ width: '100%', minHeight: 'calc(100vh - 76px)' }}>
      {/* Brand panel */}
      <div
        className="login-brand"
        style={{
          background: 'linear-gradient(160deg, var(--brown) 0%, var(--brown-light) 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 72px',
          color: 'var(--white)',
        }}
      >
        <div className="serif" style={{ fontSize: 26, fontWeight: 700, marginBottom: 18 }}>Rooted Together</div>
        <div className="serif" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.3, maxWidth: 420 }}>
          One account for the app and the marketplace.
        </div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, maxWidth: 400, marginTop: 16 }}>
          Sign in with the same details you use on the Rooted Together app — whether you&rsquo;re a Seeker, a
          Spiritual Assistant, Mother, Pastor, or Leader.
        </div>
      </div>

      {/* Form panel */}
      <div
        className="login-form-panel"
        style={{
          background: 'var(--white)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 64px',
        }}
      >
        <div style={{ display: 'flex', gap: 24, marginBottom: 28, borderBottom: '1px solid rgba(107,66,38,0.1)' }}>
          <button
            onClick={() => setTab('login')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 15,
              fontWeight: tab === 'login' ? 700 : 600,
              color: tab === 'login' ? 'var(--brown)' : 'var(--text-soft)',
              paddingBottom: 14,
              borderBottom: tab === 'login' ? '2px solid var(--brown)' : 'none',
            }}
          >
            Log In
          </button>
          <button
            onClick={() => setTab('signup')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 15,
              fontWeight: tab === 'signup' ? 700 : 600,
              color: tab === 'signup' ? 'var(--brown)' : 'var(--text-soft)',
              paddingBottom: 14,
              borderBottom: tab === 'signup' ? '2px solid var(--brown)' : 'none',
            }}
          >
            Sign Up
          </button>
        </div>

        {tab === 'login' ? <LoginForm router={router} /> : <SignupForm router={router} />}
      </div>
    </div>
  );
}

function LoginForm({ router }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [forgotSent, setForgotSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setBusy(false);
      setError(signInError.message === 'Invalid login credentials'
        ? "That email and password don't match — check them and try again."
        : signInError.message);
      return;
    }

    // Check directly (rather than waiting on session-provider state, which
    // updates async) so creators land straight on their dashboard instead
    // of the public homepage.
    const { data: isCreator } = await supabase.rpc('is_valid_creator', { check_auth_id: data.user.id });
    setBusy(false);
    router.push(isCreator ? '/dashboard' : '/');
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (resetError) {
      setError("Couldn't send that email — please try again.");
      return;
    }
    setForgotSent(true);
  };

  if (mode === 'forgot') {
    return (
      <form onSubmit={submitForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div className="error-banner">{error}</div>}
        {forgotSent ? (
          <div className="success-banner">
            If an account exists for {email}, a reset link is on its way — check your inbox.
          </div>
        ) : (
          <>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
              Enter your account email and we&rsquo;ll send you a link to reset your password.
            </div>
            <div>
              <label className="field-label">Email</label>
              <input
                className="input-field"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
              />
            </div>
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ marginTop: 4 }}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setForgotSent(false);
            setError('');
          }}
          style={{ background: 'none', border: 'none', fontSize: 12.5, fontWeight: 600, color: 'var(--text-soft)', alignSelf: 'center' }}
        >
          ← Back to log in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div className="error-banner">{error}</div>}
      <div>
        <label className="field-label">Email</label>
        <input
          className="input-field"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
      </div>
      <div>
        <label className="field-label">Password</label>
        <PasswordField
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>
      <button
        type="button"
        onClick={() => setMode('forgot')}
        style={{ background: 'none', border: 'none', fontSize: 12.5, fontWeight: 600, color: 'var(--brown)', alignSelf: 'flex-end', padding: 0 }}
      >
        Forgot password?
      </button>
      <button type="submit" disabled={busy} className="btn btn-primary" style={{ marginTop: 4 }}>
        {busy ? 'Logging in…' : 'Log In'}
      </button>
    </form>
  );
}

function RolePicker({ onPick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
        How will you use Rooted Together? This matches the same sign-up flow as the app.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ROLE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onPick(opt.key)}
            style={{
              textAlign: 'left',
              background: 'var(--cream)',
              border: '1px solid rgba(107,66,38,0.14)',
              borderRadius: 14,
              padding: '16px 18px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--brown)' }}>{opt.label}</span>
            <span className="muted" style={{ fontSize: 12 }}>{opt.blurb}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SignupForm({ router }) {
  const searchParams = useSearchParams();
  const [role, setRole] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [hasCredentials, setHasCredentials] = useState('');
  const [credentialValues, setCredentialValues] = useState({});
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [certificationFile, setCertificationFile] = useState(null);
  // Prefilled from a referral link (?ref=RT-00042) when present, but always
  // left editable — this is also how someone invited in person or by a
  // printed/QR code types a code in by hand instead of following a link.
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pickRole = (key) => {
    setRole(key);
    setFieldValues({});
    setHasCredentials('');
    setCredentialValues({});
    setProfilePictureFile(null);
    setCertificationFile(null);
    setError('');
  };

  if (!role) {
    return <RolePicker onPick={pickRole} />;
  }

  const config = ROLE_FIELD_CONFIGS[role] || [];
  const roleMeta = ROLE_OPTIONS.find((o) => o.key === role);
  const setFieldValue = (key, value) => setFieldValues((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    const fields = { Name: name, Email: email, 'Date of Birth': dob };
    for (const f of config) {
      if (f.showIf && !f.showIf(fieldValues)) continue;
      const val = fieldValues[f.key];
      if (f.type === 'checkboxes') {
        if (Array.isArray(val) && val.length) fields[f.key] = val;
      } else if (val !== undefined && val !== '') {
        fields[f.key] = val;
      }
    }

    if (CREDENTIALED_ROLES.has(role) && hasCredentials) {
      fields['Has Relevant Credentials'] = hasCredentials;
      if (hasCredentials === 'Yes, I do') {
        if (credentialValues['Highest Level of Education']) {
          fields['Highest Level of Education'] = credentialValues['Highest Level of Education'];
        }
        const licenses = splitTags(credentialValues['Licenses & Certifications']);
        if (licenses.length) fields['Licenses & Certifications'] = licenses;
        const specialties = splitTags(credentialValues['Areas of Specialty']);
        if (specialties.length) fields['Areas of Specialty'] = specialties;
      }
    }

    let profilePicture;
    let certificationPayload;
    try {
      if (profilePictureFile) profilePicture = await fileToPayload(profilePictureFile);
      if (CREDENTIALED_ROLES.has(role) && hasCredentials === 'Yes, I do' && certificationFile) {
        certificationPayload = await fileToPayload(certificationFile);
      }
    } catch {
      setBusy(false);
      setError("Couldn't read one of your files — please try choosing it again.");
      return;
    }

    try {
      const res = await fetch(SUBMIT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          role,
          fields,
          profilePicture,
          certificationFile: certificationPayload,
          password,
          referredByCode: referralCode.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Couldn't create your account right now.");
        setBusy(false);
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (signInError) {
        setError('Account created — please log in.');
        return;
      }
      router.push(role === 'seeker' ? '/' : '/dashboard');
    } catch {
      setBusy(false);
      setError("Couldn't reach the server — please try again.");
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button
        type="button"
        onClick={() => pickRole(null)}
        style={{ background: 'none', border: 'none', fontSize: 12.5, fontWeight: 600, color: 'var(--text-soft)', alignSelf: 'flex-start', padding: 0 }}
      >
        ← Choose a different role
      </button>

      {error && <div className="error-banner">{error}</div>}

      <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
        Signing up as <strong style={{ color: 'var(--brown)' }}>{roleMeta?.label}</strong>.
        {role === 'influencer' && ' Spiritual Leader profiles are reviewed before they appear publicly.'}
      </div>

      <div>
        <label className="field-label">Name</label>
        <input className="input-field" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="field-label">Email</label>
        <input className="input-field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="field-label">Date of birth</label>
        <input className="input-field" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} />
      </div>

      {config.map((f) => {
        if (f.showIf && !f.showIf(fieldValues)) return null;
        return (
          <Field key={f.key} field={f} value={fieldValues[f.key]} onChange={(v) => setFieldValue(f.key, v)} />
        );
      })}

      {CREDENTIALED_ROLES.has(role) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--cream)', borderRadius: 14, padding: 16 }}>
          <div>
            <label className="field-label">Do you have relevant credentials?</label>
            <select className="input-field" value={hasCredentials} onChange={(e) => setHasCredentials(e.target.value)}>
              <option value="">Select…</option>
              <option value="Yes, I do">Yes, I do</option>
              <option value="No, I don't">No, I don&rsquo;t</option>
            </select>
          </div>
          {hasCredentials === 'Yes, I do' && (
            <>
              <div>
                <label className="field-label">Highest level of education</label>
                <select
                  className="input-field"
                  value={credentialValues['Highest Level of Education'] || ''}
                  onChange={(e) => setCredentialValues((prev) => ({ ...prev, 'Highest Level of Education': e.target.value }))}
                >
                  <option value="">Select…</option>
                  {EDUCATION_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Licenses &amp; certifications</label>
                <input
                  className="input-field"
                  placeholder="Separate multiple with commas"
                  value={credentialValues['Licenses & Certifications'] || ''}
                  onChange={(e) => setCredentialValues((prev) => ({ ...prev, 'Licenses & Certifications': e.target.value }))}
                />
              </div>
              <div>
                <label className="field-label">Areas of specialty</label>
                <input
                  className="input-field"
                  placeholder="Separate multiple with commas"
                  value={credentialValues['Areas of Specialty'] || ''}
                  onChange={(e) => setCredentialValues((prev) => ({ ...prev, 'Areas of Specialty': e.target.value }))}
                />
              </div>
              <div>
                <label className="field-label">Certification document (optional)</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setCertificationFile(e.target.files?.[0] || null)}
                />
                <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
                  Kept private — used only for internal review, never shown publicly.
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div>
        <label className="field-label">Profile picture (optional)</label>
        <input type="file" accept="image/*" onChange={(e) => setProfilePictureFile(e.target.files?.[0] || null)} />
      </div>

      <div>
        <label className="field-label">Password</label>
        <PasswordField
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="field-label">Referral code (optional)</label>
        <input
          className="input-field"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
          placeholder="RT-00042"
        />
        <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
          Were you invited by someone on Rooted Together? Enter their code and they&rsquo;ll be credited.
        </div>
      </div>
      <button type="submit" disabled={busy} className="btn btn-primary" style={{ marginTop: 4 }}>
        {busy ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
