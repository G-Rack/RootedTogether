import { supabase } from './supabaseClient';
import { FUNCTIONS_URL } from './config';

// Course lessons: each lesson is either a video (hosted on Mux) or a PDF
// (private "course-files" bucket). Videos go straight from the browser to Mux
// using a one-time address from the lesson-create-upload Edge Function; Mux
// then tells our mux-webhook, which marks the lesson ready.

export const MAX_LESSONS = 40;
export const MAX_PDF_BYTES = 50 * 1024 * 1024; // matches the bucket limit

export async function fetchLessons(offeringId) {
  const { data, error } = await supabase
    .from('offering_lessons')
    .select('*')
    .eq('offering_id', offeringId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// { [lessonId]: status } for the lessons still being processed.
export async function fetchLessonStatuses(ids) {
  if (!ids.length) return {};
  const { data } = await supabase
    .from('offering_lessons')
    .select('id, status, mux_playback_id, duration_seconds')
    .in('id', ids);
  const map = {};
  (data || []).forEach((row) => { map[row.id] = row; });
  return map;
}

async function callFunction(name, session, body) {
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON error page */ }
  if (!res.ok || !json || json.ok === false) {
    throw new Error((json && json.error) || 'Something went wrong. Please try again.');
  }
  return json;
}

// Step 1 for a video: get a one-time Mux upload address + the new lesson id.
export function startVideoUpload(session, { title, sortOrder }) {
  return callFunction('lesson-create-upload', session, { title, sortOrder });
}

// Step 2: send the file to Mux. onProgress gets 0..1. `register` receives a
// { cancel } handle. Resolves when Mux has the whole file.
export function putToMux(uploadUrl, file, onProgress, register) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error('The upload didn’t finish. Please try again.'));
    };
    xhr.onerror = () => reject(new Error('The upload was interrupted. Check your connection and try again.'));
    xhr.onabort = () => reject(new Error('cancelled'));
    if (register) register({ cancel: () => xhr.abort() });
    xhr.send(file);
  });
}

// A PDF lesson: upload to the private bucket, then record the lesson row.
export async function uploadLessonPdf(session, file, { title, sortOrder }) {
  const uid = session.user.id;
  const safe = file.name.replace(/[^a-zA-Z0-9.-]+/g, '_');
  const path = `${uid}/${crypto.randomUUID()}-${safe}`;
  const { error: uploadError } = await supabase.storage
    .from('course-files')
    .upload(path, file, { contentType: 'application/pdf', upsert: false });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase
    .from('offering_lessons')
    .insert({
      creator_auth_id: uid,
      kind: 'pdf',
      status: 'ready',
      title: (title || '').trim().slice(0, 200),
      sort_order: sortOrder,
      file_path: path,
      file_name: file.name,
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from('course-files').remove([path]);
    throw error;
  }
  return data;
}

// Removes a lesson and its video / file (done server-side so the Mux video is deleted too).
export function deleteLesson(session, lessonId) {
  return callFunction('lesson-delete', session, { lessonId });
}

// Short-lived link to open a PDF lesson (buyers and the creator only).
export async function pdfSignedUrl(path) {
  const { data, error } = await supabase.storage.from('course-files').createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) throw error || new Error('No link');
  return data.signedUrl;
}

export function muxPlayerUrl(playbackId) {
  return `https://player.mux.com/${playbackId}?accent-color=%236B4226`;
}

export function formatDuration(seconds) {
  const total = Math.round(Number(seconds) || 0);
  if (!total) return '';
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
