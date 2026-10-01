import { supabase } from './supabaseClient';
import { SUPABASE_URL } from './config';

// Both buckets are public (see the create_marketplace_schema migration),
// so a plain public URL works for anyone — no signed URL, no auth needed.
//
// These build the URL directly from SUPABASE_URL instead of going through
// the browser `supabase` client's storage.getPublicUrl() (which just does
// this same string-building internally anyway). That matters because the
// storefront and offering pages now call these from generateMetadata,
// which runs on the SERVER — and lib/supabaseClient.js is a 'use client'
// module configured with persistSession/autoRefreshToken, which touch
// browser-only APIs (localStorage) that don't exist in that environment.
// Importing the client there was crashing those pages in production
// ("A server error occurred") even though local `next build` looked clean,
// since generateMetadata for dynamic routes only actually runs at request
// time, not at build time.
function publicStorageUrl(bucket, path) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export function bannerUrl(path) {
  return publicStorageUrl('storefront-banners', path);
}

export function coverUrl(path) {
  return publicStorageUrl('offering-covers', path);
}

export async function uploadBanner(file, userId) {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/banner.${ext}`;
  const { error } = await supabase.storage.from('storefront-banners').upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

// A creator's website profile picture — separate from the photo they may
// have submitted during app onboarding, so this doesn't touch that private
// bucket or require re-plumbing the app's approval flow.
export function avatarUrl(path) {
  return publicStorageUrl('creator-avatars', path);
}

export async function uploadAvatar(file, userId) {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage.from('creator-avatars').upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export async function uploadCover(file, userId) {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('offering-covers').upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

// The actual thing a buyer receives (PDF, etc). We store the public URL
// straight into offering_content.content_url — the same column that used to
// hold a pasted external link — so no schema change was needed to move from
// "paste a link" to "drag a file here".
export function contentFileUrl(path) {
  return publicStorageUrl('offering-content', path);
}

export async function uploadContentFile(file, userId) {
  const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]+/g, '_')}`;
  const { error } = await supabase.storage.from('offering-content').upload(path, file, { upsert: true });
  if (error) throw error;
  return { path, url: contentFileUrl(path), name: file.name };
}
