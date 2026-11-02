import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Starts a course-lesson video upload. The creator dashboard calls this
// (signed in as an approved creator), gets back a one-time Mux upload address,
// and sends the video straight from the browser to Mux. The lesson row is
// created here as 'uploading'; mux-webhook flips it to 'ready' once Mux has
// processed the video.
//
// Secrets needed: MUX_TOKEN_ID, MUX_TOKEN_SECRET.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

const MAX_UPLOADS_PER_HOUR = 60;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return json({ ok: false, error: "Please sign in again." }, 401);
  const userId = userData.user.id;

  const { data: isCreator } = await supabase.rpc("is_valid_creator", { check_auth_id: userId });
  if (!isCreator) return json({ ok: false, error: "Only approved creators can upload course videos." }, 403);

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }
  const title = typeof payload?.title === "string" ? payload.title.trim().slice(0, 200) : "";
  const sortOrder = Number.isInteger(payload?.sortOrder) ? payload.sortOrder : 0;

  const muxId = Deno.env.get("MUX_TOKEN_ID");
  const muxSecret = Deno.env.get("MUX_TOKEN_SECRET");
  if (!muxId || !muxSecret) {
    console.error("MUX_TOKEN_ID / MUX_TOKEN_SECRET are not set.");
    return json({ ok: false, error: "Video uploads aren't set up yet. Please try again later." }, 500);
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("offering_lessons")
    .select("id", { count: "exact", head: true })
    .eq("creator_auth_id", userId)
    .eq("kind", "video")
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_UPLOADS_PER_HOUR) {
    return json({ ok: false, error: "You've uploaded a lot of videos in the last hour. Please try again later." }, 429);
  }

  const lessonId = crypto.randomUUID();

  let upload: { id: string; url: string };
  try {
    const res = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${muxId}:${muxSecret}`),
      },
      body: JSON.stringify({
        cors_origin: "*",
        new_asset_settings: {
          playback_policy: ["public"],
          video_quality: "basic",
          // "lesson:" tells mux-webhook this is a course lesson, not a reel.
          passthrough: `lesson:${lessonId}`,
        },
      }),
    });
    const body = await res.json();
    if (!res.ok || !body?.data?.id || !body?.data?.url) {
      console.error("Mux upload creation failed:", res.status, JSON.stringify(body));
      return json({ ok: false, error: "Couldn't start the upload. Please try again." }, 502);
    }
    upload = { id: body.data.id, url: body.data.url };
  } catch (e) {
    console.error("Mux request error:", e);
    return json({ ok: false, error: "Couldn't start the upload. Please try again." }, 502);
  }

  const { error: insertError } = await supabase.from("offering_lessons").insert({
    id: lessonId,
    creator_auth_id: userId,
    kind: "video",
    title,
    sort_order: sortOrder,
    mux_upload_id: upload.id,
    status: "uploading",
  });
  if (insertError) {
    console.error("Couldn't save lesson:", insertError);
    return json({ ok: false, error: "Something went wrong. Please try again." }, 500);
  }

  return json({ ok: true, lessonId, uploadUrl: upload.url });
});
