import { supabase } from './supabaseClient';

// Creator Pro membership is public information (it powers the Rooted Pro badge and
// priority placement), so anyone can read the creator_pro table. Only the server
// can write to it (the Stripe webhook), which is why it is safe to trust.
export async function fetchProIds() {
  const { data } = await supabase.from('creator_pro').select('auth_user_id');
  return new Set((data || []).map((r) => r.auth_user_id));
}

export const COMMUNITY_CATEGORIES = [
  { value: 'questions', label: 'Questions' },
  { value: 'wins', label: 'Wins' },
  { value: 'files', label: 'Templates and files' },
  { value: 'launches', label: 'Launches' },
  { value: 'feedback', label: 'Feedback requests' },
];

export const CATEGORY_LABELS = Object.fromEntries(COMMUNITY_CATEGORIES.map((c) => [c.value, c.label]));

// Mirrors the pro-community bucket rules (10 MB, these file types).
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,.xlsx,.pptx';
export const ATTACHMENT_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

export function formatBytes(n) {
  if (!n) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function timeAgo(iso) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'Just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 14) return d === 1 ? 'Yesterday' : `${d} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Uploads one file to the private pro-community bucket under the member's own folder and
// returns the metadata row to save in pro_attachments.
export async function uploadCommunityFile(file, userId) {
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error(`"${file.name}" is over 10 MB.`);
  const safe = file.name.replace(/[^a-zA-Z0-9.\-_]+/g, '_').slice(-120);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}`;
  const { error } = await supabase.storage.from('pro-community').upload(path, file, { contentType: file.type || undefined });
  if (error) throw new Error(error.message || 'Upload failed.');
  return { storage_path: path, file_name: file.name.slice(0, 200), mime_type: file.type || null, size_bytes: file.size };
}

export async function communityFileUrl(path) {
  const { data } = await supabase.storage.from('pro-community').createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}
